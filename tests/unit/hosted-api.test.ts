import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as chat, handleChat } from "../../src/app/api/chat/route";
import { GET as events } from "../../src/app/api/events/route";
import { GET as status, handleAssistantStatus } from "../../src/app/api/assistant/status/route";
import { POST as routing, handleRouting } from "../../src/app/api/routing/route";
import { register } from "../../src/instrumentation";
import { createSession, resetSessionStoreForTests } from "../../src/server/session/store";
import { setHostedRuntime, type HostedRuntime } from "../../src/server/pilot/host-runtime";
import { liveEventsService, type LiveEventsResult } from "../../src/server/ingestion/live-events";
import * as smartAssistant from "../../src/server/pilot/smart-assistant";
import * as vpsRuntime from "../../src/server/vps/runtime";

const clock = Date.parse("2026-10-20T12:00:00Z");
function snapshot(): LiveEventsResult {
  const sourceUrl = "https://sxodim.com/astana/event/synthetic-hosted-api-test";
  return { dataMode: "snapshot", freshness: "stale", cacheStatus: "stale-fallback", fetchedAt: "2026-10-20T10:00:00Z", expiresAt: "2026-10-20T11:00:00Z", source: null, coverage: null, warnings: ["SYNTHETIC TEST DATA"], items: [{ id: "synthetic-hosted", name: "SYNTHETIC TEST · лекция", category: "Образование", cityId: "astana", venueName: null, address: null, lat: null, lon: null, startsAt: "2026-10-21T13:00:00Z", endsAt: null, timeZone: "Asia/Almaty", durationMinutes: null, contentLanguage: "und", priceFromKzt: null, price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" }, status: "scheduled", availability: "unknown", bookingUrl: null, contactUrl: sourceUrl, image: null, requiredCredit: { text: "Давай Сходим", url: sourceUrl }, fetchedAt: "2026-10-20T10:00:00Z", provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl, parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" }, warnings: ["PRICE_UNKNOWN"] }] };
}
function fixture() {
  const get = vi.fn(async () => snapshot());
  const reserve = vi.fn(async () => false);
  const dependencies = vi.fn<HostedRuntime["ai"]["dependencies"]>(() => ({ executionScope: "public", quota: { kind: "durable_public", reserve, reason: () => "PUBLIC_BUDGET_STORAGE_UNAVAILABLE" } }));
  const getStatus = vi.fn<HostedRuntime["ai"]["getStatus"]>(async () => ({ configured: false, available: false, model: "gpt-5.5", localTestOnly: false, hostedWebSearch: false, retrievalMode: "source_evidence", reason: "API_KEY_MISSING", remainingCalls: 0 }));
  const host = { ai: { dependencies, getStatus }, events: { get }, routing: { reserve, env: { NODE_ENV: "production", QETTYQ_PUBLIC_ROUTING_ENABLED: "true" } } } satisfies HostedRuntime;
  return { host, get, reserve, dependencies, getStatus };
}
function request(path: string, session?: string, body?: unknown) {
  return new Request(`https://qettyq.example/api/${path}`, { method: body === undefined ? "GET" : "POST", headers: { ...(session ? { "x-qettyq-session": session } : {}), "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => { resetSessionStoreForTests(); setHostedRuntime(null); vi.spyOn(Date, "now").mockReturnValue(clock); vi.spyOn(liveEventsService, "get").mockResolvedValue({ ...snapshot(), items: [] }); });
afterEach(() => { setHostedRuntime(null); resetSessionStoreForTests(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("hosted API dependency wiring, no external traffic", () => {
  it("uses hosted persisted events for public GET and chat instead of the default process service", async () => {
    const mock = fixture(); setHostedRuntime(mock.host);
    const response = await events(request("events?date=2026-10-21"));
    expect(response.status).toBe(200);
    expect((await response.json()).items[0].id).toBe("synthetic-hosted");
    const result = await (await chat(request("chat", createSession().id, { text: "Лекции завтра" }))).json();
    expect(result.events[0].id).toBe("synthetic-hosted");
    expect(mock.get).toHaveBeenCalledTimes(2);
    expect(liveEventsService.get).not.toHaveBeenCalled(); expect(mock.dependencies).not.toHaveBeenCalled();
  });
  it("keeps explicit Sites AI DI and its default event service independent from a registered host", async () => {
    const mock = fixture(), explicit = fixture(); setHostedRuntime(mock.host);
    const answer = vi.spyOn(smartAssistant, "answerSmartAssistant").mockResolvedValue({ mode: "deterministic", reply: "SYNTHETIC TEST", citations: [], model: null, reason: "TEST_ONLY" });
    await handleChat(request("chat", createSession().id, { text: "Лекции завтра", useAI: true }), explicit.host.ai);
    expect(explicit.dependencies).toHaveBeenCalledOnce(); expect(mock.dependencies).not.toHaveBeenCalled();
    expect(liveEventsService.get).toHaveBeenCalledOnce(); expect(mock.get).not.toHaveBeenCalled(); expect(answer).toHaveBeenCalledOnce();
  });
  it("normalizes 24 browser messages before schema validation, retaining six and redacting decimal GPS", async () => {
    const mock = fixture(); setHostedRuntime(mock.host);
    const answer = vi.spyOn(smartAssistant, "answerSmartAssistant").mockResolvedValue({ mode: "deterministic", reply: "SYNTHETIC TEST", citations: [], model: null, reason: "TEST_ONLY" });
    const history = Array.from({ length: 24 }, (_, index) => ({ role: "user", text: `${index}: Я у 51.123456,71.123456` }));
    const response = await chat(request("chat", createSession().id, { text: "Лекции завтра", useAI: true, history }));
    expect(response.status).toBe(200);
    const input = answer.mock.calls[0][0];
    expect(input.history).toHaveLength(6); expect(input.history![0].text).toContain("18:");
    expect(JSON.stringify(input.history)).not.toContain("51.123456");
  });
  it("rejects oversized core with 413 before retrieval or AI dependencies", async () => {
    const mock = fixture(); setHostedRuntime(mock.host);
    const response = await chat(request("chat", createSession().id, { text: "Я".repeat(7500), useAI: true }));
    expect(response.status).toBe(413); expect((await response.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(mock.get).not.toHaveBeenCalled(); expect(mock.dependencies).not.toHaveBeenCalled();
  });
  it("serves hosted AI status with authentication, preserving explicit Sites status DI", async () => {
    const mock = fixture(), explicit = fixture(); setHostedRuntime(mock.host);
    expect((await status(request("assistant/status"))).status).toBe(401);
    const session = createSession();
    expect((await (await status(request("assistant/status", session.id))).json()).reason).toBe("API_KEY_MISSING");
    expect(mock.getStatus).toHaveBeenCalledWith(session.id);
    await handleAssistantStatus(request("assistant/status", session.id), explicit.host.ai);
    expect(explicit.getStatus).toHaveBeenCalledWith(session.id); expect(mock.getStatus).toHaveBeenCalledOnce();
  });
  it("uses hosted routing quota, but explicit Sites routing DI stays authoritative", async () => {
    const mock = fixture(); setHostedRuntime(mock.host);
    const session = createSession();
    const body = { provider: "fossgis_foot", consent: true, points: [{ lat: 51.1282, lon: 71.4304 }, { lat: 51.133, lon: 71.428 }] };
    expect((await routing(request("routing", session.id, body))).status).toBe(429);
    expect(mock.reserve).toHaveBeenCalledWith(session.id);
    const explicit = vi.fn(async () => false);
    expect((await handleRouting(request("routing", session.id, body), { reserve: explicit, publicEnabled: true })).status).toBe(429);
    expect(explicit).toHaveBeenCalledOnce(); expect(mock.reserve).toHaveBeenCalledOnce();
  });
  it("returns honest 503 if hosted event storage fails, without bypassing its lease", async () => {
    const mock = fixture(); mock.get.mockRejectedValue(new Error("private internal path")); setHostedRuntime(mock.host);
    const response = await events(request("events")); const body = await response.json();
    expect(response.status).toBe(503); expect(body).toMatchObject({ items: [], dataMode: "unavailable" });
    expect(JSON.stringify(body)).not.toContain("private internal"); expect(liveEventsService.get).not.toHaveBeenCalled();
  });
  it("keeps instrumentation idempotent and skips initialization outside VPS Node runtime", async () => {
    const mock = fixture();
    const initialize = vi.spyOn(vpsRuntime, "initializeVpsRuntime").mockImplementation(() => {
      setHostedRuntime(mock.host);
      return { ...mock.host, diagnostics: { ledgerReady: false, ledgerReason: "TEST_ONLY", baselinePlaces: 80, baselineOccurrences: 7, memoryPublic: false }, close: vi.fn() };
    });
    vi.stubEnv("NEXT_RUNTIME", "edge"); vi.stubEnv("QETTYQ_DEPLOYMENT", "vps");
    await register(); expect(initialize).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_RUNTIME", "nodejs"); setHostedRuntime(mock.host);
    await Promise.all([register(), register()]); expect(initialize).not.toHaveBeenCalled();
    setHostedRuntime(null);
    await Promise.all([register(), register()]); expect(initialize).toHaveBeenCalledOnce();
  });
});
