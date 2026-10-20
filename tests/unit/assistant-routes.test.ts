import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as chat } from "../../src/app/api/chat/route";
import { GET as status } from "../../src/app/api/assistant/status/route";
import { POST as openSession } from "../../src/app/api/session/route";
import { answerSmartAssistant } from "../../src/server/pilot/smart-assistant";
import { reserveLocalAITestCall } from "../../src/server/pilot/ai-test-quota";
import { resetSessionStoreForTests } from "../../src/server/session/store";

vi.mock("../../src/server/pilot/smart-assistant", async importOriginal => ({ ...await importOriginal<typeof import("../../src/server/pilot/smart-assistant")>(), answerSmartAssistant: vi.fn() }));
vi.mock("../../src/server/pilot/ai-test-quota", async importOriginal => ({ ...await importOriginal<typeof import("../../src/server/pilot/ai-test-quota")>(), reserveLocalAITestCall: vi.fn().mockResolvedValue(true) }));

function request(body: unknown, cookie = "") {
  return new Request("http://127.0.0.1:3000/api/chat", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
}
async function cookie() {
  const result = await openSession(new Request("http://127.0.0.1:3000/api/session", { method: "POST" }));
  return result.headers.get("set-cookie")!.split(";", 1)[0];
}
beforeEach(() => {
  resetSessionStoreForTests(); vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("OPENAI_API_KEY", "unit-only-fake-key");
  vi.stubEnv("QETTYQ_AI_ENABLED", "true"); vi.stubEnv("QETTYQ_AI_TEST_BUDGET_APPROVED", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("assistant routes with mocked adapter, no live provider calls", () => {
  it("keeps AI opt-in and existing deterministic cards unchanged", async () => {
    const response = await chat(request({ text: "Хочу кофе" }, await cookie()));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result).toMatchObject({ mode: "deterministic", generationMode: "deterministic", reason: "AI_NOT_REQUESTED", model: null, citations: [] });
    expect(result.items.length).toBeGreaterThan(0);
    expect(vi.mocked(answerSmartAssistant)).not.toHaveBeenCalled();
    expect(vi.mocked(reserveLocalAITestCall)).not.toHaveBeenCalled();
  });

  it("adds a genuine adapter answer without allowing it to replace code-validated cards", async () => {
    const auth = await cookie();
    const base = await (await chat(request({ text: "Хочу кофе" }, auth))).json();
    vi.mocked(answerSmartAssistant).mockImplementationOnce(async (input, deps) => {
      expect(await deps!.quota!.reserve()).toBe(true);
      expect(input.evidence.items.map(item => item.id)).toEqual(base.items.map((item: { id: string }) => item.id));
      expect(input.history).toEqual([{ role: "user", text: "Люблю тихие места" }]);
      return { mode: "openai", reply: "Могу помочь уточнить атмосферу.", citations: [{ url: "https://sxodim.com/astana", title: "Афиша" }], model: "gpt-5.5", reason: null };
    });
    const result = await (await chat(request({ text: "Хочу кофе", useAI: true, history: [{ role: "user", text: "Люблю тихие места" }] }, auth))).json();
    expect(result).toMatchObject({ mode: "openai", generationMode: "openai", model: "gpt-5.5", reply: "Могу помочь уточнить атмосферу." });
    expect(result.items).toEqual(base.items);
    expect(result.events).toEqual(base.events);
    expect(result.proposedContext).toEqual(base.proposedContext);
    expect(result.citations).toHaveLength(1);
    expect(result.warnings.some((warning: string) => warning.startsWith("Без внешнего AI:"))).toBe(false);
    expect(vi.mocked(reserveLocalAITestCall)).toHaveBeenCalledTimes(1);
  });

  it.each([["production", "PUBLIC_AI_DISABLED"], ["development", "API_KEY_MISSING"]])("keeps disabled public/missing-key requests deterministic", async (nodeEnv, reason) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    if (reason === "API_KEY_MISSING") vi.stubEnv("OPENAI_API_KEY", "");
    const result = await (await chat(request({ text: "Хочу кофе", useAI: true }, await cookie()))).json();
    expect(result).toMatchObject({ mode: "deterministic", reason, model: null });
    expect(vi.mocked(answerSmartAssistant)).not.toHaveBeenCalled();
    expect(vi.mocked(reserveLocalAITestCall)).not.toHaveBeenCalled();
  });

  it("keeps failed-provider fallback explicit and does not change cards", async () => {
    vi.mocked(answerSmartAssistant).mockImplementationOnce(async input => ({ mode: "deterministic", reply: input.evidence.reply, citations: [], model: null, reason: "PROVIDER_TIMEOUT" }));
    const result = await (await chat(request({ text: "Хочу кофе", useAI: true }, await cookie()))).json();
    expect(result).toMatchObject({ mode: "deterministic", reason: "PROVIDER_TIMEOUT", model: null });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("does not send anything without a valid session or on invalid consent values", async () => {
    expect((await chat(request({ text: "Хочу кофе", useAI: true }))).status).toBe(401);
    expect((await chat(request({ text: "Хочу кофе", useAI: "yes" }, await cookie()))).status).toBe(400);
    expect(vi.mocked(answerSmartAssistant)).not.toHaveBeenCalled();
  });

  it("status remains secret-free and filesystem-free when the public gate is closed", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await status(new Request("https://qettyq.example/api/assistant/status"));
    expect(response.headers.get("cache-control")).toContain("no-store");
    const result = await response.json();
    expect(result).toMatchObject({ configured: false, available: false, model: "gpt-5.5", reason: "PUBLIC_AI_DISABLED", remainingTestCalls: 0, localTestOnly: true });
    expect(JSON.stringify(result)).not.toContain("unit-only-fake-key");
  });
});
