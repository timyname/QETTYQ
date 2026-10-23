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

  it('preserves server provenance through actual JSON save/reload instead of upgrading it to device', () => {
    const storage = new MemoryStorage();
    const memory = appendLocalMessage(createDefaultLocalMemory(), {
      id: 'restored-server', role: 'user', mode: 'user', text: 'Сохранённый контекст',
      createdAt: '2026-10-24T00:00:00Z', contextOrigin: 'server',
    });
    saveLocalMemory(storage, memory);
    expect(loadLocalMemory(storage).dialogue[0].contextOrigin).toBe('server');
    saveLocalMemory(storage, loadLocalMemory(storage));
    expect(loadLocalMemory(storage).dialogue[0].contextOrigin).toBe('server');
  });

  it.each([undefined, null, 'invalid', { source: 'device' }])('fails closed for missing/malformed persisted origin %j', origin => {
    const memory = createDefaultLocalMemory();
    const raw = JSON.stringify({ ...memory, dialogue: [{ id: 'old', role: 'user', mode: 'user', text: 'Старый контекст', createdAt: memory.updatedAt, contextOrigin: origin }] });
    const parsed = parseLocalMemory(raw);
    expect(parsed.dialogue[0].contextOrigin).toBe('legacy_unknown');
    expect(parseLocalMemory(JSON.stringify(parsed)).dialogue[0].contextOrigin).toBe('legacy_unknown');
  });

  it('marks only newly appended local turns as device and retains that distinction after reload', () => {
    const storage = new MemoryStorage();
    const first = appendLocalMessage(createDefaultLocalMemory(), { id: 'new-user', role: 'user', mode: 'user', text: 'Прогулка завтра', createdAt: '2026-10-24T00:00:00Z' });
    const next = appendLocalMessage(first, { id: 'new-assistant', role: 'assistant', mode: 'deterministic', text: 'Какой бюджет?', createdAt: '2026-10-24T00:00:01Z' });
    saveLocalMemory(storage, next);
    expect(loadLocalMemory(storage).dialogue.map(message => message.contextOrigin)).toEqual(['device', 'device']);
    const legacy = parseLocalMemory(JSON.stringify({ ...next, dialogue: [{ ...next.dialogue[0], contextOrigin: undefined }] }));
    expect(appendLocalMessage(createDefaultLocalMemory(), legacy.dialogue[0]).dialogue[0].contextOrigin).toBe('legacy_unknown');
  });
});
