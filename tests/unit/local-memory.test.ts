import { describe, expect, it } from "vitest";
import {
  LOCAL_MEMORY_KEY,
  MAX_CHAT_MESSAGES,
  appendLocalMessage,
  clearLocalMemory,
  createDefaultLocalMemory,
  loadLocalMemory,
  parseLocalMemory,
  saveLocalMemory,
  type StorageLike,
} from "../../src/client/local-memory";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("browser-local memory", () => {
  it("falls back safely for malformed or obsolete payloads", () => {
    expect(parseLocalMemory("not-json").profile.goal).toBe("new");
    expect(parseLocalMemory(JSON.stringify({ version: 99 })).profile.locale).toBe("ru");
  });

  it("normalizes preferences and never accepts location fields", () => {
    const memory = parseLocalMemory(JSON.stringify({
      version: 1,
      updatedAt: "2026-10-19T00:00:00.000Z",
      profile: { locale: "kk", goal: "walk", minutes: 999, budget: -1, likedTags: ["Park", "Park", "bad!"] },
      exactLocation: { lat: 51.1, lon: 71.4 },
      dialogue: [],
    }));
    expect(memory.profile).toEqual({ locale: "kk", goal: "walk", minutes: 720, budget: 0, likedTags: ["park"] });
    expect(memory).not.toHaveProperty("exactLocation");
  });

  it("caps dialogue and supports explicit deletion", () => {
    const storage = new MemoryStorage();
    let memory = createDefaultLocalMemory();
    for (let index = 0; index < MAX_CHAT_MESSAGES + 5; index += 1) {
      memory = appendLocalMessage(memory, { id: `m-${index}`, role: "user", mode: "user", text: `message ${index}`, createdAt: new Date().toISOString() });
    }
    saveLocalMemory(storage, memory);
    expect(loadLocalMemory(storage).dialogue).toHaveLength(MAX_CHAT_MESSAGES);
    clearLocalMemory(storage);
    expect(storage.getItem(LOCAL_MEMORY_KEY)).toBeNull();
  });

  it('preserves strict and unknown budget preferences without storing GPS', () => {
    const storage = new MemoryStorage();
    const memory = createDefaultLocalMemory();
    memory.profile = { ...memory.profile, minutes: 720, strictBudget: true, budgetUnknown: true };
    saveLocalMemory(storage, memory);
    expect(loadLocalMemory(storage).profile).toMatchObject({ minutes: 720, strictBudget: true, budgetUnknown: true });
    expect(storage.getItem(LOCAL_MEMORY_KEY)).not.toContain('origin');
  });
});
