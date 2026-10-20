import { afterEach, describe, expect, it, vi } from "vitest";
import { createLLMProvider, DeterministicProvider } from "../../src/server/providers/llm";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("DeterministicProvider", () => {
  it("uses only supplied candidate IDs and preserves unknowns", async () => {
    const result = await new DeterministicProvider().explain([{ id:"osm:node:1", name:"Музей", category:"museum", totalMinutes:70, feasibility:"uncertain", unknowns:["Цена неизвестна"], sourceUrl:"https://www.openstreetmap.org/node/1" }]);
    expect(result.mode).toBe("deterministic");
    expect(result.items[0].candidateId).toBe("osm:node:1");
    expect(result.items[0].unknowns).toEqual(["Цена неизвестна"]);
  });

  it.each(["production", "development"])("never enables legacy paid requests in %s even with every legacy/AI flag", async nodeEnv => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("LLM_ENABLED", "true");
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("LLM_MODEL", "gpt-5.5");
    vi.stubEnv("OPENAI_API_KEY", "unit-test-not-real");
    vi.stubEnv("QETTYQ_AI_ENABLED", "true");
    vi.stubEnv("QETTYQ_AI_TEST_BUDGET_APPROVED", "true");
    const fetcher = vi.fn().mockRejectedValue(new Error("No network allowed"));
    vi.stubGlobal("fetch", fetcher);
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(DeterministicProvider);
    expect((await provider.explain([])).mode).toBe("deterministic");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
