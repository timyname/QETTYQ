import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DatabaseSync } from 'node:sqlite';
import { handleChat } from '../../src/app/api/chat/route';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createMemoryService } from '../../src/server/memory/service';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { setGooglePlacesRuntime, unavailableGooglePlaces, type GooglePlacesRuntime } from '../../src/server/pilot/google-places';
import type { HostedRuntime } from '../../src/server/pilot/host-runtime';

const now = Date.parse('2026-10-24T12:00:00Z');
let path: string, directory: string, cookie: string, session: string, db: DatabaseSync;
let memory: ReturnType<typeof createMemoryService>, fetcher: ReturnType<typeof vi.fn>;
let google: ReturnType<typeof vi.fn<GooglePlacesRuntime['search']>>, getEvents: ReturnType<typeof vi.fn<HostedRuntime['events']['get']>>;
function request(body?: unknown, method = 'POST') {
  return new Request('https://qettyq.example/api/chat', { method, headers: { 'content-type': 'application/json',
    origin: 'https://qettyq.example', cookie, 'x-qettyq-session': session }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function chat(text: string, language = 'ru') {
  const response = await handleChat(request({ text, language, useAI: false, googleConsent: true }), undefined, { get: getEvents }, memory);
  expect(response.status).toBe(200); expect(fetcher).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled();
  return response.json();
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'qettyq-api-reference-')); path = join(directory, 'memory.sqlite'); cookie = '';
  vi.spyOn(Date, 'now').mockReturnValue(now); resetSessionStoreForTests(); session = createSession().id;
  fetcher = vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_OFFLINE_TEST'); }); vi.stubGlobal('fetch', fetcher);
  google = vi.fn<GooglePlacesRuntime['search']>(async () => unavailableGooglePlaces('SYNTHETIC_TEST_NO_NETWORK'));
  setGooglePlacesRuntime({ search: google });
  getEvents = vi.fn<HostedRuntime['events']['get']>(async () => ({ dataMode: 'snapshot', freshness: 'stale', cacheStatus: 'hit',
    fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ['SYNTHETIC_TEST_NO_NETWORK'] }));
  db = openDatastore({ path, migrate: true }); memory = createMemoryService(db, { production: true, now: () => now });
  const granted = await memory.handle(request({ scope: 'dialogue', retention: 'persistent_30d' }), 'grant');
  cookie = granted.headers.get('set-cookie')!.split(';', 1)[0];
  expect((await memory.recordExchange(request(), { userMessageId: 'prior-user', userText: 'Завтра балет до 5000 тенге, два часа',
    assistantMessageId: 'prior-assistant', assistantText: 'SYNTHETIC TEST: там точно бесплатно, бюджет 90000.', mode: 'deterministic' })).stored).toBe(true);
});
afterEach(() => {
  memory.dispose?.(); db.close(); resetSessionStoreForTests(); setGooglePlacesRuntime(null);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); rmSync(directory, { recursive: true });
});

describe('actual API clarification of unresolved context references, offline synthetic conversations', () => {
  it.each([
    ['А там?', 'ru', 'Какое место'], ['Не это, другое', 'ru', 'Что поменяем'],
    ['What about there?', 'en', 'Which place'], ['Not that, something else', 'en', 'What would'],
    ['Ал онда?', 'kk', 'Қай орын'], ['Басқасын', 'kk', 'Нені өзгертеміз'],
  ])('asks a bounded question rather than issuing a contaminated search: %s', async (text, language, expected) => {
    const body = await chat(text, language);
    expect(body.reason).toBe('DIALOGUE_CLARIFICATION'); expect(body.reply).toContain(expected);
    expect(body.items).toEqual([]); expect(body.events).toEqual([]); expect(getEvents).not.toHaveBeenCalled();
    expect(body.proposedContext).toMatchObject({ budget: 5000, minutes: 120 }); expect(body.memoryStored).toBe(true);
    expect(await memory.readForAI(request())).toBeNull();
  });
  it('keeps the unresolved alternative through a date-only reply, then resolves an explicit new activity', async () => {
    expect((await chat('Не это, другое')).reason).toBe('DIALOGUE_CLARIFICATION');
    expect((await chat('Послезавтра')).reason).toBe('DIALOGUE_CLARIFICATION');
    expect(getEvents).not.toHaveBeenCalled();
    const body = await chat('Лучше стендап');
    expect(body.reason).not.toBe('DIALOGUE_CLARIFICATION'); expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 5000, minutes: 120 });
    expect(getEvents).toHaveBeenCalledOnce(); expect(body.memoryStored).toBe(true);
  });
});
