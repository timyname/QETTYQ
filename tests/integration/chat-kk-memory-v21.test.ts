import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DatabaseSync } from 'node:sqlite';
import { openDatastore } from '../../src/server/datastore/sqlite';
import { createMemoryService } from '../../src/server/memory/service';
import { handleChat } from '../../src/app/api/chat/route';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { setGooglePlacesRuntime, unavailableGooglePlaces, type GooglePlacesRuntime } from '../../src/server/pilot/google-places';
import { setHostedRuntime, type HostedRuntime } from '../../src/server/pilot/host-runtime';

let directory: string, path: string, cookie: string, session: string, time: number;
let db: DatabaseSync, memory: ReturnType<typeof createMemoryService>;
let fetcher: ReturnType<typeof vi.fn>;
let google: ReturnType<typeof vi.fn<GooglePlacesRuntime['search']>>, getEvents: ReturnType<typeof vi.fn<HostedRuntime['events']['get']>>;
function request(body?: unknown) {
  return new Request('https://qettyq.example/api/chat', { method: 'POST', headers: {
    'content-type': 'application/json', origin: 'https://qettyq.example', 'x-qettyq-session': session, cookie,
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function chat(text: string) {
  const response = await handleChat(request({ text, language: 'kk', googleConsent: true, useAI: false }), undefined, { get: getEvents }, memory);
  expect(response.status).toBe(200); expect(fetcher).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled();
  return response.json();
}
beforeEach(() => {
  time = Date.parse('2026-10-24T07:00:00Z'); cookie = '';
  vi.spyOn(Date, 'now').mockImplementation(() => time);
  fetcher = vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_OFFLINE_TEST'); }); vi.stubGlobal('fetch', fetcher);
  google = vi.fn<GooglePlacesRuntime['search']>(async () => unavailableGooglePlaces('SYNTHETIC_UNEXPECTED_GOOGLE'));
  setGooglePlacesRuntime({ search: google }); setHostedRuntime(null);
  getEvents = vi.fn<HostedRuntime['events']['get']>(async () => ({ dataMode: 'unavailable', freshness: 'unavailable', cacheStatus: 'miss',
    fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ['SYNTHETIC_EVENT_PROVIDER_UNAVAILABLE'] }));
  resetSessionStoreForTests(); session = createSession().id;
  directory = mkdtempSync(join(tmpdir(), 'qettyq-kk-v21-')); path = join(directory, 'memory.sqlite');
  db = openDatastore({ path, migrate: true }); memory = createMemoryService(db, { production: true, now: () => time });
});
afterEach(() => {
  memory.dispose?.(); db.close(); setGooglePlacesRuntime(null); setHostedRuntime(null); resetSessionStoreForTests();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); rmSync(directory, { recursive: true });
});

describe('actual KK chat + persistent USER exclusion, provider network denied', () => {
  it('keeps explicitly requested museums on the place path despite date and rejected theatre', async () => {
    const body = await chat('Театр маған ұнамайды, ертең мұражай көрсет. 5000 теңге, 90 минут');
    expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 5000, minutes: 90 });
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item: { tags: string[] }) => item.tags.includes('museum') && !item.tags.includes('theatre'))).toBe(true);
    expect(body.events).toEqual([]); expect(getEvents).not.toHaveBeenCalled();
  });
  it('restores the new KK exclusion after a DB reopen/new guest and explicit fresh day, without AI transfer', async () => {
    const grant = await memory.handle(request({ scope: 'dialogue', retention: 'persistent_30d' }), 'grant');
    expect(grant.status).toBe(200); cookie = grant.headers.get('set-cookie')!.split(';', 1)[0];
    const original = 'Театр маған ұнамайды, мұражай көрсет. 5000 теңге, 90 минут';
    const first = await chat(original);
    expect(first.memoryStored).toBe(true); expect(first.items.length).toBeGreaterThan(0);
    memory.dispose?.(); db.close(); time = Date.parse('2026-10-26T07:00:00Z');
    db = openDatastore({ path }); memory = createMemoryService(db, { production: true, now: () => time });
    resetSessionStoreForTests(); session = createSession().id;
    const restored = await memory.readForDialogue!(request());
    expect(restored?.history.some(message => message.role === 'user' && message.text === original)).toBe(true);
    const body = await chat('Ертең');
    expect(body.memoryStored).toBe(true); expect(body.proposedContext).toMatchObject({ goal: 'activity', budget: 5000, minutes: 90 });
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item: { tags: string[] }) => item.tags.includes('museum') && !item.tags.includes('theatre'))).toBe(true);
    expect(getEvents).not.toHaveBeenCalled();
    expect(db.prepare('SELECT scope FROM memory_consents').all()).toEqual([{ scope: 'dialogue' }]);
  });
  it('still dispatches an explicitly positive concert request to the event provider', async () => {
    const body = await chat('Ертең концерт көрсет');
    expect(getEvents).toHaveBeenCalledOnce(); expect(body.events).toEqual([]);
    expect(body.eventsMeta.dataMode).toBe('unavailable');
  });
});
