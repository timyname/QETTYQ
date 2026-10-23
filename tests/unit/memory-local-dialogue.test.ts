import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DatabaseSync } from "node:sqlite";
import { openDatastore } from "../../src/server/datastore/sqlite";
import { createMemoryService } from "../../src/server/memory/service";
import { createSession, resetSessionStoreForTests } from "../../src/server/session/store";
import { CHAT_HISTORY_MAX_BYTES } from "../../src/server/pilot/chat-history";
import { prepareLeisureDialogue } from "../../src/server/assistant/leisure-dialogue";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import type { MemoryScope } from "../../src/server/memory/contracts";

let directory: string, path: string, cookie: string, session: string, time: number;
let db: DatabaseSync, closed: boolean;
let memory: ReturnType<typeof createMemoryService>;
const preferences = { likedTags: ["culture"], locale: "ru", goal: "activity", minutes: 90, budget: 5000 };
function request(method = "POST", body?: unknown, override: { cookie?: string; session?: string; origin?: string } = {}) {
  return new Request("https://qettyq.example/api/chat", { method,
    headers: { "x-qettyq-session": override.session ?? session, cookie: override.cookie ?? cookie,
      origin: override.origin ?? "https://qettyq.example", "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function install() {
  memory?.dispose?.();
  memory = createMemoryService(db, { production: true, now: () => time });
}
async function grant(scope: MemoryScope, retention = "persistent_30d") {
  const response = await memory.handle(request("POST", { scope, retention }), "grant");
  expect(response.status).toBe(200);
  cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
}
async function exchange(index: number, text = "Хочу завтра в музей, без концертов, до 5000 тенге") {
  const result = await memory.recordExchange(request(), { userMessageId: `u-${index}`, userText: text,
    assistantMessageId: `a-${index}`, assistantText: "SYNTHETIC TEST: уточните условия", mode: "deterministic" });
  expect(result.stored).toBe(true);
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "qettyq-memory-local-")); path = join(directory, "memory.sqlite");
  time = Date.parse("2026-10-24T10:00:00Z"); closed = false; cookie = "";
  vi.spyOn(Date, "now").mockImplementation(() => time);
  resetSessionStoreForTests(); session = createSession().id;
  db = openDatastore({ path, migrate: true }); install();
});
afterEach(() => {
  memory.dispose?.(); if (!closed) db.close(); resetSessionStoreForTests(); vi.restoreAllMocks();
  rmSync(directory, { recursive: true });
});

describe("local deterministic memory context, real SQLite and independent scopes", () => {
  it("never creates identity or silently grants profile/dialogue/AI transfer", async () => {
    expect(await memory.readForDialogue!(request())).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()!.n).toBe(0);
    await grant("ai_transfer");
    expect(await memory.readForDialogue!(request())).toBeNull();
    expect(db.prepare("SELECT scope FROM memory_consents").all()).toEqual([{ scope: "ai_transfer" }]);
  });
  it("restores only independently granted profile without history, visits or AI authorization", async () => {
    await grant("profile");
    expect((await memory.handle(request("PATCH", preferences), "profile")).status).toBe(200);
    const saved = await memory.readForDialogue!(request());
    expect(saved).toEqual({ usage: "local_deterministic_only", historyTrust: "untrusted_personal_context",
      historyWindow: "same_astana_calendar_day", omittedHistoryCount: 0, preferences, history: [] });
    expect(saved).not.toHaveProperty("visits");
    expect(await memory.readForAI(request())).toBeNull();
  });
  it("replays dialogue without profile consent, but never authorizes AI transfer", async () => {
    await grant("dialogue"); await exchange(1);
    const saved = (await memory.readForDialogue!(request()))!;
    expect(saved.preferences).toBeNull(); expect(saved.history).toHaveLength(2);
    const dialogue = prepareLeisureDialogue({ text: "Два часа", history: saved.history,
      context: pilotContextSchema.parse({}), now: time });
    expect(dialogue.context).toMatchObject({ goal: "activity", budget: 5000, minutes: 120 });
    expect(dialogue.excludedTags).toContain("concert");
    expect(dialogue.retrievalText).toContain("2026-10-25");
    expect(await memory.readForAI(request())).toBeNull();
  });
  it("survives actual SQLite reopen and replacement of the ephemeral guest session", async () => {
    await grant("dialogue"); await exchange(1);
    const previousSession = session;
    memory.dispose?.(); db.close(); db = openDatastore({ path }); install();
    resetSessionStoreForTests(); session = createSession().id;
    expect(await memory.readForDialogue!(request("POST", undefined, { session: previousSession }))).toBeNull();
    const saved = (await memory.readForDialogue!(request()))!;
    expect(saved.history[0].text).toContain("завтра"); expect(saved.history).toHaveLength(2);
    expect(await memory.readForAI(request())).toBeNull();
  });
  it("rejects foreign/guessed/missing/ambiguous cookies and invalid sessions", async () => {
    await grant("dialogue"); await exchange(1);
    const firstCookie = cookie;
    for (const override of [{ cookie: "" }, { cookie: `__Host-qettyq_memory=${"x".repeat(43)}` },
      { cookie: `${cookie}; ${cookie}` }, { session: "invalid" }]) {
      expect(await memory.readForDialogue!(request("POST", undefined, override))).toBeNull();
    }
    cookie = ""; await grant("dialogue"); await exchange(2, "SYNTHETIC TEST: хочу кофе");
    expect((await memory.readForDialogue!(request()))!.history[0].text).toContain("кофе");
    expect((await memory.readForDialogue!(request("POST", undefined, { cookie: firstCookie })))!.history[0].text).toContain("музей");
  });
  it("blocks cross-site POST reads of local memory", async () => {
    await grant("dialogue"); await exchange(1);
    expect(await memory.readForDialogue!(request("POST", undefined, { origin: "https://evil.example" }))).toBeNull();
    expect((await memory.readForDialogue!(request()))!.history).toHaveLength(2);
  });
  it("does not reinterpret yesterday's tomorrow after Astana midnight and does not delete stored UI history", async () => {
    time = Date.parse("2026-10-24T18:59:59Z"); // 23:59:59 Astana, UTC+5.
    await grant("profile"); await grant("dialogue");
    await memory.handle(request("PATCH", preferences), "profile"); await exchange(1);
    time += 2000;
    const saved = (await memory.readForDialogue!(request()))!;
    expect(saved).toMatchObject({ preferences, history: [], omittedHistoryCount: 2 });
    expect((await (await memory.handle(request("GET"), "state")).json()).messages).toHaveLength(2);
    await exchange(2, "Сегодня хочу кофе");
    const current = (await memory.readForDialogue!(request()))!;
    expect(current.history).toHaveLength(2); expect(current.omittedHistoryCount).toBe(2);
    expect(current.history[0].text).toBe("Сегодня хочу кофе");
  });
  it("uses Astana day, not UTC day, for same-day history", async () => {
    time = Date.parse("2026-10-24T23:59:00Z"); await grant("dialogue"); await exchange(1);
    time += 120_000;
    expect((await memory.readForDialogue!(request()))!.history).toHaveLength(2);
  });
  it("independently expires dialogue while retaining a thirty-day profile", async () => {
    await grant("profile"); await memory.handle(request("PATCH", preferences), "profile");
    await grant("dialogue", "session_24h"); await exchange(1);
    time += 2 * 86400_000; session = createSession().id;
    expect(await memory.readForDialogue!(request())).toMatchObject({ preferences, history: [] });
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_messages").get()!.n).toBe(0);
    time += 30 * 86400_000; session = createSession().id;
    expect(await memory.readForDialogue!(request())).toBeNull();
  });
  it("revokes profile and dialogue independently and fully deletes replay data", async () => {
    await grant("profile"); await grant("dialogue");
    await memory.handle(request("PATCH", preferences), "profile"); await exchange(1);
    await memory.handle(request("DELETE", { scope: "profile" }), "revoke");
    expect(await memory.readForDialogue!(request())).toMatchObject({ preferences: null, history: expect.any(Array) });
    await memory.handle(request("DELETE", { scope: "dialogue" }), "revoke");
    expect(await memory.readForDialogue!(request())).toBeNull();
    await grant("dialogue"); await exchange(2);
    expect((await memory.handle(request("DELETE"), "delete")).status).toBe(200);
    expect(await memory.readForDialogue!(request())).toBeNull();
    for (const table of ["memory_profiles", "memory_messages", "memory_clients"]) {
      expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n).toBe(0);
    }
  });
  it("keeps twenty/six-KiB bounds and excludes future-dated rows", async () => {
    await grant("dialogue");
    for (let index = 0; index < 13; index++) { time += 1; await exchange(index, "SYNTHETIC TEST: музей"); }
    let saved = (await memory.readForDialogue!(request()))!;
    expect(saved.history).toHaveLength(20);
    db.prepare("UPDATE memory_messages SET created_at_ms=? WHERE id='u-12'").run(time + 1000);
    saved = (await memory.readForDialogue!(request()))!;
    expect(saved.omittedHistoryCount).toBe(1);
    expect(JSON.stringify(saved.history)).not.toContain('"id"');
    await exchange(14, "Я".repeat(1800));
    saved = (await memory.readForDialogue!(request()))!;
    expect(Buffer.byteLength(JSON.stringify(saved.history))).toBeLessThanOrEqual(CHAT_HISTORY_MAX_BYTES);
  });
  it("does not return locations or URLs suppressed during persistence", async () => {
    await grant("dialogue"); await exchange(1, "Живу по адресу ул. Абая, 10; 51.123456, 71.123456 https://maps.example/private");
    const saved = await memory.readForDialogue!(request());
    expect(JSON.stringify(saved)).not.toMatch(/Абая|51\.123456|71\.123456|maps\.example/u);
  });
  it("fails closed on unavailable SQLite rather than creating RAM memory", async () => {
    await grant("dialogue"); await exchange(1); db.close(); closed = true;
    expect(await memory.readForDialogue!(request())).toBeNull();
  });
});
