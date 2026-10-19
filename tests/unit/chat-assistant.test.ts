import { describe, expect, it } from "vitest";
import { DeterministicChatAssistant } from "../../src/client/chat-assistant";
import { createDefaultLocalMemory } from "../../src/client/local-memory";

describe("DeterministicChatAssistant", () => {
  const provider = new DeterministicChatAssistant();

  it("extracts only supported context fields without external facts", async () => {
    const profile = createDefaultLocalMemory().profile;
    const result = await provider.respond({ text: "Хочу тихо погулять 90 минут до 3 000 ₸", profile, history: [] });
    expect(result.mode).toBe("deterministic");
    expect(result.patch).toEqual({ goal: "walk", minutes: 90, budget: 3000 });
    expect(result.reply).toContain("90 мин");
    expect(result.warnings[0]).toContain("Без внешнего AI");
  });

  it("asks for concrete context instead of inventing an answer", async () => {
    const profile = createDefaultLocalMemory().profile;
    const result = await provider.respond({ text: "Удиви меня", profile, history: [] });
    expect(result.patch).toEqual({});
    expect(result.reply).toContain("не хочу додумывать");
  });
});
