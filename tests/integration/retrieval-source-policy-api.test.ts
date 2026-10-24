import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleChat } from '../../src/app/api/chat/route';
import { handleEvents } from '../../src/app/api/events/route';
import { GET as catalog } from '../../src/app/api/catalog/route';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { setHostedRuntime, type HostedRuntime } from '../../src/server/pilot/host-runtime';
import type { LiveEventsResult } from '../../src/server/ingestion/live-events';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';
import { applicationSourcePolicy } from '../../src/server/retrieval/application-source-policy';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';

const clock = Date.parse('2026-10-24T12:00:00Z');
const allow = { persist: true, display: true, sendToLlm: false, embed: false };
function event(sourceId: string, n = 0): LiveAstanaEvent {
  return { ...snapshot.items[0], id: `synthetic-policy-${n}`, name: `SYNTHETIC POLICY BALLET ${n}`, category: 'Балет',
    startsAt: '2026-10-25T12:00:00+05:00', endsAt: null, durationMinutes: null,
    provenance: { ...snapshot.items[0].provenance, sourceId } } as LiveAstanaEvent;
}
function feed(items: LiveAstanaEvent[]): LiveEventsResult {
  return { items, source: null, coverage: null, fetchedAt: null, expiresAt: null,
    dataMode: 'snapshot', freshness: 'stale', cacheStatus: 'hit', warnings: ['SYNTHETIC_TEST_NO_NETWORK'] };
}
function runtime(items: LiveAstanaEvent[], resolveSourcePolicy?: HostedRuntime['events']['resolveSourcePolicy']): HostedRuntime['events'] {
  return { get: async () => feed(items), ...(resolveSourcePolicy ? { resolveSourcePolicy } : {}) };
}
async function chat(events: HostedRuntime['events'], text = 'Балет') {
  const session = createSession();
  return handleChat(new Request('https://qettyq.example/api/chat', { method: 'POST', headers: {
    origin: 'https://qettyq.example', 'content-type': 'application/json', 'x-qettyq-session': session.id,
  }, body: JSON.stringify({ text, useAI: false, googleConsent: false }) }), undefined, events);
}
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(clock);
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('NETWORK_FORBIDDEN_OFFLINE_TEST'); }));
  resetSessionStoreForTests(); setHostedRuntime(null);
});
afterEach(() => { setHostedRuntime(null); resetSessionStoreForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('actual public source-policy boundaries, offline synthetic events', () => {
  it('denies an unknown injected source on both chat retrieval and public feed', async () => {
    const events = runtime([event('synthetic-unreviewed')]);
    const result = await (await chat(events)).json();
    expect(result.events).toEqual([]); expect(result.eventEvidence).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('SYNTHETIC POLICY BALLET');
    const response = await handleEvents(new Request('https://qettyq.example/api/events'), events);
    expect((await response.json()).items).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps display-authorized event number four when the first three are denied, despite LLM false', async () => {
    const events = runtime([event('denied', 1), event('denied', 2), event('denied', 3), event('allowed', 4)],
      id => id === 'allowed' ? allow : null);
    const result = await (await chat(events)).json();
    expect(result.events.map((row: { id: string }) => row.id)).toEqual(['synthetic-policy-4']);
    expect(result.eventEvidence).toHaveLength(1);
    const exposed = await (await handleEvents(new Request('https://qettyq.example/api/events'), events)).json();
    expect(exposed.total).toBe(1); expect(exposed.items[0].id).toBe('synthetic-policy-4');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['denied', 'throws', 'expired', 'revoked'] as const)('a hosted %s policy never falls back to static Sxodim permission', async scenario => {
    const events = runtime([event('sxodim-astana-noncommercial')], () => {
      if (scenario === 'throws') throw new Error('SYNTHETIC_LOOKUP_FAILURE');
      return scenario === 'expired' ? { ...allow, expiresAt: clock - 1 }
        : scenario === 'revoked' ? { ...allow, revoked: true } : null;
    });
    expect((await (await chat(events)).json()).events).toEqual([]);
    expect((await (await handleEvents(new Request('https://qettyq.example/api/events'), events)).json()).items).toEqual([]);
  });
  it('withholds POI facts and exact-name hints when the hosted OSM grant is revoked', async () => {
    const events = runtime([], id => id === 'osm-overpass-poi' ? { ...allow, revoked: true } : null);
    setHostedRuntime({ events } as HostedRuntime);
    const result = await (await chat(events, 'Музей')).json();
    expect(result.items).toEqual([]);
    const exposed = await (await catalog(new Request('https://qettyq.example/api/catalog'))).json();
    expect(exposed.items).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not invent embed permission for the existing reviewed grants', () => {
    expect(applicationSourcePolicy('osm-overpass-poi')).toMatchObject({ persist: true, display: true, embed: false });
    expect(applicationSourcePolicy('sxodim-astana-noncommercial')).toMatchObject({ persist: true, display: true, embed: false });
    expect(applicationSourcePolicy('synthetic-unreviewed')).toBeNull();
  });
});
