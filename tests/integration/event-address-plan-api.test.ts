import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';
import { handleEvents } from '../../src/app/api/events/route';
import { POST as savePlan } from '../../src/app/api/plans/route';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import { setHostedRuntime, type HostedRuntime } from '../../src/server/pilot/host-runtime';
import { createPublicAIRuntime } from '../../src/server/pilot/public-ai-runtime';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { pilotPlaces } from '../../src/server/pilot/catalog';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';
import { reviewedEventVenueCorrespondences } from '../../src/server/ingestion/reviewed-event-venues';

const now = Date.parse('2026-10-24T12:00:00Z');
const event = { ...snapshot.items[0], id: 'sxodim:synthetic-address-api', name: 'SYNTHETIC TEST address event',
  address: 'Жастар театры, Ілияс Есенберлин көш., 10', venueName: 'Жастар театры', lat: null, lon: null,
  startsAt: '2026-10-25T12:00:00Z', endsAt: null, durationMinutes: null, status: 'scheduled' } as LiveAstanaEvent;
let session: string, events: HostedRuntime['events'];
const context = pilotContextSchema.parse({ goal: 'activity', origin: { lat: 51.15, lon: 71.43 }, budget: null });
const request = (ids: string[]) => new Request('https://qettyq.example/api/plans', { method: 'POST',
  headers: { origin: 'https://qettyq.example', 'content-type': 'application/json', 'x-qettyq-session': session },
  body: JSON.stringify({ placeIds: ids, context }) });
function host(provider = events) {
  setHostedRuntime({ ai: createPublicAIRuntime({ NODE_ENV: 'production' }), events: provider,
    routing: { reserve: async () => false } });
}
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now); resetSessionStoreForTests(); session = createSession().id;
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('SYNTHETIC_TEST_NETWORK_FORBIDDEN'); }));
  events = { get: async () => ({ dataMode: 'live', freshness: 'fresh', cacheStatus: 'hit', fetchedAt: null,
    expiresAt: null, source: null, coverage: null, items: [event], warnings: ['SYNTHETIC_TEST'] }) }; host();
});
afterEach(() => { setHostedRuntime(null); resetSessionStoreForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('address → public map DTO → ordered route API, no provider calls', () => {
  it.each(reviewedEventVenueCorrespondences)('carries documentary address evidence into a mixed plan: $eventUrl', async review => {
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-24T18:00:00Z'));
    const sourceEvent = { ...event, venueName: review.eventVenueName, address: review.eventAddress,
      contactUrl: review.eventUrl, provenance: { ...event.provenance, sourceUrl: review.eventUrl } };
    const provider: HostedRuntime['events'] = { get: async () => ({ ...await events.get(), items: [sourceEvent] }) }; host(provider);
    const item = (await (await handleEvents(new Request('https://qettyq.example/api/events'), provider)).json()).items[0];
    expect(item.coordinateMatch).toMatchObject({ method: 'osm-exact-venue-v1', sourceUrl: review.sourceUrl });
    expect(item.coordinateQuality).toBe('derived'); expect(sourceEvent.lat).toBeNull();
    const ids = [pilotPlaces[0].id, item.id, pilotPlaces[1].id];
    const response = await savePlan(request(ids)); expect(response.status).toBe(201);
    const body = await response.json(); expect(body.plan.placeIds).toEqual(ids);
    expect(body.plan.stops[1]).toMatchObject({ lat: item.lat, lon: item.lon, coordinateQuality: 'derived' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('resolves the observed exact address and accepts the same event among three reordered stops', async () => {
    const response = await handleEvents(new Request('https://qettyq.example/api/events'), events);
    const item = (await response.json()).items[0];
    expect(item).toMatchObject({ lat: 51.1905938, lon: 71.4057965, coordinateQuality: 'derived', freshness: 'fresh' });
    const ids = [pilotPlaces[0].id, item.id, pilotPlaces[1].id];
    const first = await savePlan(request(ids)); expect(first.status).toBe(201);
    const body = await first.json(); expect(body.plan.placeIds).toEqual(ids);
    expect(body.plan.legs).toHaveLength(3); expect(body.plan.totalMinutes).toBeNull();
    const reordered = [item.id, pilotPlaces[1].id, pilotPlaces[0].id];
    const second = await savePlan(request(reordered)); expect(second.status).toBe(201);
    expect((await second.json()).plan.placeIds).toEqual(reordered);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not put conflicting house records on the map or accept them in a route', async () => {
    const provider: HostedRuntime['events'] = { get: async () => ({ ...await events.get(), items: [{ ...event,
      address: 'Orta Community, Мәңгілік ел даңғылы, 41/1', venueName: 'Orta Community' }] }) }; host(provider);
    const body = await (await handleEvents(new Request('https://qettyq.example/api/events'), provider)).json();
    expect(body.items[0].lat).toBeNull(); expect((await savePlan(request([event.id]))).status).toBe(400);
  });
  it('rechecks source permissions for route creation, not only the public list', async () => {
    const provider = { ...events, resolveSourcePolicy: () => null }; host(provider);
    expect((await (await handleEvents(new Request('https://qettyq.example/api/events'), provider)).json()).items).toEqual([]);
    expect((await savePlan(request([event.id]))).status).toBe(400);
  });
  it('does not let documentary venue correspondence override an OSM display denial', async () => {
    const review = reviewedEventVenueCorrespondences[0];
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-24T18:00:00Z'));
    const provider: HostedRuntime['events'] = {
      get: async () => ({ ...await events.get(), items: [{ ...event, contactUrl: review.eventUrl,
        venueName: review.eventVenueName, address: review.eventAddress }] }),
      resolveSourcePolicy: id => id === 'osm-overpass-poi' ? null : { persist: true, display: true },
    }; host(provider);
    const item = (await (await handleEvents(new Request('https://qettyq.example/api/events'), provider)).json()).items[0];
    expect(item.lat).toBeNull(); expect(item.coordinateMatch).toBeUndefined();
    expect((await savePlan(request([event.id]))).status).toBe(400);
  });
  it('can display a stale address point without treating the event as currently plannable', async () => {
    const provider: HostedRuntime['events'] = { get: async () => ({ ...await events.get(), freshness: 'stale' }) }; host(provider);
    const item = (await (await handleEvents(new Request('https://qettyq.example/api/events'), provider)).json()).items[0];
    expect(item.lat).not.toBeNull(); expect(item.freshness).toBe('stale');
    expect((await savePlan(request([event.id]))).status).toBe(400);
  });
});
