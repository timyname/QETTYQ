import type { AddressMatch } from './address-match';
import type { LiveAstanaEvent } from './sxodim-live';
import { reviewedEventVenueCorrespondences } from './reviewed-event-venues';

export type VenueGeoRecord = {
  id: string; name: string; lat: number; lon: number; address: string | null;
  sourceUrl: string; retrievedAt: string; nameTranslations?: Record<string, string | undefined>;
};
export type VenueMatch = Omit<AddressMatch, 'method'> & { method: 'osm-exact-venue-v1' };
const normalized = (value: string) => value.normalize('NFKC').toLowerCase().replaceAll('ё', 'е')
  .replace(/[\u200b-\u200d\ufeff«»"“”]/gu, '').replace(/\s+/gu, ' ').trim();
const osmUrl = /^https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/\d+$/u;
const MAX_AGE = 35 * 86_400_000;

// Explicitly reviewed correspondence, not fuzzy spelling/transliteration rules.
// Both publisher pages identify this named theatre and house 10; the independently
// collected OSM building has the same name/house, with its Kazakh street spelling.
// No coordinates are duplicated here: the current valid source record supplies them.
const reviewedAddresses = [{
  venueId: 'osm:way:30014040',
  eventUrls: [
    'https://sxodim.com/astana/event/mama-spektakli',
    'https://sxodim.com/astana/event/liara-spektakli',
  ],
  address: 'Астана қаласы, Жастар театры, к. Илияс Есенберлина, 10',
  sourceAddress: 'Ілияс Есенберлин көшесі, 10',
  reviewedAt: '2026-10-20T22:55:00Z',
}];

/** Public event/venue linking only. No personal GPS, network, Google data or LLM.
 * A unique exact observed venue label is required, never "the only theatre".
 * An explicit street address must independently agree or have a scoped review.
 * Unresolvable/conflicting addresses fail closed, including same-name branches.
 */
export function createEventVenueMatcher(
  places: VenueGeoRecord[],
  matchAddress: (address: string | null) => AddressMatch | null,
  now: number | (() => number) = Date.now,
) {
  const clock = typeof now === 'number' ? () => now : now;
  const valid = places.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lon)
    && place.lat >= 51.02 && place.lat <= 51.22 && place.lon >= 71.30 && place.lon <= 71.60
    && osmUrl.test(place.sourceUrl) && place.id === place.sourceUrl.replace('https://www.openstreetmap.org/', 'osm:').replace('/', ':')
    && Number.isFinite(Date.parse(place.retrievedAt)) && Date.parse(place.retrievedAt) <= clock() + 300_000
    && clock() - Date.parse(place.retrievedAt) < MAX_AGE);
  const names = new Map<string, VenueGeoRecord[]>();
  for (const place of valid) for (const name of new Set([place.name, ...Object.values(place.nameTranslations ?? {})].filter((value): value is string => typeof value === 'string').map(normalized))) {
    if (name.length < 4 || name.length > 250) continue;
    names.set(name, [...(names.get(name) ?? []), place]);
  }
  return (event: Pick<LiveAstanaEvent, 'venueName' | 'address' | 'contactUrl'>): VenueMatch | null => {
    if ((event.address?.length ?? 0) > 1000 || (event.venueName?.length ?? 0) > 250) return null;
    const scoped = reviewedEventVenueCorrespondences.filter(review => review.eventUrl === event.contactUrl
      && normalized(review.eventVenueName) === normalized(event.venueName ?? '')
      && normalized(review.eventAddress) === normalized(event.address ?? ''));
    if (scoped.length) {
      if (scoped.length !== 1) return null;
      const review = scoped[0], time = clock(), reviewed = Date.parse(review.reviewedAt);
      if (!Number.isFinite(reviewed) || reviewed > time || time - reviewed >= MAX_AGE) return null;
      if (review.sourceKind === 'venue') {
        const records = valid.filter(place => place.id === review.sourceId && place.sourceUrl === review.sourceUrl
          && normalized(place.address ?? '') === normalized(review.sourceAddress)
          && normalized(place.name) === normalized(review.sourceName));
        if (records.length !== 1 || time - Date.parse(records[0].retrievedAt) >= MAX_AGE) return null;
        const place = records[0];
        return { lat: place.lat, lon: place.lon, sourceUrl: place.sourceUrl, asOf: place.retrievedAt,
          quality: 'derived', method: 'osm-exact-venue-v1', precision: 'building_or_address_point' };
      }
      const point = matchAddress(review.sourceAddress), asOf = point ? Date.parse(point.asOf) : NaN;
      if (!point || point.sourceUrl !== review.sourceUrl || !osmUrl.test(point.sourceUrl)
        || point.quality !== 'derived' || point.method !== 'osm-exact-address-v1'
        || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || point.lat < 51.02 || point.lat > 51.22 || point.lon < 71.30 || point.lon > 71.60
        || !Number.isFinite(asOf) || asOf > time + 300_000 || time - asOf >= MAX_AGE) return null;
      return { ...point, method: 'osm-exact-venue-v1' };
    }
    const labels = [event.venueName ?? '', ...(event.address ?? '').split(/[,;]/u)].map(normalized);
    const candidates = [...new Map(labels.flatMap(label => names.get(label) ?? []).map(place => [place.id, place])).values()];
    // Do not pick the first branch or infer uniqueness from only the event category.
    if (candidates.length !== 1) return null;
    const place = candidates[0];
    if (clock() - Date.parse(place.retrievedAt) >= MAX_AGE) return null;
    const addressLabels = (event.address ?? '').split(/[,;]/u).map(normalized).filter(Boolean);
    const venueOnly = addressLabels.every(label => labels.includes(label) && (names.get(label) ?? []).some(item => item.id === place.id)
      || ['астана', 'astana', 'астана қаласы'].includes(label));
    if (!venueOnly) {
      const observed = matchAddress(event.address);
      const samePoint = observed !== null && Math.abs(observed.lat - place.lat) < 0.000001 && Math.abs(observed.lon - place.lon) < 0.000001;
      const reviewed = reviewedAddresses.some(review => review.venueId === place.id
        && review.eventUrls.includes(event.contactUrl) && normalized(review.address) === normalized(event.address ?? '')
        && normalized(review.sourceAddress) === normalized(place.address ?? '')
        && Date.parse(review.reviewedAt) <= clock() && clock() - Date.parse(review.reviewedAt) < MAX_AGE);
      if (!samePoint && !reviewed) return null;
    }
    return { lat: place.lat, lon: place.lon, sourceUrl: place.sourceUrl, asOf: place.retrievedAt,
      quality: 'derived', method: 'osm-exact-venue-v1', precision: 'building_or_address_point' };
  };
}
