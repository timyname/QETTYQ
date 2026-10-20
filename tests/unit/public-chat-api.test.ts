import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleChat } from "../../src/app/api/chat/route";
import { handleAssistantStatus } from "../../src/app/api/assistant/status/route";
import { createSession, resetSessionStoreForTests } from "../../src/server/session/store";
import { liveEventsService, type LiveEventsResult } from "../../src/server/ingestion/live-events";
import { createPublicAIRuntime, type PublicAIRuntime } from "../../src/server/pilot/public-ai-runtime";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import type { SmartAssistantDependencies } from "../../src/server/pilot/smart-assistant";
import { setGooglePlacesRuntime } from "../../src/server/pilot/google-places";

const clock = Date.parse("2026-10-20T12:00:00Z");
const context = pilotContextSchema.parse({ origin: { lat: 51.123456, lon: 71.654321 } });
const sourceUrl = "https://sxodim.com/astana/event/synthetic-public-api-test";
const publicEnv = { NODE_ENV: "production", OPENAI_API_KEY: "synthetic-offline-placeholder", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true" };
function snapshot(): LiveEventsResult {
  return { dataMode: "snapshot", freshness: "stale", cacheStatus: "stale-fallback", fetchedAt: "2026-10-20T10:00:00Z", expiresAt: "2026-10-20T11:00:00Z", source: null, coverage: null, warnings: ["SYNTHETIC STALE SOURCE"], items: [{ id: "synthetic-public", name: "SYNTHETIC TEST · лекция", category: "Образование", cityId: "astana", venueName: null, address: null, lat: null, lon: null, startsAt: "2026-10-21T13:00:00Z", endsAt: null, timeZone: "Asia/Almaty", durationMinutes: null, contentLanguage: "und", priceFromKzt: null, price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" }, status: "scheduled", availability: "unknown", bookingUrl: null, contactUrl: sourceUrl, organizerUrl: null, image: null, requiredCredit: { text: "Давай Сходим", url: sourceUrl }, fetchedAt: "2026-10-20T10:00:00Z", provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl, parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" }, warnings: ["PRICE_UNKNOWN", "DURATION_UNKNOWN"] }] };
}
function runtime(reply = "Предлагаю сравнить варианты из карточек. Уточните условия у организатора.") {
  const reserve = vi.fn(async () => true), complete = vi.fn(async () => true);
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    const outbound = JSON.parse(String(init?.body));
    const payload = JSON.parse(outbound.input);
    if (outbound.text?.format?.name === "qettyq_intent") return Response.json({ status: "completed", model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1000, output_tokens: 100 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({ intent: "events", query: "Лекции в Астане", cuisineOrDish: null }) }] }] });
    const evidenceIds = payload.evidence.events.map((event: { id: string }) => event.id);
    return Response.json({ status: "completed", model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1000, output_tokens: 100 }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: JSON.stringify({ intent: "advice", evidenceIds, message: reply }) }] }] });
  });
  const dependencies = vi.fn<PublicAIRuntime["dependencies"]>((): SmartAssistantDependencies => ({ executionScope: "public", env: publicEnv, fetcher, quota: { kind: "durable_public", reserve, complete } }));
  const getStatus = vi.fn<PublicAIRuntime["getStatus"]>(async () => ({ available: false, reason: "PUBLIC_SESSION_COOLDOWN", configured: true, localTestOnly: false, hostedWebSearch: false, retrievalMode: "source_evidence" as const, model: "gpt-5.5" as const, remainingCalls: 19, capMicroUsd: 10000000, reservedMicroUsd: 500000, reservationMicroUsd: 500000 }));
  return { adapter: { dependencies, getStatus } satisfies PublicAIRuntime, dependencies, getStatus, reserve, complete, fetcher };
}
function request(session: string, body: unknown, headers = {}) {
  return new Request("https://qettyq.example/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-qettyq-session": session, ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => { resetSessionStoreForTests(); vi.spyOn(Date, "now").mockReturnValue(clock); vi.spyOn(liveEventsService, "get").mockResolvedValue(snapshot()); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); setGooglePlacesRuntime(null); resetSessionStoreForTests(); });

describe("public chat route integration (offline synthetic provider, never paid)", () => {
  it("does not spend Google budget or bypass strict unknown prices for food discovery", async () => {
    const search = vi.fn(); setGooglePlacesRuntime({ search });
    const result = await (await handleChat(request(createSession().id, { text: "Хочу рамен бесплатно", googleConsent: true, useAI: false, context }))).json();
    expect(result.items).toEqual([]); expect(result.googlePlaces.reason).toBe("GOOGLE_PRICE_NOT_VERIFIED");
    expect(result.googlePlaces.items).toEqual([]); expect(search).not.toHaveBeenCalled();
  });
  it.each([{}, { useAI: false }]) ("does not reserve or contact the provider without explicit useAI=true: %j", async consent => {
    const mock = runtime();
    const response = await handleChat(request(createSession().id, { text: "Лекции завтра", context, ...consent }), mock.adapter);
    const result = await response.json();
    expect(response.status).toBe(200); expect(result.mode).toBe("deterministic");
    expect(mock.dependencies).not.toHaveBeenCalled(); expect(mock.reserve).not.toHaveBeenCalled(); expect(mock.fetcher).not.toHaveBeenCalled();
  });
  it("enriches public AI with server evidence, preserving stale facts and trusted source citations", async () => {
    const mock = runtime(), session = createSession();
    const response = await handleChat(request(session.id, { text: "Лекции завтра", useAI: true, context }), mock.adapter);
    const result = await response.json();
    expect(result.mode).toBe("openai"); expect(result.generationMode).toBe("openai");
    expect(result.dataMode).toBe("snapshot"); expect(result.eventsMeta.freshness).toBe("stale");
    expect(result.eventEvidence[0]).toMatchObject({ sourceUrl, organizerUrl: null, dataMode: "snapshot", freshness: "stale", fetchedAt: "2026-10-20T10:00:00Z" });
    expect(result.events[0].price.minMinor).toBeNull(); expect(result.events[0].contentLanguage).toBe("und");
    expect(result.citations).toEqual([{ url: sourceUrl, title: "Источник афиши · SYNTHETIC TEST · лекция" }]);
    expect(result.warnings).toContain("SYNTHETIC STALE SOURCE");
    expect(mock.dependencies.mock.calls[0][0]).toBe(session.id);
    expect(mock.reserve).toHaveBeenCalledOnce(); expect(mock.fetcher).toHaveBeenCalledTimes(2); expect(mock.complete).toHaveBeenCalledOnce();
    const requests = mock.fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(requests.map(body => body.max_output_tokens)).toEqual([400, 800]);
    expect(requests.reduce((total, body) => total + body.max_output_tokens, 0)).toBe(1200);
    expect(mock.complete).toHaveBeenCalledWith(expect.objectContaining({ inputTokens: 2000, outputTokens: 200, toolCalls: 0, serviceTier: "default" }));
    for (const body of requests) {
      expect(body.tools).toEqual([]); expect(body.tool_choice).toBe("none"); expect(body.store).toBe(false);
      expect(body.input).not.toContain("51.123456"); expect(body.input).not.toContain("71.654321");
    }
    const outbound = requests[1];
    expect(outbound.input).toContain('"freshness":"stale"');
    expect(JSON.stringify(result)).not.toContain("synthetic-offline-placeholder");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("does not call the provider during a durable reservation cooldown and returns the reason", async () => {
    const mock = runtime(); mock.reserve.mockResolvedValue(false);
    mock.dependencies.mockImplementation(() => ({ executionScope: "public", env: publicEnv, fetcher: mock.fetcher, quota: { kind: "durable_public", reserve: mock.reserve, complete: mock.complete, reason: () => "PUBLIC_SESSION_COOLDOWN" } }));
    const result = await (await handleChat(request(createSession().id, { text: "Лекции завтра", useAI: true, context }), mock.adapter)).json();
    expect(result.mode).toBe("deterministic"); expect(result.reason).toBe("PUBLIC_SESSION_COOLDOWN");
    expect(result.events).toHaveLength(1); expect(mock.fetcher).not.toHaveBeenCalled(); expect(mock.complete).not.toHaveBeenCalled();
  });
  it("fails closed without durable public storage, even with configured public flags", async () => {
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    const adapter = createPublicAIRuntime(publicEnv);
    const result = await (await handleChat(request(createSession().id, { text: "Лекции завтра", useAI: true, context }), adapter)).json();
    expect(result.mode).toBe("deterministic"); expect(result.reason).toBe("PUBLIC_BUDGET_STORAGE_UNAVAILABLE"); expect(network).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("blocks cross-site or missing session before retrieval and provider work", async () => {
    const mock = runtime();
    const crossSite = await handleChat(request(createSession().id, { text: "Лекции завтра", useAI: true }, { origin: "https://other.example", "sec-fetch-site": "cross-site" }), mock.adapter);
    const anonymous = await handleChat(request("missing-session", { text: "Лекции завтра", useAI: true }), mock.adapter);
    expect(crossSite.status).toBe(403); expect(anonymous.status).toBe(401);
    expect(liveEventsService.get).not.toHaveBeenCalled(); expect(mock.dependencies).not.toHaveBeenCalled();
  });
  it("excludes unknown prices under explicit strict budget before public AI receives cards", async () => {
    const mock = runtime();
    const result = await (await handleChat(request(createSession().id, { text: "Лекции завтра до 3 000 ₸", useAI: true, context }), mock.adapter)).json();
    expect(result.events).toEqual([]); expect(result.eventEvidence).toEqual([]); expect(result.citations).toEqual([]);
    expect(result.proposedContext).toMatchObject({ budget: 3000, strictBudget: true });
    const outbound = JSON.parse(String(mock.fetcher.mock.calls[1][1]?.body));
    expect(JSON.parse(outbound.input).evidence.events).toEqual([]);
  });
  it("preserves original rock/date constraints despite a broad planner search, and never fabricates missing matches", async () => {
    const mock = runtime();
    const response = await handleChat(request(createSession().id, { text: "Рок концерты сегодня", useAI: true, context: { ...context, goal: "new", likedTags: ["rock", "live_music"] } }), mock.adapter);
    const result = await response.json();
    expect(result.events).toEqual([]); expect(result.eventEvidence).toEqual([]); expect(result.citations).toEqual([]);
    expect(result.proposedContext.likedTags).toEqual(["rock", "live_music"]);
    const outbound = JSON.parse(String(mock.fetcher.mock.calls[1][1]?.body));
    expect(JSON.parse(outbound.input).evidence.events).toEqual([]);
  });
  it("never sends a source's facts to the model when its independent LLM policy denies transfer", async () => {
    const mock = runtime();
    const result = await (await handleChat(request(createSession().id, { text: "Лекции завтра", useAI: true, context }), mock.adapter,
      { get: async () => snapshot(), canSendToLlm: () => false })).json();
    expect(result.events).toHaveLength(1); // Display rights and LLM rights are independent.
    const outbound = JSON.parse(String(mock.fetcher.mock.calls[1][1]?.body));
    const evidence = JSON.parse(outbound.input).evidence;
    expect(evidence.items).toEqual([]); expect(evidence.events).toEqual([]); expect(result.citations).toEqual([]);
    expect(evidence.reply).not.toMatch(/SYNTHETIC|В афише|нашёл|окт|событи|\d/u);
  });
  it.each(["Событие бесплатное, проходит на русском языке.", "В кафе есть розетки.", "Предлагаю вход свободный.", "Вы точно успеете посетить событие и вернуться домой.", "Событие состоится завтра вечером.", "Билет стоит три тысячи тенге."]) ("rejects unsupported generated facts even when source citations exist: %s", async unsafe => {
    const mock = runtime(unsafe);
    const result = await (await handleChat(request(createSession().id, { text: "Лекции завтра", useAI: true, context }), mock.adapter)).json();
    expect(result.mode).toBe("deterministic"); expect(result.reason).toBe("UNSAFE_OR_UNGROUNDED_REPLY");
    expect(result.reply).not.toBe(unsafe); expect(result.citations).toEqual([]);
    expect(mock.reserve).toHaveBeenCalledOnce(); expect(mock.complete).toHaveBeenCalledOnce();
  });
});

describe("public assistant status route (offline)", () => {
  it("requires a session and preserves public cooldown/no-hosted-search status", async () => {
    const mock = runtime();
    const missing = await handleAssistantStatus(new Request("https://qettyq.example/api/assistant/status"), mock.adapter);
    expect(missing.status).toBe(401); expect(mock.getStatus).not.toHaveBeenCalled();
    const session = createSession();
    const response = await handleAssistantStatus(new Request("https://qettyq.example/api/assistant/status", { headers: { "x-qettyq-session": session.id } }), mock.adapter);
    const body = await response.json();
    expect(mock.getStatus).toHaveBeenCalledWith(session.id);
    expect(body).toMatchObject({ available: false, reason: "PUBLIC_SESSION_COOLDOWN", localTestOnly: false, hostedWebSearch: false, retrievalMode: "source_evidence" });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
