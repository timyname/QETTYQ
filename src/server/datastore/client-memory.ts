import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { atomic } from "./sqlite";

export type MemoryScope = "profile" | "dialogue" | "ai_transfer" | "visits";
const scopes: MemoryScope[] = ["profile", "dialogue", "ai_transfer", "visits"];
const DAY = 86_400_000;
const profileSchema = z.object({
  likedTags: z.array(z.string().trim().min(1).max(48)).max(40), locale: z.enum(["ru", "kk", "en"]),
  goal: z.enum(["food", "walk", "activity", "new"]).optional(), minutes: z.number().int().min(20).max(720).optional(),
  budget: z.number().int().min(0).max(1_000_000).nullable().optional(),
}).strict();
export type StoredPreferences = z.infer<typeof profileSchema>;
type Message = { id: string; role: "user" | "assistant"; text: string; mode: "openai" | "deterministic" | "user" };
const messageSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/u), role: z.enum(["user", "assistant"]), text: z.string().trim().min(1), mode: z.enum(["openai", "deterministic", "user"]) }).strict();
function clientHash(token: string) {
  // Server-verified opaque cookie/session ID only. No user-supplied email or GPS identifier.
  if (!/^[a-zA-Z0-9_-]{32,256}$/u.test(token)) throw new Error("INVALID_MEMORY_CLIENT");
  return createHash("sha256").update(`qettyq-memory-v1:${token}`).digest("hex");
}
const redactCoordinates = (text: string) => text.replace(/-?\d{1,3}\.\d{3,}/gu, "[координата скрыта]");

/** Not connected to guest API automatically. Caller MUST authenticate the opaque token.
 * Every storage/AI-transfer operation requires its own unexpired explicit consent.
 * SQLite itself is not encrypted; VPS volume/access/backup policies remain deployment work.
 */
export function createClientMemory(db: DatabaseSync, clock: () => number = Date.now) {
  function now() { const value = clock(); if (!Number.isSafeInteger(value) || value < 0 || value > 8_000_000_000_000) throw new Error("INVALID_CLOCK"); return value; }
  function hasConsent(token: string, scope: MemoryScope) {
    const time = now();
    return Boolean(db.prepare(`SELECT 1 FROM memory_consents c JOIN memory_clients m ON m.id_hash=c.client_hash
      WHERE c.client_hash=? AND c.scope=? AND c.expires_at_ms>? AND m.expires_at_ms>?`).get(clientHash(token), scope, time, time));
  }
  function requireConsent(token: string, scope: MemoryScope) { if (!hasConsent(token, scope)) throw new Error(`MEMORY_CONSENT_REQUIRED:${scope}`); return clientHash(token); }
  function consentExpiry(id: string, scope: MemoryScope) { return Number(db.prepare("SELECT expires_at_ms FROM memory_consents WHERE client_hash=? AND scope=?").get(id, scope)!.expires_at_ms); }
  function grantConsent(token: string, scope: MemoryScope, retention: "session_24h" | "persistent_30d") {
    if (!scopes.includes(scope) || !["session_24h", "persistent_30d"].includes(retention)) throw new Error("INVALID_MEMORY_CONSENT");
    const id = clientHash(token), time = now(), expiry = time + (retention === "persistent_30d" ? 30 : 1) * DAY;
    atomic(db, () => {
      // Expired clients and dependent rows are deleted before a new opt-in starts.
      db.prepare("DELETE FROM memory_clients WHERE id_hash=? AND expires_at_ms<=?").run(id, time);
      const oldConsent = db.prepare("SELECT expires_at_ms FROM memory_consents WHERE client_hash=? AND scope=?").get(id, scope);
      if (!oldConsent || Number(oldConsent.expires_at_ms) <= time) {
        const table = scope === "profile" ? "memory_profiles" : scope === "dialogue" ? "memory_messages" : scope === "visits" ? "memory_visits" : null;
        if (table) db.prepare(`DELETE FROM ${table} WHERE client_hash=?`).run(id);
      }
      db.prepare("INSERT INTO memory_clients VALUES(?,?,?) ON CONFLICT(id_hash) DO UPDATE SET expires_at_ms=MAX(expires_at_ms,excluded.expires_at_ms)").run(id, time, expiry);
      db.prepare("INSERT OR REPLACE INTO memory_consents VALUES(?,?,?,?)").run(id, scope, time, expiry);
    });
    return { scope, expiresAt: new Date(expiry).toISOString(), retention };
  }
  function saveProfile(token: string, preferences: StoredPreferences) {
    const id = requireConsent(token, "profile"), data = profileSchema.parse(preferences);
    db.prepare("INSERT OR REPLACE INTO memory_profiles VALUES(?,?,?,?)").run(id, JSON.stringify(data), now(), consentExpiry(id, "profile"));
  }
  function readProfile(token: string): StoredPreferences | null {
    if (!hasConsent(token, "profile")) return null;
    const row = db.prepare("SELECT preferences_json FROM memory_profiles WHERE client_hash=? AND expires_at_ms>?").get(clientHash(token), now());
    return row ? profileSchema.parse(JSON.parse(String(row.preferences_json))) : null;
  }
  function appendMessage(token: string, message: Message) {
    const id = requireConsent(token, "dialogue"), parsed = messageSchema.parse(message), text = redactCoordinates(parsed.text);
    if (Buffer.byteLength(text, "utf8") > 4000 || parsed.role === "user" && parsed.mode !== "user" || parsed.role === "assistant" && parsed.mode === "user") throw new Error("INVALID_MEMORY_MESSAGE");
    atomic(db, () => {
      db.prepare("DELETE FROM memory_messages WHERE client_hash=? AND expires_at_ms<=?").run(id, now());
      const existing = db.prepare("SELECT role,text,mode FROM memory_messages WHERE client_hash=? AND id=?").get(id, parsed.id);
      if (existing && (existing.role !== parsed.role || existing.text !== text || existing.mode !== parsed.mode)) throw new Error("MESSAGE_ID_CONFLICT");
      db.prepare("INSERT OR IGNORE INTO memory_messages VALUES(?,?,?,?,?,?,?)").run(id, parsed.id, parsed.role, text, parsed.mode, now(), consentExpiry(id, "dialogue"));
      db.prepare(`DELETE FROM memory_messages WHERE client_hash=? AND id NOT IN
        (SELECT id FROM memory_messages WHERE client_hash=? ORDER BY created_at_ms DESC,rowid DESC LIMIT 24)`).run(id, id);
    });
  }
  function messages(token: string): (Message & { createdAtMs: number })[] {
    if (!hasConsent(token, "dialogue")) return [];
    return db.prepare("SELECT * FROM memory_messages WHERE client_hash=? AND expires_at_ms>? ORDER BY created_at_ms,rowid").all(clientHash(token), now())
      .map(row => ({ id: String(row.id), role: row.role as Message["role"], text: String(row.text), mode: row.mode as Message["mode"], createdAtMs: Number(row.created_at_ms) }));
  }
  function revokeConsent(token: string, scope: MemoryScope) {
    if (!scopes.includes(scope)) throw new Error("INVALID_MEMORY_CONSENT");
    const id = clientHash(token);
    atomic(db, () => {
      db.prepare("DELETE FROM memory_consents WHERE client_hash=? AND scope=?").run(id, scope);
      const table = scope === "profile" ? "memory_profiles" : scope === "dialogue" ? "memory_messages" : scope === "visits" ? "memory_visits" : null;
      if (table) db.prepare(`DELETE FROM ${table} WHERE client_hash=?`).run(id);
    });
  }
  function markVisited(token: string, input: { entityKind: "venue" | "event"; entityId: string; visitedAtMs: number }) {
    const id = requireConsent(token, "visits"), time = now();
    if (!["venue", "event"].includes(input.entityKind) || !Number.isSafeInteger(input.visitedAtMs) || input.visitedAtMs > time || input.visitedAtMs < 0) throw new Error("INVALID_VISIT");
    const table = input.entityKind === "venue" ? "venues" : "events";
    if (!db.prepare(`SELECT 1 FROM ${table} WHERE id=?`).get(input.entityId)) throw new Error("VISIT_ENTITY_NOT_FOUND");
    atomic(db, () => {
      db.prepare("DELETE FROM memory_visits WHERE client_hash=? AND expires_at_ms<=?").run(id, time);
      db.prepare("INSERT OR IGNORE INTO memory_visits VALUES(?,?,?,?,?,?)").run(id, input.entityKind, input.entityId, input.visitedAtMs, "user_confirmed", consentExpiry(id, "visits"));
      db.prepare(`DELETE FROM memory_visits WHERE client_hash=? AND rowid NOT IN
        (SELECT rowid FROM memory_visits WHERE client_hash=? ORDER BY visited_at_ms DESC,rowid DESC LIMIT 100)`).run(id, id);
    });
  }
  function visits(token: string) {
    if (!hasConsent(token, "visits")) return [];
    return db.prepare("SELECT entity_kind,entity_id,visited_at_ms,confirmation FROM memory_visits WHERE client_hash=? AND expires_at_ms>? ORDER BY visited_at_ms DESC LIMIT 100").all(clientHash(token), now());
  }
  function deleteClient(token: string) { db.prepare("DELETE FROM memory_clients WHERE id_hash=?").run(clientHash(token)); }
  function aiContext(token: string) {
    requireConsent(token, "ai_transfer");
    return { preferences: readProfile(token), history: messages(token).slice(-6), visits: visits(token) };
  }
  function purgeExpired() {
    return atomic(db, () => {
      const time = now();
      db.prepare("DELETE FROM memory_profiles WHERE expires_at_ms<=?").run(time);
      db.prepare("DELETE FROM memory_messages WHERE expires_at_ms<=?").run(time);
      db.prepare("DELETE FROM memory_visits WHERE expires_at_ms<=?").run(time);
      db.prepare("DELETE FROM memory_profiles WHERE client_hash IN(SELECT client_hash FROM memory_consents WHERE scope='profile' AND expires_at_ms<=?)").run(time);
      db.prepare("DELETE FROM memory_messages WHERE client_hash IN(SELECT client_hash FROM memory_consents WHERE scope='dialogue' AND expires_at_ms<=?)").run(time);
      db.prepare("DELETE FROM memory_visits WHERE client_hash IN(SELECT client_hash FROM memory_consents WHERE scope='visits' AND expires_at_ms<=?)").run(time);
      db.prepare("DELETE FROM memory_consents WHERE expires_at_ms<=?").run(time);
      return Number(db.prepare("DELETE FROM memory_clients WHERE expires_at_ms<=?").run(time).changes);
    });
  }
  return { grantConsent, hasConsent, saveProfile, readProfile, appendMessage, messages, revokeConsent, markVisited, visits, deleteClient, purgeExpired, aiContext };
}
