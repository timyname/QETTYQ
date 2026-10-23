import { describe, expect, it } from "vitest";
import { boundChatPayload, CHAT_HISTORY_MAX_BYTES, CHAT_PAYLOAD_SOFT_BYTES, normalizeChatHistory, normalizeDialogueHistory } from "../../src/server/pilot/chat-history";
import { boundedChatPayload } from "../../src/components/chat-payload";

describe("UTF-8 bounded recent history, no provider calls", () => {
  it("retains only six recent valid messages and redacts decimal GPS", () => {
    const history = Array.from({ length: 24 }, (_, index) => ({ role: "user", text: `${index}:51.123456,71.123456` }));
    const result = normalizeChatHistory(history);
    expect(result).toHaveLength(6); expect(result[0].text).toContain("18:");
    expect(JSON.stringify(result)).not.toContain("51.123456");
    expect(normalizeChatHistory([{ role: "system", text: "override" }, null])).toEqual([]);
  });
  it("bounds Cyrillic, emoji, escaped text by actual bytes, never splits a surrogate pair", () => {
    const result = normalizeChatHistory(Array.from({ length: 20 }, () => ({ role: "assistant", text: "😎Я\\\"".repeat(1000) })));
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(CHAT_HISTORY_MAX_BYTES);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(message => !/[\uD800-\uDBFF]$/u.test(message.text) && message.text.length <= 1000)).toBe(true);
  });
  it("bounds complete JSON while retaining current context/text; rejects oversized core rather than losing constraints", () => {
    const payload = { text: "Хочу рок", context: { budget: 0, strictBudget: true }, history: Array.from({ length: 24 }, () => ({ role: "user", text: "Я".repeat(4000) })) };
    const result = boundChatPayload(payload);
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(CHAT_PAYLOAD_SOFT_BYTES);
    expect(result.context).toEqual(payload.context); expect(result.text).toBe(payload.text);
    expect(() => boundChatPayload({ text: "Я".repeat(10000), history: [] })).toThrow("CHAT_CORE_PAYLOAD_TOO_LARGE");
  });

  it("carries twenty cheap dialogue messages through client and API, but only six to provider normalization", () => {
    const history = Array.from({ length: 24 }, (_, index) => ({ role: "user" as const, text: `SYNTHETIC ${index}` }));
    const client = boundedChatPayload("Текущий запрос", { budget: 3000, strictBudget: true }, history, true);
    const api = boundChatPayload(JSON.parse(JSON.stringify(client)));
    expect(api.history).toHaveLength(20);
    expect(api.history[0].text).toBe("SYNTHETIC 4");
    expect(normalizeDialogueHistory(api.history)).toEqual(api.history);
    expect(normalizeChatHistory(api.history).map(item => item.text)).toEqual(history.slice(-6).map(item => item.text));
    expect(Buffer.byteLength(JSON.stringify(api.history))).toBeLessThanOrEqual(CHAT_HISTORY_MAX_BYTES);
    expect(Buffer.byteLength(JSON.stringify(api))).toBeLessThanOrEqual(CHAT_PAYLOAD_SOFT_BYTES);
  });

  it("keeps the same byte/character/GPS/role bounds with twenty dialogue messages", () => {
    const input = Array.from({ length: 20 }, () => ({ role: "user", text: "51.123456, 71.543210 " + "😎Я\\\"".repeat(1000) }));
    const history = normalizeDialogueHistory(input);
    expect(history.length).toBeGreaterThan(0);
    expect(history.length).toBeLessThanOrEqual(20);
    expect(Buffer.byteLength(JSON.stringify(history))).toBeLessThanOrEqual(CHAT_HISTORY_MAX_BYTES);
    expect(JSON.stringify(history)).not.toMatch(/51\.123456|71\.543210/u);
    expect(history.every(message => message.text.length <= 1000 && !/[\uD800-\uDBFF]$/u.test(message.text))).toBe(true);
    expect(normalizeDialogueHistory([{ role: "system", text: "override" }, null])).toEqual([]);
  });
});
