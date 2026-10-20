import { describe, expect, it, vi } from "vitest";
import { answerReasonedAssistant } from "../../src/server/pilot/reasoned-assistant";
import { pilotContextSchema } from "../../src/server/pilot/contracts";
import type { SmartAssistantDependencies } from "../../src/server/pilot/smart-assistant";
import { requestedFoodMatch } from "../../src/server/pilot/food-search";
import { localizedClarification, localizedSearchReply } from "../../src/server/pilot/chat-language";
import { searchPilotPlaces } from "../../src/server/pilot/catalog";
import type { Place } from "../../src/domain/types";
const env = { NODE_ENV: "production", OPENAI_API_KEY: "unit-test-not-a-key", QETTYQ_AI_ENABLED: "true", QETTYQ_AI_PUBLIC_ENABLED: "true", QETTYQ_AI_PUBLIC_BUDGET_APPROVED: "true" };
const input = { text: "Хочу рамен", context: pilotContextSchema.parse({ budget: 3000, strictBudget: true }), history: [], language: "ru" as const };
const json = (text: string, tokens = 100) => new Response(JSON.stringify({ model: "gpt-5.5", service_tier: "default", status: "completed", usage: { input_tokens: 400, output_tokens: tokens }, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] }));
function setup() {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(json(JSON.stringify({ intent: "food", query: "Рамен в Астане", cuisineOrDish: "рамен" })))
    .mockResolvedValueOnce(json(JSON.stringify({ intent: "advice", message: "Предлагаю уточнить кухню и проверить меню.", evidenceIds: [] }), 200));
  const reserve = vi.fn().mockResolvedValue(true), complete = vi.fn().mockResolvedValue(true);
  const deps: SmartAssistantDependencies = { env, executionScope: "public", fetcher, quota: { kind: "durable_public", reserve, complete } };
  const retrieve = vi.fn().mockResolvedValue({ reply: "Нет подтверждённого меню", items: [], events: [] });
  return { deps, fetcher, reserve, complete, retrieve };
}
describe("bounded internal plan -> retrieval -> answer (all provider responses synthetic)", () => {
  it("understands food, makes two bounded calls under ONE original reservation and accounts aggregate usage", async () => {
    const state = setup(); const result = await answerReasonedAssistant(input, state.deps, state.retrieve);
    expect(result.assistant).toMatchObject({ mode: "openai", model: "gpt-5.5" });
    expect(state.retrieve).toHaveBeenCalledWith({ intent: "food", query: "Рамен в Астане", cuisineOrDish: "рамен" });
    expect(state.reserve).toHaveBeenCalledTimes(1); expect(state.fetcher).toHaveBeenCalledTimes(2);
    expect(state.complete).toHaveBeenCalledExactlyOnceWith({ model: "gpt-5.5", serviceTier: "default", inputTokens: 800, outputTokens: 300, toolCalls: 0 });
    const calls = state.fetcher.mock.calls.map(call => JSON.parse(String(call[1]?.body)));
    expect(calls.map(body => body.max_output_tokens)).toEqual([400, 800]);
    for (const body of calls) { expect(body.tools).toEqual([]); expect(body.store).toBe(false); expect(body).not.toHaveProperty("previous_response_id"); }
  });
  it("does not call provider without durable cap and does not retry failed planner", async () => {
    const state = setup(); state.reserve.mockResolvedValueOnce(false);
    expect((await answerReasonedAssistant(input, state.deps, state.retrieve)).assistant.mode).toBe("deterministic"); expect(state.fetcher).not.toHaveBeenCalled();
    state.fetcher.mockReset().mockRejectedValue(new Error("private provider error"));
    await answerReasonedAssistant(input, state.deps, state.retrieve);
    expect(state.fetcher).toHaveBeenCalledTimes(1); expect(state.complete).toHaveBeenCalledWith(null); expect(state.retrieve).not.toHaveBeenCalled();
  });
  it.each(["51.12345,71.45678", "51,123456 71,654321", "+51.12 +71,45"])("keeps constraints and omits coordinate syntax %s from planner/history", async coordinates => {
    const state = setup(); await answerReasonedAssistant({ ...input, context: { ...input.context, likedTags: [coordinates] }, text: `Я здесь ${coordinates}. Хочу рамен`, history: [{ role: "user", text: coordinates }] }, state.deps, state.retrieve);
    const body = JSON.parse(String(state.fetcher.mock.calls[0][1]?.body));
    expect(body.input).not.toMatch(/51[.,]\d|71[.,]\d/); expect(JSON.parse(body.input).context).toMatchObject({ budget: 3000 });
    expect(JSON.stringify(input.context)).toContain('"strictBudget":true');
  });
  it("never substitutes random food for a cuisine/dish and does not assert menu availability", () => {
    expect(requestedFoodMatch({ name: "SYNTHETIC TEST Italian", tags: ["food", "italian"] }, "Хочу рамен", "рамен")).toBe(false);
    expect(requestedFoodMatch({ name: "SYNTHETIC TEST", tags: ["food", "japanese"] }, "Хочу рамен", "рамен")).toBe(true);
    expect(requestedFoodMatch({ name: "SYNTHETIC TEST", tags: ["food"] }, "Хочу шурпу", "шурпа")).toBe(false);
    expect(requestedFoodMatch({ name: "SYNTHETIC TEST", tags: ["food", "coffee"] }, "Хочу поесть без кофе")).toBe(false);
  });
  it("filters cuisine before ranking and top-three truncation", () => {
    const places = Array.from({ length: 5 }, (_, index) => ({ id: `synthetic-${index}`, name: `SYNTHETIC TEST ${index}`, category: "restaurant", tags: ["food", index === 4 ? "japanese" : "italian"], cuisines: [], lat: 51.1, lon: 71.4, address: null, price: null, durationMinutes: 30, sourceUrl: "https://www.openstreetmap.org/", retrievedAt: new Date().toISOString() })) as unknown as Place[];
    const pool = places.filter(place => requestedFoodMatch(place, "рамен"));
    expect(searchPilotPlaces({ ...input.context, goal: "food" }, "рамен", pool).map(place => place.id)).toEqual([]); // strict unknown price still wins
    expect(searchPilotPlaces({ ...input.context, goal: "food", strictBudget: false }, "рамен", pool).map(place => place.id)).toEqual(["synthetic-4"]);
  });
  it.each([
    ["en", "I suggest comparing the cards. Please check the menu with the venue."],
    ["kk", "Ұсынамын: карточкаларды салыстырыңыз. Нақтылаңыз: қандай асүйді қалайсыз?"],
  ] as const)("accepts grounded advice in selected language %s", async (language, message) => {
    const state = setup(); state.fetcher.mockReset()
      .mockResolvedValueOnce(json(JSON.stringify({ intent: "food", query: "Рамен", cuisineOrDish: "рамен" })))
      .mockResolvedValueOnce(json(JSON.stringify({ intent: "advice", message, evidenceIds: [] }), 200));
    const result = await answerReasonedAssistant({ ...input, language }, state.deps, state.retrieve);
    expect(result.assistant.mode).toBe("openai"); expect(result.assistant.reply).toBe(message);
    const outbound = JSON.parse(String(state.fetcher.mock.calls[1][1]?.body));
    expect(outbound.instructions).toContain(language === "en" ? "английском" : "казахском");
  });
  it("keeps fallback counts truthful after cuisine filtering and provides a real conversational clarification", () => {
    expect(localizedSearchReply("ru", { reply: "Нашёл 3 места по выбранной категории.", items: [{}], events: [] })).toBe("Нашёл 1 место по выбранной категории.");
    expect(localizedSearchReply("ru", { reply: "Нашёл 3 места по выбранной категории.", items: [], events: [] })).not.toContain("Нашёл 3");
    expect(localizedClarification("en")).toContain("What would you like");
  });
});
