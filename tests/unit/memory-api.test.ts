import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DatabaseSync } from "node:sqlite";
import places from "../../data/places.json";
import type { Place } from "../../src/domain/types";
import { openDatastore } from "../../src/server/datastore/sqlite";
import { createEventsStore } from "../../src/server/datastore/events-store";
import { createMemoryService } from "../../src/server/memory/service";
import { createPublicAIRuntime } from "../../src/server/pilot/public-ai-runtime";
import { setHostedRuntime } from "../../src/server/pilot/host-runtime";
import { createSession, resetSessionStoreForTests } from "../../src/server/session/store";
import { GET, DELETE } from "../../src/app/api/memory/route";
import { POST as grant, DELETE as revoke } from "../../src/app/api/memory/consents/route";
import { PATCH as profile } from "../../src/app/api/memory/profile/route";
import { POST as message } from "../../src/app/api/memory/messages/route";
import { POST as visit } from "../../src/app/api/memory/visits/route";
import type { MemoryScope } from "../../src/server/memory/contracts";

let directory: string, path: string, cookie: string, session: string;
let db: DatabaseSync;
let closed: boolean;
let time: number;
let memory: ReturnType<typeof createMemoryService>;
function install() {
  memory?.dispose?.();
  memory = createMemoryService(db, { production: true, now: () => time });
  setHostedRuntime({ memory, ai: createPublicAIRuntime({ NODE_ENV: "production" }), events: { get: async () => { throw new Error("No network in memory tests"); } }, routing: { reserve: async () => false } });
}
function request(method = "GET", body?: unknown, options: { cookie?: string; session?: string; origin?: string } = {}) {
  return new Request("https://qettyq.example/api/memory", { method, headers: { "x-qettyq-session": options.session ?? session,
    cookie: options.cookie ?? cookie, origin: options.origin ?? "https://qettyq.example", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function consent(scope: MemoryScope, retention: "session_24h" | "persistent_30d" = "session_24h") {
  const response = await grant(request("POST", { scope, retention }));
  if (response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
  expect(response.status).toBe(200); return response;
}
const preferences = { likedTags: ["rock", "culture"], locale: "kk", goal: "new", minutes: 120, budget: 5000 };
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "qettyq-memory-api-")); path = join(directory, "memory.sqlite");
  db = openDatastore({ path, migrate: true }); closed = false; time = Date.parse("2026-10-20T12:00:00Z");
  vi.spyOn(Date, "now").mockImplementation(() => time);
  resetSessionStoreForTests(); session = createSession().id; cookie = ""; install();
});
afterEach(() => { memory.dispose?.(); vi.useRealTimers(); setHostedRuntime(null); if (!closed) db.close(); resetSessionStoreForTests(); vi.restoreAllMocks(); rmSync(directory, { recursive: true }); });

describe("durable per-browser memory API, explicit consent and real SQLite", () => {
  it("GET never creates identity, requires a live guest session and has no RAM fallback", async () => {
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ enabled: false, profile: null, messages: [], visits: [], expiresAt: null });
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
    expect((await GET(request("GET", undefined, { session: "unknown" }))).status).toBe(401);
    setHostedRuntime(null);
    expect((await GET(request())).status).toBe(503);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
  });
  it("creates a random opaque host-only HttpOnly/Secure/SameSite cookie only on valid opt-in", async () => {
    expect((await profile(request("PATCH", preferences))).status).toBe(409);
    const response = await consent("profile"); const header = response.headers.get("set-cookie")!;
    for (const flag of ["__Host-qettyq_memory=", "HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=86400"]) expect(header).toContain(flag);
    expect(header).not.toContain("Domain=");
    expect(cookie.split("=")[1]).toHaveLength(43);
    const result = await response.json();
    expect(result.consents).toMatchObject({ profile: { active: true }, dialogue: null, ai_transfer: null, visits: null });
    expect(JSON.stringify(result)).not.toContain(cookie.split("=")[1]);
    expect(JSON.stringify(db.prepare("SELECT * FROM memory_clients").all())).not.toContain(cookie.split("=")[1]);
  });
  it("separates profile, dialogue and AI-transfer permissions", async () => {
    await consent("profile");
    expect((await profile(request("PATCH", preferences))).status).toBe(200);
    expect((await message(request("POST", { id: "one", role: "user", mode: "user", text: "Люблю рок" }))).status).toBe(403);
    expect(await memory.readForAI(request("POST"))).toBeNull();
    await consent("dialogue");
    expect((await message(request("POST", { id: "one", role: "user", mode: "user", text: "Люблю рок" }))).status).toBe(200);
    expect(await memory.readForAI(request("POST"))).toBeNull();
    await consent("ai_transfer");
    expect(await memory.readForAI(request("POST"))).toMatchObject({ preferences, history: [{ role: "user", text: "Люблю рок" }], visits: [] });
    await revoke(request("DELETE", { scope: "ai_transfer" }));
    expect(await memory.readForAI(request("POST"))).toBeNull();
    expect((await (await GET(request())).json()).messages).toHaveLength(1);
  });
  it("restores preferences/history after database reopen and ephemeral guest-session restart", async () => {
    await consent("profile", "persistent_30d"); await consent("dialogue", "persistent_30d");
    await profile(request("PATCH", preferences));
    await message(request("POST", { id: "history-1", role: "user", mode: "user", text: "Люблю театр" }));
    const oldSession = session;
    resetSessionStoreForTests(); db.close(); db = openDatastore({ path }); install();
    expect((await GET(request("GET", undefined, { session: oldSession }))).status).toBe(401);
    session = createSession().id;
    const state = await (await GET(request())).json();
    expect(state.profile).toEqual(preferences); expect(state.messages[0].text).toBe("Люблю театр");
    expect(state.historyTrust).toBe("untrusted_personal_context");
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(1);
  });
  it("rejects guessed cookies/client IDs, prevents fixation and never changes identity from query/body", async () => {
    const attackerCookie = `__Host-qettyq_memory=${"x".repeat(43)}`;
    expect((await (await GET(request("GET", undefined, { cookie: attackerCookie }))).json()).enabled).toBe(false);
    expect((await profile(request("PATCH", preferences, { cookie: attackerCookie }))).status).toBe(409);
    const response = await grant(request("POST", { scope: "profile", retention: "session_24h" }, { cookie: attackerCookie }));
    expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).not.toContain("x".repeat(43));
    cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
    expect((await profile(request("PATCH", { ...preferences, clientId: "somebody-else" }))).status).toBe(400);
    expect((await grant(request("POST", { scope: "profile", retention: "session_24h", clientId: "somebody-else" }))).status).toBe(400);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(1);
  });
  it("blocks CSRF before writes/deletion and rejects duplicate ambiguous identity cookies", async () => {
    const bad = { origin: "https://evil.example" };
    expect((await grant(request("POST", { scope: "profile", retention: "session_24h" }, bad))).status).toBe(403);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
    await consent("profile"); await profile(request("PATCH", preferences));
    expect((await DELETE(request("DELETE", undefined, bad))).status).toBe(403);
    expect((await profile(request("PATCH", preferences, bad))).status).toBe(403);
    expect((await (await GET(request())).json()).profile).toEqual(preferences);
    expect((await (await GET(request("GET", undefined, { cookie: `${cookie}; ${cookie}` }))).json()).enabled).toBe(false);
  });
  it("expires 24-hour rows without resurrection; explicit 30-day opt-in survives two days", async () => {
    await consent("profile", "persistent_30d"); await profile(request("PATCH", preferences));
    await consent("dialogue", "session_24h");
    await message(request("POST", { id: "old", role: "user", mode: "user", text: "Не хранить дольше суток" }));
    time += 2 * 86400_000; session = createSession().id;
    const state = await (await GET(request())).json();
    expect(state.enabled).toBe(true); expect(state.profile).toEqual(preferences); expect(state.messages).toEqual([]); expect(state.consents.dialogue).toBeNull();
    await consent("dialogue"); expect((await (await GET(request())).json()).messages).toEqual([]);
    time += 31 * 86400_000; session = createSession().id;
    const response = await GET(request()); expect((await response.json()).enabled).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
  });
  it("revokes granular data and last consent/delete cascades and clears browser cookie", async () => {
    await consent("profile"); await consent("dialogue"); await profile(request("PATCH", preferences));
    await message(request("POST", { id: "one", role: "user", mode: "user", text: "Диалог" }));
    const first = await revoke(request("DELETE", { scope: "profile" })); const data = await first.json();
    expect(data).toMatchObject({ enabled: true, profile: null }); expect(data.messages).toHaveLength(1);
    const last = await revoke(request("DELETE", { scope: "dialogue" }));
    expect((await last.json()).enabled).toBe(false); expect(last.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
    await consent("profile"); await profile(request("PATCH", preferences));
    const response = await DELETE(request("DELETE")); expect((await response.json()).deleted).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    for (const table of ["memory_clients", "memory_profiles", "memory_messages", "memory_consents", "memory_visits"]) expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.n).toBe(0);
  });
  it("does not persist structured location/address or detected location text/URLs", async () => {
    await consent("profile"); await consent("dialogue");
    expect((await profile(request("PATCH", { ...preferences, origin: { lat: 51.123, lon: 71.123 } }))).status).toBe(400);
    expect((await profile(request("PATCH", { ...preferences, address: "ул. Абая, 10" }))).status).toBe(400);
    expect((await profile(request("PATCH", { ...preferences, likedTags: ["ул Абая 10"] }))).status).toBe(400);
    await message(request("POST", { id: "address", role: "user", mode: "user", text: "Живу по адресу ул. Абая, 10" }));
    await message(request("POST", { id: "gps", role: "user", mode: "user", text: "Я у 51.123456, 71.123456" }));
    await message(request("POST", { id: "url", role: "user", mode: "user", text: "https://maps.example/?address=private" }));
    const stored = JSON.stringify(db.prepare("SELECT text FROM memory_messages").all());
    expect(stored).not.toMatch(/Абая|51\.123456|71\.123456|maps\.example|address=private/u);
  });
  it("recordExchange never creates identity; stores bounded exchanges atomically only with dialogue consent", async () => {
    const exchange = { userMessageId: "user-1", userText: "Куда пойти?", assistantMessageId: "assistant-1", assistantText: "Уточните интересы.", mode: "deterministic" as const };
    expect((await memory.recordExchange(request("POST"), exchange)).stored).toBe(false);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
    await consent("ai_transfer"); expect((await memory.recordExchange(request("POST"), exchange)).stored).toBe(false);
    await consent("dialogue"); expect(await memory.recordExchange(request("POST"), exchange)).toEqual({ stored: true, reason: null });
    expect(await memory.recordExchange(request("POST"), exchange)).toEqual({ stored: true, reason: null });
    expect((await memory.recordExchange(request("POST"), { ...exchange, userMessageId: "user-2", assistantText: "Иной текст" })).stored).toBe(false);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_messages").get()?.n).toBe(2);
    expect((await memory.readForAI(request("POST")))?.history).toHaveLength(2);
    await memory.recordExchange(request("POST"), { ...exchange, userMessageId: "user-long", assistantMessageId: "assistant-long", assistantText: "Я".repeat(5000) });
    const text = String(db.prepare("SELECT text FROM memory_messages WHERE id='assistant-long'").get()?.text);
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(4000);
  });
  it("retains 24 untrusted messages and sends at most six only after AI-transfer consent", async () => {
    await consent("dialogue");
    for (let index = 0; index < 15; index++) await memory.recordExchange(request("POST"), { userMessageId: `u-${index}`, userText: `Запрос ${index}`, assistantMessageId: `a-${index}`, assistantText: "Уточните интересы.", mode: "deterministic" });
    const state = await (await GET(request())).json(); expect(state.messages).toHaveLength(24);
    expect(state.visits).toEqual([]); expect(await memory.readForAI(request("POST"))).toBeNull();
    await consent("ai_transfer"); expect((await memory.readForAI(request("POST")))?.history.length).toBeLessThanOrEqual(6);
  });
  it("marks a visit only through separate explicit consent/action and rejects future/unknown records", async () => {
    const repository = createEventsStore(db);
    repository.registerSource({ id: "osm-overpass-poi", name: "OSM", policyUrl: "https://www.openstreetmap.org/copyright", allowPersist: true, allowDisplay: true, allowLlm: true, credit: "© OpenStreetMap contributors", minimumRefreshMinutes: 1440 });
    repository.importPlaces([places[0] as Place], { sourceId: "osm-overpass-poi", expiresAt: "2026-11-19T00:00:00Z" });
    await consent("profile");
    const data = { entityKind: "venue", entityId: places[0].id, visitedAtMs: time };
    expect((await visit(request("POST", data))).status).toBe(403);
    await consent("visits"); expect((await (await GET(request())).json()).visits).toEqual([]);
    expect((await visit(request("POST", { ...data, visitedAtMs: time + 1 }))).status).toBe(400);
    expect((await visit(request("POST", { ...data, entityId: "unknown" }))).status).toBe(404);
    expect((await visit(request("POST", data))).status).toBe(200);
    expect((await (await GET(request())).json()).visits).toEqual([{ ...data, confirmation: "user_confirmed" }]);
  });
  it("returns safe 503 when SQLite fails instead of in-memory persistence", async () => {
    await consent("profile"); db.close(); closed = true;
    const response = await GET(request()); const result = await response.json();
    expect(response.status).toBe(503); expect(result.error.code).toBe("MEMORY_STORAGE_UNAVAILABLE");
    expect(JSON.stringify(result)).not.toContain(path);
  });
  it("physically purges expired rows in the live process without requiring a settings/API visit", async () => {
    memory.dispose?.(); vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] }); install();
    await consent("dialogue"); await message(request("POST", { id: "expires", role: "user", mode: "user", text: "Сутки" }));
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_messages").get()?.n).toBe(1);
    time += 86400_001;
    await vi.advanceTimersByTimeAsync(60_001);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_messages").get()?.n).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM memory_clients").get()?.n).toBe(0);
  });
});
