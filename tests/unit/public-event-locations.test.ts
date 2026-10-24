import { describe, expect, it } from 'vitest';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';
import { createPublicEventLocationEnricher } from '../../src/server/ingestion/public-event-locations';
import type { AddressIndex } from '../../src/server/ingestion/address-match';
import type { LiveEventsResult } from '../../src/server/ingestion/live-events';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';
import { eventPlanStop } from '../../src/server/pilot/event-plan-stop';

const now = Date.parse('2026-10-24T12:00:00Z');
const index: AddressIndex = { source: { url: 'https://download.geofabrik.de/asia/kazakhstan-261019.osm.pbf',
  asOf: '2026-10-19T20:21:11Z', retrievedAt: '2026-10-20T20:00:00Z', license: 'ODbL-1.0' },
  entries: [{ street: 'SYNTHETIC TEST street', houseNumber: '10', lat: 51.15, lon: 71.4,
    sourceUrl: 'https://www.openstreetmap.org/way/123', quality: 'derived' }] };
const event = { ...snapshot.items[0], id: 'sxodim:synthetic-address-test', address: 'SYNTHETIC TEST street, 10',
  lat: null, lon: null, startsAt: '2026-10-25T12:00:00Z', status: 'scheduled', warnings: ['SYNTHETIC_TEST'] } as LiveAstanaEvent;
const feed = (items = [event]): LiveEventsResult => ({ dataMode: 'live', freshness: 'fresh', cacheStatus: 'hit',
  fetchedAt: null, expiresAt: null, source: null, coverage: null, items, warnings: ['SYNTHETIC_TEST'] });
const allow = () => ({ persist: true, display: true, sendToLlm: false, embed: false });

describe('shared public event coordinate boundary, synthetic data only', () => {
  it('gives map and route the same derived point without mutating publisher facts', () => {
    const output = createPublicEventLocationEnricher({ index, places: [], now: () => now })(feed(), allow).items[0];
    expect(output).toMatchObject({ lat: 51.15, lon: 71.4, freshness: 'fresh', coordinateQuality: 'derived' });
    expect(output.coordinateMatch?.precision).toBe('building_or_address_point');
    expect(eventPlanStop(output, now)).toMatchObject({ lat: output.lat, lon: output.lon });
    expect(event.lat).toBeNull(); expect(output.price).toEqual(event.price);
  });
  it('rechecks OSM permission on cached derived evidence, but preserves observed publisher coordinates', () => {
    const enrich = createPublicEventLocationEnricher({ index, places: [], now: () => now });
    const derived = enrich(feed(), allow);
    const denyOsm = (id: string) => id === 'osm-overpass-poi' ? null : allow();
    const output = enrich(derived, denyOsm).items[0];
    expect(output.lat).toBeNull(); expect(output.coordinateMatch).toBeUndefined(); expect(eventPlanStop(output, now)).toBeNull();
    expect(enrich(feed([{ ...event, lat: 51.16, lon: 71.41, coordinateQuality: 'observed' }]), denyOsm).items[0].lat).toBe(51.16);
  });
  it('never falls through a denied or throwing event-source policy', () => {
    const enrich = createPublicEventLocationEnricher({ index, places: [], now: () => now });
    expect(enrich(feed(), () => null).items).toEqual([]);
    expect(enrich(feed(), () => { throw new Error('SYNTHETIC_TEST'); }).items).toEqual([]);
  });
  it('invalidates cached derived coordinates when the address index expires', () => {
    let time = now; const enrich = createPublicEventLocationEnricher({ index, places: [], now: () => time });
    const derived = enrich(feed(), allow); time += 36 * 86400_000;
    expect(enrich(derived, allow).items[0].lat).toBeNull();
  });
  it('keeps ambiguous houses unresolved and stale/expired events out of routes', () => {
    const conflicting = { ...index, entries: [...index.entries, { ...index.entries[0], lat: 51.17 }] };
    expect(createPublicEventLocationEnricher({ index: conflicting, places: [], now: () => now })(feed(), allow).items[0].lat).toBeNull();
    const enrich = createPublicEventLocationEnricher({ index, places: [], now: () => now });
    for (const input of [{ ...feed(), freshness: 'stale' as const }, feed([{ ...event, expiresAt: '2026-10-23T00:00:00Z' }])]) {
      const output = enrich(input, allow).items[0]; expect(output.lat).toBe(51.15); expect(eventPlanStop(output, now)).toBeNull();
    }
  });
});
