import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DatabaseSync } from "node:sqlite";
import { openDatastore } from "../../src/server/datastore/sqlite";
import { createMemoryService } from "../../src/server/memory/service";
import { createSession, getSession, resetSessionStoreForTests } from "../../src/server/session/store";
import { handleChat } from "../../src/app/api/chat/route";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import { createPublicAIRuntime } from "../../src/server/pilot/public-ai-runtime";
import { setGooglePlacesRuntime, unavailableGooglePlaces, type GooglePlacesRuntime } from "../../src/server/pilot/google-places";
import type { HostedRuntime } from "../../src/server/pilot/host-runtime";
import type { MemoryScope } from "../../src/server/memory/contracts";

let directory: string, path: string, cookie: string, session: string, time: number;
let db: DatabaseSync;
let memory: ReturnType<typeof createMemoryService>;
let fetcher: ReturnType<typeof vi.fn>;
let googleSearch: ReturnType<typeof vi.fn<GooglePlacesRuntime["search"]>>;
const events: HostedRuntime["events"] = { get: async () => ({ dataMode: "snapshot", freshness: "stale", cacheStatus: "hit",
  fetchedAt: null, expiresAt: null, source: null, coverage: null, warnings: [], items: [] }) };
function request(body?: unknown, method = "POST") {
  return new Request("https://qettyq.example/api/chat", { method,
    headers: { "x-qettyq-session": session, cookie, origin: "https://qettyq.example", "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function grant(scope: MemoryScope) {
  const response = await memory.handle(request({ scope, retention: "persistent_30d" }), "grant");
  expect(response.status).toBe(200); cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
}
async function save(text: string, id = "first") {
  expect((await memory.recordExchange(request(), { userMessageId: `u-${id}`, userText: text,
    assistantMessageId: `a-${id}`, assistantText: "SYNTHETIC TEST: уточните условия", mode: "deterministic" })).stored).toBe(true);
}
async function chat(text: string, other: Record<string, unknown> = {}) {
  const response = await handleChat(request({ text, useAI: false, ...other }), undefined, events, memory);
  expect(response.status).toBe(200); return response.json();
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "qettyq-chat-local-")); path = join(directory, "memory.sqlite");
  time = Date.parse("2026-10-24T10:00:00Z"); cookie = "";
  vi.spyOn(Date, "now").mockImplementation(() => time);
  fetcher = vi.fn(async () => { throw new Error("NETWORK_FORBIDDEN_OFFLINE_TEST"); }); vi.stubGlobal("fetch", fetcher);
  googleSearch = vi.fn<GooglePlacesRuntime["search"]>(async () => unavailableGooglePlaces("SYNTHETIC_TEST_NO_NETWORK"));
  setGooglePlacesRuntime({ search: googleSearch });
  resetSessionStoreForTests(); session = createSession().id;
  db = openDatastore({ path, migrate: true }); memory = createMemoryService(db, { production: true, now: () => time });
});
afterEach(() => {
  memory.dispose?.(); db.close(); setGooglePlacesRuntime(null); resetSessionStoreForTests();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); rmSync(directory, { recursive: true });
});

describe("handleChat local memory integration, actual SQLite and no paid providers", () => {
  it("restores same-day dialogue after DB reopen/new guest without client history or AI transfer", async () => {
    await grant("dialogue"); await save("Хочу завтра в музей, без концертов, до 5000 тенге");
    memory.dispose?.(); db.close(); db = openDatastore({ path }); memory = createMemoryService(db, { production: true, now: () => time });
    resetSessionStoreForTests(); session = createSession().id;
    const body = await chat("Два часа");
    expect(body.proposedContext).toMatchObject({ goal: "activity", budget: 5000, minutes: 120 });
    expect(body.memoryStored).toBe(true); expect(body.mode).toBe("deterministic");
    expect(db.prepare("SELECT scope FROM memory_consents").all()).toEqual([{ scope: "dialogue" }]);
    expect(fetcher).not.toHaveBeenCalled(); expect(googleSearch).not.toHaveBeenCalled();
  });
  it("restores saved profile only when no fresh input context or confirmed session context exists", async () => {
    await grant("profile");
    const preferences = { likedTags: ["culture"], locale: "ru", goal: "activity", minutes: 90, budget: 5000 };
    expect((await memory.handle(request(preferences, "PATCH"), "profile")).status).toBe(200);
    session = createSession().id;
    expect((await chat("Музей")).proposedContext).toMatchObject({ minutes: 90, budget: 5000 });
    const clientContext = pilotContextSchema.parse({ minutes: 60, budget: 2000, strictBudget: true });
    expect((await chat("Музей", { context: clientContext })).proposedContext).toMatchObject({ minutes: 60, budget: 2000 });
    getSession(session)!.context = pilotContextSchema.parse({ minutes: 180, budget: 3000, strictBudget: true });
    expect((await chat("Музей")).proposedContext).toMatchObject({ minutes: 180, budget: 3000 });
  });
  it("honors latest same-day correction rather than merging stale food intent into events", async () => {
    await grant("dialogue"); await save("Завтра ужин, до 12000 тенге на двоих, два часа");
    const body = await chat("А стендап вместо ужина?", { googleConsent: true });
    expect(body.proposedContext).toMatchObject({ goal: "activity", budget: 12000, minutes: 120, partySize: 2 });
    expect(body.googlePlaces).toBeUndefined(); expect(googleSearch).not.toHaveBeenCalled();
  });
  it("protects explicit strict client budget and confirmed session minutes from stale history", async () => {
    await grant("dialogue"); await save("Концерт, до 12000 тенге, три часа");
    const strictClient = pilotContextSchema.parse({ budget: 2500, strictBudget: true, minutes: 90 });
    expect((await chat("Балет", { context: strictClient })).proposedContext).toMatchObject({ budget: 2500, strictBudget: true });
    const confirmed = pilotContextSchema.parse({ budget: 5000, strictBudget: true, minutes: 60 });
    getSession(session)!.context = confirmed;
    const body = await chat("Балет");
    expect(body.proposedContext).toMatchObject({ budget: 5000, strictBudget: true, minutes: 60 });
    expect(getSession(session)!.context).toEqual(confirmed);
  });
  it("keeps fresh nondefault client minutes ahead of old saved duration without confirming them in session", async () => {
    await grant("dialogue"); await save("Концерт, три часа");
    const context = pilotContextSchema.parse({ minutes: 90 });
    expect((await chat("Балет", { context })).proposedContext.minutes).toBe(90);
    expect(getSession(session)!.context).toBeNull();
    expect((await chat("Балет, два часа", { context })).proposedContext.minutes).toBe(120);
    expect(getSession(session)!.context).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps fresh non-strict client budget ahead of old saved amount but permits a new explicit proposal", async () => {
    await grant("dialogue"); await save("Концерт, до 12000 тенге");
    const context = pilotContextSchema.parse({ budget: 7000, strictBudget: false });
    expect((await chat("Балет", { context })).proposedContext).toMatchObject({ budget: 7000, strictBudget: false });
    expect(getSession(session)!.context).toBeNull();
    expect((await chat("Балет, до 15000 тенге", { context })).proposedContext).toMatchObject({ budget: 15000, strictBudget: true });
    expect(getSession(session)!.context).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("current client transcript wins over saved history without text deduplication", async () => {
    await grant("dialogue"); await save("Завтра ресторан, до 17000 тенге");
    const history = [{ role: "user", text: "Парк, до 2000 тенге" },
      { role: "user", text: "До 3000 тенге" }, { role: "user", text: "До 2000 тенге" }];
    const body = await chat("Час", { history });
    expect(body.proposedContext).toMatchObject({ goal: "walk", budget: 2000 });
    expect(body.googlePlaces).toBeUndefined(); expect(googleSearch).not.toHaveBeenCalled();
  });
  it("AI-requested branch never reads local-only context when transfer was not granted", async () => {
    await grant("dialogue"); await save("Ужин, до 17000 тенге");
    const local = vi.spyOn(memory, "readForDialogue"), ai = vi.spyOn(memory, "readForAI");
    const body = await chat("Музей", { useAI: true });
    expect(ai).toHaveBeenCalledOnce(); expect(local).not.toHaveBeenCalled();
    expect(body.proposedContext.budget).toBeNull(); expect(body.proposedContext.goal).toBe("activity");
    expect(fetcher).not.toHaveBeenCalled(); expect(googleSearch).not.toHaveBeenCalled();
  });
  it("uses local memory when public AI budget is unavailable even if UI requested AI, without a later model attempt", async () => {
    await grant("dialogue"); await save("Завтра музей, до 5000 тенге, полтора часа");
    const runtime = createPublicAIRuntime({ NODE_ENV: "production" });
    const status = await runtime.getStatus(session);
    const gate = vi.spyOn(runtime, "getStatus").mockResolvedValue({ ...status, configured: true, available: false,
      reason: "PUBLIC_BUDGET_EXHAUSTED", capMicroUsd: 10_000_000, reservedMicroUsd: 10_000_000, reservationMicroUsd: 500_000 });
    const dependencies = vi.spyOn(runtime, "dependencies");
    const local = vi.spyOn(memory, "readForDialogue"), ai = vi.spyOn(memory, "readForAI");
    const response = await handleChat(request({ text: "Два часа", useAI: true }), runtime, events, memory);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposedContext).toMatchObject({ goal: "activity", budget: 5000, minutes: 120 });
    expect(body.mode).toBe("deterministic"); expect(body.reason).toBe("PUBLIC_BUDGET_EXHAUSTED");
    expect(gate).toHaveBeenCalledOnce(); expect(local).toHaveBeenCalledOnce();
    expect(ai).not.toHaveBeenCalled(); expect(dependencies).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled(); expect(googleSearch).not.toHaveBeenCalled();
  });
  it("fails closed to local memory when public budget status throws and never retries provider execution", async () => {
    await grant("dialogue"); await save("Музей, до 6000 тенге");
    const runtime = createPublicAIRuntime({ NODE_ENV: "production" });
    const gate = vi.spyOn(runtime, "getStatus").mockRejectedValue(new Error("SYNTHETIC TEST: budget DB unavailable"));
    const dependencies = vi.spyOn(runtime, "dependencies");
    const local = vi.spyOn(memory, "readForDialogue"), ai = vi.spyOn(memory, "readForAI");
    const response = await handleChat(request({ text: "Час", useAI: true }), runtime, events, memory);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposedContext).toMatchObject({ goal: "activity", budget: 6000 });
    expect(body.reason).toBe("PUBLIC_BUDGET_STORAGE_UNAVAILABLE"); expect(body.mode).toBe("deterministic");
    expect(gate).toHaveBeenCalledOnce(); expect(local).toHaveBeenCalledOnce();
    expect(ai).not.toHaveBeenCalled(); expect(dependencies).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled(); expect(googleSearch).not.toHaveBeenCalled();
  });
  it("never sends a locally restored food query to Google even with current Google consent", async () => {
    await grant("dialogue"); await save("Хочу рамен и японскую кухню");
    const body = await chat("На двоих", { googleConsent: true });
    expect(body.proposedContext.goal).toBe("food");
    expect(body.googlePlaces).toMatchObject({ status: "unavailable", reason: "MEMORY_LOCAL_ONLY" });
    expect(googleSearch).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("also blocks Google when only local saved profile helped construct food context", async () => {
    await grant("profile");
    expect((await memory.handle(request({ likedTags: ["japanese"], locale: "ru", goal: "food", minutes: 90 }, "PATCH"), "profile")).status).toBe(200);
    const body = await chat("На двоих", { googleConsent: true });
    expect(body.proposedContext.goal).toBe("food"); expect(body.googlePlaces.reason).toBe("MEMORY_LOCAL_ONLY");
    expect(googleSearch).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not block separate current-input Google consent when no local context was consumed", async () => {
    await grant("dialogue"); await save("Музей, до 1000 тенге");
    const body = await chat("Хочу рамен", { history: [{ role: "user", text: "Хочу рамен" }], googleConsent: true });
    expect(body.proposedContext.goal).toBe("food");
    expect(googleSearch).toHaveBeenCalledOnce();
    expect(googleSearch.mock.calls[0][0].query).not.toContain("музей"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("revocation/deletion and missing consent fail closed without reviving old dialogue", async () => {
    expect((await chat("Музей")).proposedContext.budget).toBeNull();
    await grant("dialogue"); await save("Музей, до 5000 тенге");
    expect((await chat("Музей")).proposedContext.budget).toBe(5000);
    expect((await memory.handle(request({ scope: "dialogue" }, "DELETE"), "revoke")).status).toBe(200);
    expect((await chat("Музей")).proposedContext.budget).toBeNull();
    await grant("dialogue"); await save("Музей, до 9000 тенге", "second");
    expect((await memory.handle(request(undefined, "DELETE"), "delete")).status).toBe(200);
    expect((await chat("Музей")).proposedContext.budget).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
