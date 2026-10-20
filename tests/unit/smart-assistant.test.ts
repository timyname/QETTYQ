import { afterEach, describe, expect, it, vi } from "vitest";
import { answerSmartAssistant, getSmartAssistantAvailability, type SmartAssistantDependencies, type SmartAssistantEnvironment, type SmartAssistantInput } from "../../src/server/pilot/smart-assistant";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import type { LiveAstanaEvent } from "../../src/server/ingestion/sxodim-live";
import type { EventEvidence } from "../../src/server/ingestion/event-evidence";

const env: SmartAssistantEnvironment = { NODE_ENV: "development", OPENAI_API_KEY: "unit-test-key-not-real", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_TEST_BUDGET_APPROVED: "true" };
const input: SmartAssistantInput = {
  text: "Хочу найти рок-концерт", context: pilotContextSchema.parse({ goal: "new", likedTags: ["rock"], origin: { lat: 51.1282, lon: 71.4304 } }),
  evidence: { items: [], events: [], reply: "В каталоге нет подтверждённых событий по этому запросу." },
};
function output(text = "Могу исследовать афишу. Не буду заменять рок другим жанром.", extra: Record<string, unknown> = {}) {
  return { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] }], ...extra };
}
function setup(payload: unknown = output()) {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
  const reserve = vi.fn().mockResolvedValue(true);
  const deps: SmartAssistantDependencies = { env, fetcher, executionScope: "local_test", quota: { reserve } };
  return { fetcher, reserve, deps };
}
afterEach(() => vi.useRealTimers());

describe("smart assistant opt-in local TEST adapter (mock fetch only)", () => {
  it("fails closed by default and never exposes a key in availability", async () => {
    expect(getSmartAssistantAvailability({})).toMatchObject({ configured: false, reason: "AI_DISABLED", model: "gpt-5.5" });
    const configured = getSmartAssistantAvailability(env);
    expect(configured.configured).toBe(true);
    expect(JSON.stringify(configured)).not.toContain(env.OPENAI_API_KEY);
    const { deps, fetcher } = setup();
    const result = await answerSmartAssistant(input, { ...deps, executionScope: undefined });
    expect(result).toMatchObject({ mode: "deterministic", reason: "LOCAL_TEST_SCOPE_REQUIRED", reply: input.evidence.reply, model: null, citations: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...env, NODE_ENV: "production" }, "PUBLIC_AI_DISABLED"],
    [{ ...env, QETTYQ_AI_ENABLED: "false" }, "AI_DISABLED"],
    [{ ...env, QETTYQ_AI_TEST_BUDGET_APPROVED: "false" }, "TEST_BUDGET_NOT_APPROVED"],
    [{ ...env, OPENAI_API_KEY: "" }, "API_KEY_MISSING"],
  ] as const)("enforces configuration gates without any network", async (config, reason) => {
    const { deps, fetcher, reserve } = setup();
    expect((await answerSmartAssistant(input, { ...deps, env: config })).reason).toBe(reason);
    expect(fetcher).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });

  it("requires successful quota reservation and never retries or refunds a failure", async () => {
    const { deps, reserve, fetcher } = setup();
    expect((await answerSmartAssistant(input, { ...deps, quota: undefined })).reason).toBe("QUOTA_RESERVATION_REQUIRED");
    reserve.mockResolvedValueOnce(false);
    expect((await answerSmartAssistant(input, deps)).reason).toBe("TEST_QUOTA_EXHAUSTED");
    expect(fetcher).not.toHaveBeenCalled();
    reserve.mockRejectedValueOnce(new Error("ledger offline"));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("QUOTA_UNAVAILABLE");
    fetcher.mockRejectedValueOnce(new Error("private provider error"));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("PROVIDER_UNAVAILABLE");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(reserve).toHaveBeenCalledTimes(3);
  });

  it("uses Responses web_search, requested model, bounded input/output/tools and store:false", async () => {
    const { deps, fetcher } = setup();
    const original = JSON.stringify(input);
    const result = await answerSmartAssistant(input, deps);
    expect(result).toMatchObject({ mode: "openai", model: "gpt-5.5", reason: null });
    const [url, init] = fetcher.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(body).toMatchObject({ model: "gpt-5.5", store: false, max_tool_calls: 2, max_output_tokens: 1200, tools: [{ type: "web_search", search_context_size: "low" }] });
    expect(body.instructions.length + body.input.length).toBeLessThanOrEqual(8000);
    expect(body.input).not.toContain("51.1282");
    expect(body.input).not.toContain("71.4304");
    expect(body.input).not.toContain('"origin"');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(input)).toBe(original);
    expect(result).not.toHaveProperty("items");
  });

  it("redacts free-text GPS, bounds recent history, and sends valid JSON not a truncated payload", async () => {
    const { deps, fetcher } = setup();
    await answerSmartAssistant({ ...input, text: "Я здесь 51.1282, 71.4304", history: Array.from({ length: 20 }, (_, i) => ({ role: "user" as const, text: `${i}: 51.1282,71.4304 ${"а".repeat(1000)}` })) }, deps);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    const payload = JSON.parse(body.input);
    expect(payload.history.length).toBeLessThanOrEqual(6);
    expect(body.instructions.length + body.input.length).toBeLessThanOrEqual(8000);
    expect(body.input).not.toMatch(/51\.1282|71\.4304/u);
    expect(body.input).toContain("координаты удалены");
  });

  it("preserves provider citation offsets and distinguishes web ideas from verified cards", async () => {
    const text = "Проверьте афишу организатора.";
    const { deps } = setup(output(text, { output: [
      { type: "web_search_call", status: "completed" },
      { type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [{ type: "url_citation", url: "https://sxodim.com/astana", title: "Афиша", start_index: 10, end_index: 15 }] }] },
    ] }));
    const result = await answerSmartAssistant(input, deps);
    expect(result.mode).toBe("openai");
    expect(result.citations).toEqual([{ url: "https://sxodim.com/astana", title: "Афиша", startIndex: 10, endIndex: 15 }]);
    expect(result.reply.slice(10, 15)).toBe(text.slice(10, 15));
    expect(result.reply).toContain("не подтверждённые карточки и не бронь");
  });

  it.each(["javascript:alert(1)", "http://example.com/", "https://127.0.0.1/", "https://localhost/", "https://x.local/", "https://user:secret@example.com/"])("rejects unsafe citation %s and does not fetch it", async url => {
    const { deps, fetcher } = setup(output("Проверить источник", { output: [
      { type: "web_search_call" }, { type: "message", role: "assistant", content: [{ type: "output_text", text: "Проверить источник", annotations: [{ type: "url_citation", url, start_index: 0, end_index: 5 }] }] },
    ] }));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("WEB_CITATIONS_MISSING");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(["Билет стоит 1200 ₸", "Начало 19:00", "Приходите 2026-10-23", "Координаты 51.1282,71.4304", "Билеты точно есть", "Я забронировал для вас", "id: invented-event"])("falls back on unsafe generated facts: %s", async text => {
    const { deps } = setup(output(text));
    const result = await answerSmartAssistant(input, deps);
    expect(result).toMatchObject({ mode: "deterministic", reason: "UNSAFE_OR_UNGROUNDED_REPLY", reply: input.evidence.reply });
  });

  it("handles quota, malformed responses, refusal, rate limiting and incomplete output honestly", async () => {
    for (const payload of [{ status: "incomplete", output: [] }, output("", { error: { message: "private" } }), output("", { output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "No" }] }] })]) {
      expect((await answerSmartAssistant(input, setup(payload).deps)).mode).toBe("deterministic");
    }
    const { deps, fetcher } = setup();
    fetcher.mockResolvedValueOnce(new Response("secret provider body", { status: 429 }));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("PROVIDER_RATE_LIMIT");
    fetcher.mockResolvedValueOnce(new Response("not json"));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("PROVIDER_UNAVAILABLE");
  });

  it("aborts a hanging provider at twenty seconds, with no retry", async () => {
    vi.useFakeTimers();
    const { deps, fetcher } = setup();
    fetcher.mockImplementation((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })));
    const result = answerSmartAssistant(input, deps);
    await vi.advanceTimersByTimeAsync(20_000);
    expect((await result).reason).toBe("PROVIDER_TIMEOUT");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

function publicSetup(payload: unknown = output(JSON.stringify({ intent: "advice", evidenceIds: [], message: "Помогу выбрать по вашим интересам." }), {
  model: "gpt-5.5-2026-04-23", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 },
})) {
  const initial = setup(payload);
  const complete = vi.fn().mockResolvedValue(true);
  const deps: SmartAssistantDependencies = {
    ...initial.deps, executionScope: "public",
    env: { ...env, NODE_ENV: "production", QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true" },
    quota: { kind: "durable_public", reserve: initial.reserve, complete },
  };
  return { ...initial, deps, complete };
}

describe("bounded public assistant, source-evidence RAG without hosted tools", () => {
  it("requires separate public approval and a durable accounting callback, not the local test approval", async () => {
    const { deps, fetcher } = publicSetup();
    expect((await answerSmartAssistant(input, { ...deps, env: { ...deps.env, QETTYQ_AI_PUBLIC_ENABLED: undefined } })).reason).toBe("PUBLIC_AI_DISABLED");
    expect((await answerSmartAssistant(input, { ...deps, env: { ...deps.env, QETTYQ_AI_PUBLIC_BUDGET_APPROVED: undefined } })).reason).toBe("PUBLIC_BUDGET_NOT_APPROVED");
    expect((await answerSmartAssistant(input, { ...deps, quota: { reserve: async () => true } })).reason).toBe("DURABLE_PUBLIC_QUOTA_REQUIRED");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses one plain Responses request, standard tier, no hosted tools or hidden conversation", async () => {
    const { deps, fetcher, complete } = publicSetup();
    expect((await answerSmartAssistant(input, deps)).mode).toBe("openai");
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ model: "gpt-5.5", service_tier: "default", tools: [], tool_choice: "none", store: false, max_output_tokens: 1200, truncation: "disabled" });
    expect(body).not.toHaveProperty("previous_response_id");
    expect(body).not.toHaveProperty("conversation");
    expect(body).not.toHaveProperty("background");
    expect(body).not.toHaveProperty("max_tool_calls");
    expect(body.instructions).toContain("Веб-поиск и другие инструменты у тебя выключены");
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true, name: "qettyq_public_guidance" });
    expect(new TextEncoder().encode(body.instructions + body.input + JSON.stringify(body.text.format)).byteLength).toBeLessThanOrEqual(8000);
    expect(complete).toHaveBeenCalledExactlyOnceWith({ model: "gpt-5.5-2026-04-23", serviceTier: "default", inputTokens: 1400, outputTokens: 100, toolCalls: 0 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("bounds UTF-8 input, including Cyrillic history, not only JS string length", async () => {
    const { deps, fetcher } = publicSetup();
    await answerSmartAssistant({ ...input, text: "Куда сходить? " + "🎭".repeat(500), history: Array.from({ length: 20 }, () => ({ role: "user" as const, text: "Люблю театр 🎭 ".repeat(100) })) }, deps);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(new TextEncoder().encode(body.instructions + body.input).byteLength).toBeLessThanOrEqual(8000);
    expect(JSON.parse(body.input).context).not.toHaveProperty("origin");
  });

  it("keeps quota refusals network-free, and never refunds/resends uncertain calls", async () => {
    const { deps, fetcher, reserve, complete } = publicSetup();
    reserve.mockResolvedValueOnce(false);
    expect((await answerSmartAssistant(input, deps)).reason).toBe("PUBLIC_BUDGET_UNAVAILABLE");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRejectedValueOnce(new Error("private provider failure"));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("PROVIDER_UNAVAILABLE");
    expect(complete).toHaveBeenCalledExactlyOnceWith(null);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not show AI output if durable accounting cannot confirm the request bounds", async () => {
    const { deps, complete } = publicSetup();
    complete.mockResolvedValue(false);
    expect((await answerSmartAssistant(input, deps))).toMatchObject({ mode: "deterministic", reason: "PUBLIC_ACCOUNTING_BLOCKED", reply: input.evidence.reply });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("cites only incoming server evidence and preserves its freshness/unknowns without inventing organizer identity", async () => {
    const event: LiveAstanaEvent = {
      id: "synthetic_test:event", name: "SYNTHETIC TEST рок-концерт", cityId: "astana", category: "Концерты", venueName: null, address: null, lat: null, lon: null,
      startsAt: "2026-10-23T15:00:00Z", endsAt: null, timeZone: "Asia/Almaty", durationMinutes: null, contentLanguage: "und", priceFromKzt: null,
      price: { kind: "unknown", minMinor: null, currency: null, basis: "unknown" }, status: "scheduled", availability: "unknown", bookingUrl: null,
      contactUrl: "https://sxodim.com/astana/event/synthetic-test", image: null, requiredCredit: { text: "Давай Сходим", url: "https://sxodim.com" }, fetchedAt: "2026-10-20T12:00:00Z",
      provenance: { sourceId: "sxodim-astana-noncommercial", sourceUrl: "https://sxodim.com/astana/event/synthetic-test", parserVersion: "sxodim-jsonld-v1", scheduleQuality: "observed", priceQuality: "unknown" }, warnings: ["SYNTHETIC_TEST_ONLY"],
    };
    const evidence: EventEvidence = { id: "evidence:synthetic", eventId: event.id, name: event.name, startsAt: event.startsAt, endsAt: null, price: event.price, sourceUrl: event.provenance.sourceUrl, organizerUrl: "https://organizer.example/synthetic", fetchedAt: event.fetchedAt, dataMode: "snapshot", freshness: "stale", requiredCredit: event.requiredCredit, unknowns: ["PRICE_UNKNOWN", "ROUTE_NOT_CHECKED"] };
    const request = { ...input, evidence: { ...input.evidence, events: [event], eventEvidence: [evidence] } };
    const original = JSON.stringify(request);
    const { deps, fetcher } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: [event.id], message: "Предлагаю сравнить выбранные карточки. Какой формат вам ближе?" }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    const result = await answerSmartAssistant(request, deps);
    expect(result.citations.map(item => item.url)).toEqual([evidence.sourceUrl, evidence.organizerUrl]);
    expect(result.citations[0].title).toContain("Источник афиши");
    expect(result.citations[1].title).toContain("Организатор");
    const payload = JSON.parse(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).input);
    expect(payload.evidence.events[0]).toMatchObject({ dataMode: "snapshot", freshness: "stale", unknowns: ["PRICE_UNKNOWN", "ROUTE_NOT_CHECKED"] });
    expect(JSON.stringify(request)).toBe(original);
  });

  it.each(["Для неспешного свидания я бы выбрал прогулку. Сравним карточки?", "A walk could be a nice starting point. Prefer something different?", "Серуеннен бастасақ қайтеді? Бірге таңдайық."])("does not reject safe guidance based on arbitrary sentence starters: %s", async message => {
    const { deps } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: [], message }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect(await answerSmartAssistant(input, deps)).toMatchObject({ mode: "openai", reply: message });
  });

  it("does not accept generated public links as trusted source citations", async () => {
    const { deps } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: [], message: "Проверьте https://invented.example/event" }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect((await answerSmartAssistant(input, deps)).reason).toBe("UNSAFE_OR_UNGROUNDED_REPLY");
  });

  it.each(["Давай начнём с прогулки. Хочешь сравнить варианты?", "Sounds good. Shall we compare the options?", "Жақсы ой. Бастайық?"])("accepts natural guidance without forcing identical boilerplate: %s", async message => {
    const { deps } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: [], message }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect(await answerSmartAssistant(input, deps)).toMatchObject({ mode: "openai", reply: message, citations: [] });
  });

  it.each(["Предлагаю выбрать один из парков.", "Да, давай сравним варианты.", "Отлично, давай сравним варианты.", "Например, можно сравнить варианты в Астане."])("does not confuse Russian park inflection or known-city guidance with parking/factual claims: %s", async message => {
    const { deps } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: [], message }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect(await answerSmartAssistant(input, deps)).toMatchObject({ mode: "openai", reply: message, citations: [] });
  });

  it.each(["Предлагаю кафе, там есть парковка.", "Проверьте паркинг, он доступен."])("still rejects unsupported parking assertions: %s", async message => {
    const { deps } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: [], message }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect(await answerSmartAssistant(input, deps)).toMatchObject({ mode: "deterministic", reason: "UNSAFE_OR_UNGROUNDED_REPLY", validationReason: "UNVERIFIED_FACTS" });
  });

  it.each([
    "Событие бесплатное, проходит на русском языке.", "В кафе есть розетки.",
    "Вы точно успеете посетить событие и вернуться домой.", "Событие состоится завтра вечером.",
    "Билет стоит три тысячи тенге.", "Вход свободный.",
    "Предлагаю сходить на «Лунный фестиваль».", "Предлагаю посетить Небесный Портал.",
    "Проверьте афишу, событие бесплатное.", "Предлагаю кафе, там есть wi-fi.",
    "Please note tickets are available.", "I suggest the free event.",
    "Қандай шара ұнайды? Кіру тегін.",
  ])("never lends trusted citation proof to invented public facts: %s", async message => {
    const selected = { ...input, evidence: { ...input.evidence, items: [{ id: "synthetic_test:unknown", name: "SYNTHETIC TEST кафе", category: "cafe", price: null, sourceUrl: "https://source.example/unknown" }] } };
    const { deps } = publicSetup(output(JSON.stringify({ intent: "advice", evidenceIds: ["synthetic_test:unknown"], message }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect(await answerSmartAssistant(selected, deps)).toMatchObject({ mode: "deterministic", reason: "UNSAFE_OR_UNGROUNDED_REPLY", citations: [] });
  });

  it("keeps natural topic clarification generative without attaching unrelated source URLs", async () => {
    const message = "Давайте сначала определим настроение. Какой формат вам ближе — музыка или прогулка?";
    const { deps } = publicSetup(output(JSON.stringify({ intent: "clarify", evidenceIds: [], message }), { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
    expect(await answerSmartAssistant(input, deps)).toMatchObject({ mode: "openai", reply: message, citations: [] });
  });

  it("rejects malformed structured output and invented evidence IDs", async () => {
    for (const text of ["Помогу выбрать.", JSON.stringify({ intent: "advice", evidenceIds: ["invented"], message: "Предлагаю сравнить варианты." }), JSON.stringify({ intent: "advice", evidenceIds: [], message: "Помогу выбрать.", extra: "not allowed" })]) {
      const { deps } = publicSetup(output(text, { model: "gpt-5.5", service_tier: "default", usage: { input_tokens: 1400, output_tokens: 100 } }));
      expect((await answerSmartAssistant(input, deps)).reason).toBe("UNSAFE_OR_UNGROUNDED_REPLY");
    }
  });
});
