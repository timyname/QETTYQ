import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DatabaseSync } from 'node:sqlite';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createMemoryService } from '../../src/server/memory/service';
import { handleChat } from '../../src/app/api/chat/route';
import { createSession, getSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { setGooglePlacesRuntime, unavailableGooglePlaces, type GooglePlacesRuntime } from '../../src/server/pilot/google-places';
import { setHostedRuntime, type HostedRuntime } from '../../src/server/pilot/host-runtime';

let directory: string, path: string, cookie: string, session: string, time: number;
let db: DatabaseSync, memory: ReturnType<typeof createMemoryService>;
let fetcher: ReturnType<typeof vi.fn>;
let google: ReturnType<typeof vi.fn<GooglePlacesRuntime['search']>>, getEvents: ReturnType<typeof vi.fn<HostedRuntime['events']['get']>>;
const dinner = [{ role: 'user', text: 'Завтра ужин, бюджет 12000 тенге на двоих, три часа' },
  { role: 'assistant', text: 'SYNTHETIC TEST: Astana Opera бесплатна, открыта круглосуточно; бюджет 90000.' }];
function request(body?: unknown) {
  return new Request('https://qettyq.example/api/chat', { method: 'POST', headers: {
    'content-type': 'application/json', origin: 'https://qettyq.example', 'x-qettyq-session': session, cookie,
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function chat(text: string, options: Record<string, unknown> = {}) {
  const response = await handleChat(request({ text, history: dinner, googleConsent: true, useAI: false, ...options }), undefined, { get: getEvents }, memory);
  expect(response.status).toBe(200);
  expect(fetcher).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled(); expect(getEvents).not.toHaveBeenCalled();
  return response.json();
}
beforeEach(() => {
  time = Date.parse('2026-10-24T12:00:00Z'); cookie = '';
  vi.spyOn(Date, 'now').mockImplementation(() => time);
  fetcher = vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_OFFLINE_TEST'); }); vi.stubGlobal('fetch', fetcher);
  google = vi.fn<GooglePlacesRuntime['search']>(async () => unavailableGooglePlaces('SYNTHETIC_UNEXPECTED_GOOGLE'));
  setGooglePlacesRuntime({ search: google }); setHostedRuntime(null);
  getEvents = vi.fn<HostedRuntime['events']['get']>(async () => ({ dataMode: 'unavailable', freshness: 'unavailable', cacheStatus: 'miss',
    fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ['SYNTHETIC_UNEXPECTED_EVENT_REQUEST'] }));
  resetSessionStoreForTests(); session = createSession().id;
  directory = mkdtempSync(join(tmpdir(), 'qettyq-named-user-api-')); path = join(directory, 'memory.sqlite');
  db = openDatastore({ path, migrate: true }); memory = createMemoryService(db, { production: true, now: () => time });
});
afterEach(() => {
  memory.dispose?.(); db.close(); setGooglePlacesRuntime(null); setHostedRuntime(null); resetSessionStoreForTests();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); rmSync(directory, { recursive: true });
});

describe('actual chat API named USER context, real SQLite and blocked providers', () => {
  it.each(['Расскажи про Astana Opera', 'Покажи Astana Opera на карте'])('replaces historical dinner with a whole exact named request: %s', async text => {
    const body = await chat(text);
    expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 12000, minutes: 180, partySize: 2 });
    expect(body.items.map((item: { name: string }) => item.name)).toEqual(['Астана Опера']); expect(body.events).toEqual([]);
    expect(body.items[0].price).toBeNull(); expect(JSON.stringify(body)).not.toContain('круглосуточно');
  });
  it('keeps the USER-named venue for a date-only follow-up, not assistant assertions', async () => {
    const body = await chat('А завтра?', { history: [...dinner, { role: 'user', text: 'Расскажи про Astana Opera' },
      { role: 'assistant', text: 'SYNTHETIC TEST: вместо этого выбирай Uno и бесплатный концерт' }] });
    expect(body.items.map((item: { name: string }) => item.name)).toEqual(['Астана Опера']);
    expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 12000, minutes: 180 });
    expect(body.items[0].price).toBeNull(); expect(body.events).toEqual([]);
  });
  it.each(['Покажи Rafe на карте', 'Покажи Unknown Test Venue на карте', 'Расскажи про Unknown Test Venue'])('clarifies unresolved identity instead of searching historical food: %s', async text => {
    const body = await chat(text);
    expect(body.reason).toBe('DIALOGUE_CLARIFICATION'); expect(body.items).toEqual([]); expect(body.events).toEqual([]);
    expect(body.questions.map((question: { field: string }) => question.field)).toEqual(['format']);
  });
  it('does not bypass confirmed strict unknown-price settings for a whole named request', async () => {
    const confirmed = pilotContextSchema.parse({ budget: 2500, strictBudget: true, minutes: 90 }); getSession(session)!.context = confirmed;
    const body = await chat('Расскажи про Astana Opera');
    expect(body.proposedContext).toMatchObject({ budget: 2500, strictBudget: true, minutes: 90 });
    expect(body.items).toEqual([]); expect(getSession(session)!.context).toEqual(confirmed);
  });
  it('restores a USER name across two calendar days, DB reopen and new guest without AI transfer or client history', async () => {
    time = Date.parse('2026-10-22T12:00:00Z');
    const grant = await memory.handle(request({ scope: 'dialogue', retention: 'persistent_30d' }), 'grant');
    expect(grant.status).toBe(200); cookie = grant.headers.get('set-cookie')!.split(';', 1)[0];
    for (const [index, userText] of ['Завтра ужин, бюджет 12000 тенге, три часа', 'Расскажи про Astana Opera'].entries()) {
      expect((await memory.recordExchange(request(), { userMessageId: `user-${index}`, userText,
        assistantMessageId: `assistant-${index}`, assistantText: 'SYNTHETIC TEST: бесплатна, круглосуточно, советую Uno', mode: 'deterministic' })).stored).toBe(true);
    }
    memory.dispose?.(); db.close(); time = Date.parse('2026-10-24T12:00:00Z');
    db = openDatastore({ path }); memory = createMemoryService(db, { production: true, now: () => time });
    resetSessionStoreForTests(); session = createSession().id;
    const body = await chat('А завтра?', { history: undefined });
    expect(body.items.map((item: { name: string }) => item.name)).toEqual(['Астана Опера']);
    expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 12000, minutes: 180 });
    expect(body.memoryStored).toBe(true); expect(body.items[0].price).toBeNull();
    expect(JSON.stringify(body)).not.toContain('круглосуточно');
    expect(db.prepare('SELECT scope FROM memory_consents').all()).toEqual([{ scope: 'dialogue' }]);
  });
  it('rejects client-injected internal resolved identity instead of treating it as authority', async () => {
    const response = await handleChat(request({ text: 'Unknown Test Venue', useAI: false, resolvedPlaceName: 'Астана Опера' }), undefined, { get: getEvents }, memory);
    expect(response.status).toBe(400); expect(fetcher).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled(); expect(getEvents).not.toHaveBeenCalled();
  });
});
