import { describe, expect, it } from 'vitest';
import places from '../../data/places.json';
import { publicAddressIndex as index } from '../../src/server/ingestion/public-address-index';
import { createAddressMatcher, type AddressIndex } from '../../src/server/ingestion/address-match';
import { createEventVenueMatcher } from '../../src/server/ingestion/event-geo-media';
import { reviewedEventVenueCorrespondences as reviews } from '../../src/server/ingestion/reviewed-event-venues';

const now = Date.parse('2026-10-24T18:00:00Z');
const event = (review: typeof reviews[number]) => ({ venueName: review.eventVenueName, address: review.eventAddress, contactUrl: review.eventUrl });
const matcher = () => createEventVenueMatcher(places, createAddressMatcher(index as AddressIndex, now), now);

describe('documentary URL/address/venue scoped geodata, actual approved OSM snapshot', () => {
  it.each(reviews)('resolves only the fresh current source object for $eventUrl', review => {
    const point = matcher()(event(review));
    expect(point).toMatchObject({ sourceUrl: review.sourceUrl, quality: 'derived', method: 'osm-exact-venue-v1', precision: 'building_or_address_point' });
    const source = review.sourceKind === 'venue' ? places.find(place => place.id === review.sourceId)!
      : index.entries.find(entry => entry.sourceUrl === review.sourceUrl)!;
    expect(point?.lat).toBe(source.lat); expect(point?.lon).toBe(source.lon);
  });
  it.each(reviews)('does not apply a reviewed correspondence to another URL, address or branch: $eventUrl', review => {
    const match = matcher(), current = event(review);
    for (const changed of [{ ...current, contactUrl: current.contactUrl + '-other' }, { ...current, address: current.address + ', корпус 2' },
      { ...current, venueName: current.venueName + ' branch 2' }, { ...current, address: current.address.replace(/, (\d)/u, ', 9$1') }]) expect(match(changed)).toBeNull();
  });
  it('never chooses the first of conflicting duplicate source-ID records', () => {
    const review = reviews[0], original = places.find(place => place.id === review.sourceId)!;
    const match = createEventVenueMatcher([...places, { ...original, lon: original.lon + 0.01 }], () => null, now);
    expect(match(event(review))).toBeNull();
  });
  it('requires the current reviewed source name and complete source street/house', () => {
    const review = reviews[0];
    for (const patch of [{ name: 'Changed Business' }, { address: 'Александр Кравцов көшесі, 7' }, { retrievedAt: '2026-01-01T00:00:00Z' }]) {
      const current = places.map(place => place.id === review.sourceId ? { ...place, ...patch } : place);
      expect(createEventVenueMatcher(current, () => null, now)(event(review))).toBeNull();
    }
  });
  it('does not use a different address object or a nearby point as documentary proof', () => {
    const review = reviews[2], source = createAddressMatcher(index as AddressIndex, now)(review.sourceAddress)!;
    for (const patch of [{ sourceUrl: 'https://www.openstreetmap.org/way/999' }, { asOf: '2020-01-01T00:00:00Z' },
      { asOf: '2030-01-01T00:00:00Z' }, { lat: 52 }, { lon: NaN }]) {
      expect(createEventVenueMatcher(places, () => ({ ...source, ...patch }), now)(event(review))).toBeNull();
    }
    expect(createEventVenueMatcher(places, () => null, now)(event(review))).toBeNull();
  });
  it('expires source records and reviews without requiring a process restart', () => {
    let time = now;
    const match = createEventVenueMatcher(places, createAddressMatcher(index as AddressIndex, () => time), () => time);
    expect(match(event(reviews[0]))).not.toBeNull(); time += 36 * 86400_000;
    for (const review of reviews) expect(match(event(review))).toBeNull();
  });
  it('rejects a correspondence before it was reviewed, even when old source geography exists', () => {
    const time = Date.parse('2026-10-24T12:00:00Z');
    const match = createEventVenueMatcher(places, createAddressMatcher(index as AddressIndex, time), time);
    for (const review of reviews) expect(match(event(review))).toBeNull();
  });
});
