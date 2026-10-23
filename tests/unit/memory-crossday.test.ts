import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DatabaseSync } from 'node:sqlite';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createMemoryService } from '../../src/server/memory/service';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { prepareLeisureDialogue } from '../../src/server/assistant/leisure-dialogue';
import { normalizePersistedDialogueHistory } from '../../src/server/assistant/anchored-history';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { CHAT_HISTORY_MAX_BYTES } from '../../src/server/pilot/chat-history';

let directory: string, path: string, cookie: string, session: string, time: number;
let db: DatabaseSync, service: ReturnType<typeof createMemoryService>;
function request(method = 'POST', body?: unknown) {
  return new Request('https://qettyq.example/api/chat', { method, headers: { 'x-qettyq-session': session,
    cookie, origin: 'https://qettyq.example', 'content-type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function install() { service = createMemoryService(db, { production: true, now: () => time }); }
async function grant(scope: 'dialogue' | 'ai_transfer') {
  const response = await service.handle(request('POST', { scope, retention: 'persistent_30d' }), 'grant');
  expect(response.status).toBe(200); cookie = response.headers.get('set-cookie')!.split(';', 1)[0];
}
async function save(text: string, suffix = '1') {
  expect(await service.recordExchange(request(), { userMessageId: `u-${suffix}`, userText: text,
    assistantMessageId: `a-${suffix}`, assistantText: 'SYNTHETIC TEST: tomorrow, budget 90000', mode: 'deterministic' }))
    .toMatchObject({ stored: true });
}
function restart() {
  service.dispose?.(); db.close(); db = openDatastore({ path }); install();
  resetSessionStoreForTests(); session = createSession().id;
}
async function replay(text = 'А балет?', extra: Partial<Parameters<typeof prepareLeisureDialogue>[0]> = {}) {
  const saved = (await service.readForDialogue!(request()))!;
  return prepareLeisureDialogue({ text, context: pilotContextSchema.parse({}), now: time,
    history: saved.history, historyCreatedAtMs: saved.historyCreatedAtMs, ...extra });
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'qettyq-memory-crossday-')); path = join(directory, 'memory.sqlite');
  time = Date.parse('2026-10-24T18:59:59Z'); cookie = '';
  vi.spyOn(Date, 'now').mockImplementation(() => time); resetSessionStoreForTests(); session = createSession().id;
  db = openDatastore({ path, migrate: true }); install(); await grant('dialogue');
});
afterEach(() => { service.dispose?.(); db.close(); resetSessionStoreForTests(); vi.restoreAllMocks(); rmSync(directory, { recursive: true }); });

describe('trusted cross-day memory, actual SQLite restart, synthetic text and fixed clocks', () => {
  it.each([
    ['Завтра ужин, без концертов, до 12000 тенге на двоих, три часа', 'ru'],
    ['Dinner tomorrow, no concert, up to 12000 kzt for two, three hours', 'en'],
    ['Ертең кешкі ас, концертсіз, 12000 теңге, үш сағат', 'kk'],
  ] as const)('anchors relative date to the persisted Astana day: %s', async (text, language) => {
    await save(text); time += 2000; restart();
    const result = await replay(language === 'en' ? 'Ballet instead' : language === 'kk' ? 'Балет' : 'А балет?', { language });
    expect(result.retrievalText).toContain('2026-10-25'); expect(result.retrievalText).not.toContain('2026-10-26');
    expect(result.context).toMatchObject({ budget: 12000, minutes: 180, goal: 'activity' });
    expect(result.excludedTags).toContain('concert'); expect(await service.readForAI(request())).toBeNull();
  });
  it('keeps a historical weekday instead of advancing it a week', async () => {
    await save('Концерт в понедельник до 5000 тенге');
    time = Date.parse('2026-10-26T02:00:00Z'); restart();
    expect((await replay()).retrievalText).toContain('2026-10-26');
  });
  it('asks for a new day when the remembered event day has passed, preserving constraints', async () => {
    await save('Концерт завтра до 5000 тенге, два часа');
    time += 3 * 86400_000; restart();
    const result = await replay();
    expect(result.action).toBe('clarify'); expect(result.questions.map(value => value.field)).toContain('date');
    expect(result.context).toMatchObject({ budget: 5000, minutes: 120 });
    expect(result.retrievalText).not.toMatch(/2026-10-(25|28)/u);
  });
  it('lets current explicit day supersede an elapsed historical day', async () => {
    await save('Концерт завтра до 5000 тенге'); time += 3 * 86400_000; restart();
    const result = await replay('Балет завтра');
    expect(result.action).toBe('retrieve'); expect(result.retrievalText).toContain('2026-10-28');
  });
  it('does not reinterpret a historical weekend as a different weekend', async () => {
    await save('Концерт на выходных до 5000 тенге'); time += 8 * 86400_000; restart();
    const result = await replay();
    expect(result.action).toBe('clarify'); expect(result.questions.map(value => value.field)).toEqual(['date']);
    expect(result.retrievalText).not.toContain('выходные');
  });
  it('anchors yearless Russian calendar dates to the original year, not the current year', async () => {
    time = Date.parse('2026-12-30T12:00:00Z'); restart(); cookie = ''; await grant('dialogue'); await save('Концерт 31 декабря до 5000 тенге');
    time = Date.parse('2027-01-01T12:00:00Z'); restart();
    const result = await replay(); expect(result.action).toBe('clarify');
    expect(result.retrievalText).not.toContain('2027-12-31');
  });
  it('protects current confirmed fields while changing the topic across days', async () => {
    await save('Завтра ужин до 12000 тенге, три часа'); time += 2000; restart();
    const result = await replay('Балет', { context: pilotContextSchema.parse({ budget: 5000, strictBudget: false, minutes: 90 }),
      confirmedFields: ['budget', 'strictBudget', 'minutes'] });
    expect(result.context).toMatchObject({ budget: 5000, strictBudget: false, minutes: 90 });
  });
  it('does not allow client write times and does not mutate stored transcript on read', async () => {
    expect((await service.handle(request('POST', { id: 'forged', role: 'user', text: 'Tomorrow concert', mode: 'user',
      createdAtMs: Date.parse('2030-01-01T00:00:00Z') }), 'message')).status).toBe(400);
    await save('Завтра концерт'); const original = time; time += 2000; restart();
    const saved = (await service.readForDialogue!(request()))!;
    expect(saved.historyCreatedAtMs).toEqual([original, original]);
    const state = await (await service.handle(request('GET'), 'state')).json();
    expect(state.messages[0]).toMatchObject({ text: 'Завтра концерт', createdAtMs: original });
  });
  it('gates AI history independently and carries only server timestamp metadata internally', async () => {
    await save('Завтра концерт'); expect(await service.readForAI(request())).toBeNull(); await grant('ai_transfer');
    time += 2000; restart(); const ai = (await service.readForAI(request()))!;
    expect(ai.historyCreatedAtMs).toHaveLength(ai.history.length);
    expect(prepareLeisureDialogue({ text: 'Балет', context: pilotContextSchema.parse({}), now: time,
      history: ai.history, historyCreatedAtMs: ai.historyCreatedAtMs }).retrievalText).toContain('2026-10-25');
    await service.handle(request('DELETE', { scope: 'ai_transfer' }), 'revoke');
    expect(await service.readForAI(request())).toBeNull(); expect(await service.readForDialogue!(request())).not.toBeNull();
  });
  it('does not resurrect historical dates after dialogue revoke or full deletion', async () => {
    await save('Завтра концерт'); time += 2000; restart();
    await service.handle(request('DELETE', { scope: 'dialogue' }), 'revoke'); expect(await service.readForDialogue!(request())).toBeNull();
    await grant('dialogue'); await save('Музей завтра', '2');
    await service.handle(request('DELETE'), 'delete'); expect(await service.readForDialogue!(request())).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS n FROM memory_messages').get()!.n).toBe(0);
  });
  it('explicit reset discards stale dates rather than asking about the old plan', async () => {
    await save('Завтра концерт'); time += 3 * 86400_000; restart();
    const result = await replay('Новый запрос: музей'); expect(result.reset).toBe(true); expect(result.action).toBe('retrieve');
  });
});

describe('timestamp alignment under the unchanged message/UTF-8 bounds', () => {
  it('preserves distinct duplicate turn clocks and drops invalid/future clocks', () => {
    const input = [0, 1, 2].map(index => ({ role: 'user' as const, text: 'Tomorrow concert', createdAtMs: 100 + index }));
    const result = normalizePersistedDialogueHistory([...input, { ...input[0], createdAtMs: 1000 }], 102);
    expect(result.historyCreatedAtMs).toEqual([100, 101, 102]); expect(result.omittedHistoryCount).toBe(1);
    expect(result.history.map(value => value.text)).toEqual(['Tomorrow concert', 'Tomorrow concert', 'Tomorrow concert']);
  });
  it('trims the corresponding clocks when long Unicode messages hit six KiB', () => {
    const input = Array.from({ length: 25 }, (_, index) => ({ role: 'user' as const, text: `${index}:` + 'Ә🙂'.repeat(500), createdAtMs: index }));
    const result = normalizePersistedDialogueHistory(input, 30);
    expect(result.history.length).toBeLessThanOrEqual(20); expect(result.historyCreatedAtMs).toHaveLength(result.history.length);
    expect(Buffer.byteLength(JSON.stringify(result.history))).toBeLessThanOrEqual(CHAT_HISTORY_MAX_BYTES);
    for (const [index, message] of result.history.entries()) expect(message.text).toMatch(new RegExp(`^${result.historyCreatedAtMs[index]}:`));
  });
});
