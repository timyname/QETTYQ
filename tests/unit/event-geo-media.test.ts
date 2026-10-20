import { describe, expect, it } from 'vitest';
import places from '../../data/places.json';
import index from '../../data/astana-address-index.json';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';
import { createAddressMatcher, enrichEventAddresses, type AddressIndex } from '../../src/server/ingestion/address-match';
import { createEventVenueMatcher, type VenueGeoRecord } from '../../src/server/ingestion/event-geo-media';
import { resolveEventMedia, type LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';
import { handleEvents } from '../../src/app/api/events/route';

const now = Date.parse('2026-10-21T01:00:00Z');
const venue: VenueGeoRecord = { id: 'osm:node:123', name: 'SYNTHETIC Theatre', address: null,
  lat: 51.15, lon: 71.43, sourceUrl: 'https://www.openstreetmap.org/node/123', retrievedAt: '2026-10-20T20:00:00Z' };
const event = { venueName: venue.name, address: null, contactUrl: 'https://sxodim.com/astana/event/synthetic' };

describe('event geodata: exact offline venue identity (synthetic unless stated)', () => {
  it('links an exact unique observed name with derived provenance, not fabricated address', () => {
    expect(createEventVenueMatcher([venue], () => null, now)(event)).toEqual({ lat: 51.15, lon: 71.43,
      sourceUrl: venue.sourceUrl, asOf: venue.retrievedAt, quality: 'derived', method: 'osm-exact-venue-v1', precision: 'building_or_address_point' });
    expect(event.address).toBeNull();
  });
  it('uses exact observed translations and comma-delimited venue segments', () => {
    const match = createEventVenueMatcher([{ ...venue, nameTranslations: { ru: 'СИНТЕТИЧЕСКИЙ театр' } }], () => null, now);
    expect(match({ ...event, venueName: 'Астана қаласы', address: 'Астана қаласы, СИНТЕТИЧЕСКИЙ театр' })).not.toBeNull();
    expect(match({ ...event, venueName: 'Theatre' })).toBeNull();
    expect(match({ ...event, venueName: 'SYNTHETIC Theatre branch 2' })).toBeNull();
  });
  it('rejects same-name branches rather than selecting the first/closest', () => {
    const other = { ...venue, id: 'osm:node:124', sourceUrl: 'https://www.openstreetmap.org/node/124', lon: 71.431 };
    expect(createEventVenueMatcher([venue, other], () => null, now)(event)).toBeNull();
  });
  it('rejects explicit unknown or conflicting addresses even for a famous unique venue', () => {
    const withAddress = { ...event, address: 'SYNTHETIC Theatre, Another street, 10' };
    expect(createEventVenueMatcher([venue], () => null, now)(withAddress)).toBeNull();
    const match = () => ({ lat: 51.151, lon: 71.43, sourceUrl: venue.sourceUrl, asOf: venue.retrievedAt,
      quality: 'derived' as const, method: 'osm-exact-address-v1' as const, precision: 'building_or_address_point' as const });
    expect(createEventVenueMatcher([venue], match, now)(withAddress)).toBeNull();
    expect(createEventVenueMatcher([venue], () => ({ ...match(), lat: venue.lat }), now)(withAddress)).not.toBeNull();
  });
  it.each([
    { sourceUrl: 'https://evil.example/node/123' }, { id: 'osm:node:124' }, { lat: 52 },
    { retrievedAt: '2025-10-20T00:00:00Z' }, { retrievedAt: '2027-10-20T00:00:00Z' },
  ])('rejects untrusted/stale/outside-city source %j', patch => {
    expect(createEventVenueMatcher([{ ...venue, ...patch }], () => null, now)(event)).toBeNull();
  });
  it('expires a matcher as its source ages, without process restart', () => {
    let time = now;
    const match = createEventVenueMatcher([venue], () => null, () => time);
    time += 36 * 86_400_000;
    expect(match(event)).toBeNull();
  });
  it('real dated snapshot: links the two exact reviewed Жастар theatre events, no synthetic coordinates', () => {
    const address = createAddressMatcher(index as AddressIndex, now);
    const match = createEventVenueMatcher(places, address, now);
    const events = snapshot.items as LiveAstanaEvent[];
    const resolved = enrichEventAddresses(events, address, match);
    expect(resolved.filter(item => item.lat !== null && item.lon !== null)).toHaveLength(3);
    const theatre = resolved.filter(item => item.address?.includes('Жастар театры'));
    expect(theatre).toHaveLength(2);
    for (const item of theatre) expect(item).toMatchObject({ lat: 51.1905938, lon: 71.4057965,
      coordinateMatch: { sourceUrl: 'https://www.openstreetmap.org/way/30014040', method: 'osm-exact-venue-v1' } });
    expect(events.filter(item => item.lat !== null)).toHaveLength(0);
    const original = theatre[0];
    expect(match({ ...original, address: original.address!.replace(', 10', ', 11') })).toBeNull();
    expect(match({ ...original, contactUrl: 'https://sxodim.com/astana/event/unreviewed' })).toBeNull();
  });
  it('real POIs: puppet theatre and city circus work by their exact observed labels, not assumed unique aliases', () => {
    const match = createEventVenueMatcher(places, createAddressMatcher(index as AddressIndex, now), now);
    for (const name of ['Театр кукол', 'Столичный Цирк']) expect(match({ ...event, venueName: name })).not.toBeNull();
    expect(match({ ...event, venueName: 'Цирк' })).toBeNull();
  });
  it('preserves publisher coordinates and never repairs a half-known pair by guessing', () => {
    const original = snapshot.items[0] as LiveAstanaEvent;
    const items = [{ ...original, lat: 51.1, lon: 71.4 }, { ...original, lat: 51.1, lon: null }];
    expect(enrichEventAddresses(items, () => null, () => ({ lat: 51.15, lon: 71.43, sourceUrl: venue.sourceUrl,
      asOf: venue.retrievedAt, quality: 'derived', method: 'osm-exact-venue-v1', precision: 'building_or_address_point' }))).toEqual(items);
  });
  it('explicit public presentation option suppresses generated category illustrations', () => {
    const item = { ...snapshot.items[0], category: 'Театр' };
    expect(resolveEventMedia(item).kind).toBe('category_illustration');
    expect(resolveEventMedia(item, { allowCategoryIllustration: false })).toMatchObject({ kind: 'none', src: null });
  });
  it('public API does not emit generated event photos while preserving source facts and credits', async () => {
    const item = { ...snapshot.items[0], category: 'Театр' } as LiveAstanaEvent;
    const response = await handleEvents(new Request('https://qettyq.example/api/events'), { get: async () => ({
      items: [item], dataMode: 'snapshot', freshness: 'stale', cacheStatus: 'stale-fallback', fetchedAt: snapshot.fetchedAt,
      expiresAt: snapshot.expiresAt, source: snapshot.source as never, coverage: snapshot.coverage, warnings: [],
    }) });
    const body = await response.json();
    expect(body.items[0].media).toMatchObject({ kind: 'none', src: null });
    expect(body.items[0].requiredCredit).toEqual(item.requiredCredit);
    expect(body.items[0].image).toBeNull();
    expect(item).not.toHaveProperty('media');
  });
});
