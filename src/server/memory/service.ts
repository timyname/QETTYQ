import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { createClientMemory } from "../datastore/client-memory";
import { normalizePersistedDialogueHistory } from "../assistant/anchored-history";
import { blockCrossSiteMutation, jsonResponse, readJson, requireSession } from "../session/http";
import type { MemoryOperation, MemoryService, MemoryState } from "./contracts";

const scopes = ["profile", "dialogue", "ai_transfer", "visits"] as const;
const scopeSchema = z.enum(scopes);
const grantSchema = z.object({ scope: scopeSchema, retention: z.enum(["session_24h", "persistent_30d"]) }).strict();
const revokeSchema = z.object({ scope: scopeSchema }).strict();
const profileSchema = z.object({ likedTags: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,47}$/u)).max(40), locale: z.enum(["ru", "kk", "en"]),
  goal: z.enum(["food", "walk", "activity", "new"]).optional(), minutes: z.number().int().min(20).max(720).optional(), budget: z.number().int().min(0).max(1_000_000).nullable().optional() }).strict();
const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/u);
const messageSchema = z.object({ id: idSchema, role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(4000), mode: z.enum(["user", "openai", "deterministic"]) }).strict();
const visitSchema = z.object({ entityKind: z.enum(["venue", "event"]), entityId: z.string().min(1).max(256), visitedAtMs: z.number().int().nonnegative() }).strict();
const exchangeSchema = z.object({ userMessageId: idSchema, userText: z.string().trim().min(1), assistantMessageId: idSchema, assistantText: z.string().trim().min(1), mode: z.enum(["openai", "deterministic"]) }).strict();
const methodFor: Record<MemoryOperation, string> = { state: "GET", delete: "DELETE", grant: "POST", revoke: "DELETE", profile: "PATCH", message: "POST", visit: "POST" };
const error = (code: string, status: number) => jsonResponse({ available: false, error: { code } }, status);
function clipBytes(text: string, maximum: number) {
  let result = "", bytes = 0;
  for (const character of text) { const size = Buffer.byteLength(character); if (bytes + size > maximum) break; result += character; bytes += size; }
  return result;
}

/** Opaque cookie possession + persisted hash lookup authenticates this browser's
 * memory, independently of the replaceable guest session. No signing secret or
 * client-supplied identifier is accepted. Cookie theft remains credential theft.
 */
export function createMemoryService(db: DatabaseSync, options: { production: boolean; now?: () => number }): MemoryService {
  const clock = options.now ?? Date.now;
  const memory = createClientMemory(db, clock);
  const cookieName = options.production ? "__Host-qettyq_memory" : "qettyq_memory";
  let lastPurge = -Infinity;
  function cookie(request: Request) {
    const raw = request.headers.get("cookie") ?? "";
    if (raw.length > 8192) return null;
    const values = raw.split(";").map(item => item.trim()).filter(item => item.startsWith(`${cookieName}=`)).map(item => item.slice(cookieName.length + 1));
    return values.length === 1 && /^[a-zA-Z0-9_-]{43}$/u.test(values[0]) ? values[0] : null;
  }
  function existing(request: Request) {
    const token = cookie(request);
    return token && memory.identity(token) ? token : null;
  }
  function cookieHeader(token: string | null, expiresAt?: string | null) {
    const age = token && expiresAt ? Math.max(1, Math.min(30 * 86400, Math.ceil((Date.parse(expiresAt) - clock()) / 1000))) : 0;
    return `${cookieName}=${token ?? ""}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${options.production ? "; Secure" : ""}`;
  }
  function state(token: string | null): MemoryState {
    const identity = token ? memory.identity(token) : null;
    return { available: true, enabled: identity !== null, storageMode: "sqlite_opt_in", historyTrust: "untrusted_personal_context",
      consents: identity?.consents ?? { profile: null, dialogue: null, ai_transfer: null, visits: null }, expiresAt: identity?.expiresAt ?? null,
      profile: token ? memory.readProfile(token) : null, messages: token ? memory.messages(token) : [], visits: token ? memory.visits(token) : [] };
  }
  function reply(token: string | null, updateCookie = false) {
    const result = state(token);
    return jsonResponse(result, 200, updateCookie ? { "set-cookie": cookieHeader(result.enabled ? token : null, result.expiresAt) } : undefined);
  }
  function guarded(request: Request, mutation: boolean) {
    if (mutation) { const blocked = blockCrossSiteMutation(request); if (blocked) return blocked; }
    const auth = requireSession(request);
    return auth.ok ? null : auth.response;
  }
  function purge() { const now = clock(); if (now - lastPurge >= 60_000) { memory.purgeExpired(); lastPurge = now; } }
  // Enforce physical row expiry even when no user opens the memory UI. On process
  // downtime, the next controlled startup purges immediately. Backups are separate.
  purge();
  const ttlTimer = setInterval(() => { try { purge(); } catch { /* Request handlers fail closed if storage is unavailable. */ } }, 60_000);
  ttlTimer.unref();
  return {
    dispose() { clearInterval(ttlTimer); },
    async handle(request, operation) {
      if (request.method !== methodFor[operation]) return error("METHOD_NOT_ALLOWED", 405);
      const blocked = guarded(request, operation !== "state"); if (blocked) return blocked;
      try {
        purge();
        const token = existing(request);
        if (operation === "state") return reply(token, cookie(request) !== null && token === null);
        if (operation === "delete") {
          if (token) memory.deleteClient(token);
          return jsonResponse({ deleted: true, ...state(null) }, 200, { "set-cookie": cookieHeader(null) });
        }
        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return error("JSON_REQUIRED", 415);
        const body = await readJson(request); if (!body.ok) return body.response;
        if (operation === "grant") {
          const parsed = grantSchema.safeParse(body.value); if (!parsed.success) return error("VALIDATION_ERROR", 400);
          // Unknown/request-supplied cookies are never adopted (fixation protection).
          const identity = token ?? randomBytes(32).toString("base64url");
          memory.grantConsent(identity, parsed.data.scope, parsed.data.retention);
          return reply(identity, true);
        }
        if (!token) return error("MEMORY_IDENTITY_REQUIRED", 409);
        if (operation === "revoke") {
          const parsed = revokeSchema.safeParse(body.value); if (!parsed.success) return error("VALIDATION_ERROR", 400);
          memory.revokeConsent(token, parsed.data.scope);
          if (!memory.identity(token)) memory.deleteClient(token);
          return reply(token, true);
        }
        if (operation === "profile") {
          const parsed = profileSchema.safeParse(body.value); if (!parsed.success) return error("VALIDATION_ERROR", 400);
          memory.saveProfile(token, parsed.data);
        } else if (operation === "message") {
          const parsed = messageSchema.safeParse(body.value); if (!parsed.success) return error("VALIDATION_ERROR", 400);
          if (Buffer.byteLength(parsed.data.text) > 4000) return error("MEMORY_MESSAGE_TOO_LARGE", 413);
          memory.appendMessage(token, parsed.data);
        } else if (operation === "visit") {
          const parsed = visitSchema.safeParse(body.value); if (!parsed.success) return error("VALIDATION_ERROR", 400);
          memory.markVisited(token, parsed.data);
        }
        return reply(token);
      } catch (failure) {
        const code = failure instanceof Error ? failure.message : "";
        if (code.startsWith("MEMORY_CONSENT_REQUIRED:")) return error("MEMORY_CONSENT_REQUIRED", 403);
        if (code === "MESSAGE_ID_CONFLICT") return error(code, 409);
        if (code === "VISIT_ENTITY_NOT_FOUND") return error(code, 404);
        if (code === "INVALID_VISIT" || code === "INVALID_MEMORY_MESSAGE") return error(code, 400);
        if (code === "MEMORY_CAPACITY_REACHED") return error(code, 429);
        return error("MEMORY_STORAGE_UNAVAILABLE", 503);
      }
    },
    async readForAI(request) {
      if (guarded(request, request.method !== "GET")) return null;
      try {
        purge();
        const token = existing(request);
        if (!token || !memory.hasConsent(token, "ai_transfer")) return null;
        const result = memory.aiContext(token);
        const bounded = normalizePersistedDialogueHistory(result.history, clock());
        return { ...result, history: bounded.history, historyCreatedAtMs: bounded.historyCreatedAtMs };
      } catch { return null; }
    },
    async readForDialogue(request) {
      if (guarded(request, request.method !== "GET")) return null;
      try {
        purge();
        const token = existing(request);
        if (!token || !memory.hasConsent(token, "profile") && !memory.hasConsent(token, "dialogue")) return null;
        const messages = memory.messages(token);
        const bounded = normalizePersistedDialogueHistory(messages, clock());
        return { usage: "local_deterministic_only", historyTrust: "untrusted_personal_context",
          historyWindow: "trusted_persisted_turn_dates", ...bounded,
          preferences: memory.readProfile(token) };
      } catch { return null; }
    },
    async recordExchange(request, exchange) {
      if (guarded(request, true)) return { stored: false, reason: "MEMORY_AUTH_REQUIRED" };
      try {
        purge();
        const token = existing(request);
        if (!token || !memory.hasConsent(token, "dialogue")) return { stored: false, reason: "MEMORY_DIALOGUE_CONSENT_REQUIRED" };
        const parsed = exchangeSchema.safeParse(exchange);
        if (!parsed.success) return { stored: false, reason: "INVALID_MEMORY_EXCHANGE" };
        const value = parsed.data;
        memory.appendMessages(token, [
          { id: value.userMessageId, role: "user", mode: "user", text: clipBytes(value.userText, 4000) },
          { id: value.assistantMessageId, role: "assistant", mode: value.mode, text: clipBytes(value.assistantText, 4000) },
        ]);
        return { stored: true, reason: null };
      } catch { return { stored: false, reason: "MEMORY_EXCHANGE_NOT_STORED" }; }
    },
  };
}
