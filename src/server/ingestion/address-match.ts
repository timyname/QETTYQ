import type { LiveAstanaEvent } from './sxodim-live';
import type { VenueMatch } from './event-geo-media';

export type AddressIndex = { source: { url: string; asOf: string; retrievedAt: string; license: string }; entries: Array<{
  street: string; houseNumber: string; lat: number; lon: number; sourceUrl: string;
  quality: 'observed' | 'derived'; streetAliases?: string[];
}> };
export type AddressMatch = { lat: number; lon: number; sourceUrl: string; asOf: string;
  quality: 'derived'; method: 'osm-exact-address-v1'; precision: 'building_or_address_point' };

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replaceAll('ё', 'е')
  .replace(/[«»"'’]/gu, '').replace(/\b(?:street|avenue)\b/gu, ' ')
  .replace(/(?:^|\s)(?:улица|ул\.?|проспект|просп\.?|пр\.?|пр-т|көшесі|даңғылы)(?=\s|$)/gu, ' ')
  .replace(/[.,]/gu, ' ').replace(/\s+/gu, ' ').trim();
const house = (value: string) => value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, '')
  .replace(/(?<=\d)-(?=[\p{L}])/gu, '');
const hasBuildingModifier = (value: string) => /(?:^|[\s,(])(?:корпус|корп\.|строени|стр\.\s*[\p{L}\d]|блок|литер|к\.?\s*\d|building|block|bldg)/iu.test(value);
const parseHouse = (value: string) => {
  if (hasBuildingModifier(value) || /\([^)]*\d/u.test(value)) return null;
  const candidate = value.trim().replace(/\s*\([^()]{1,100}\)\s*$/u, '').trim();
  return /^\d+(?:\s*-?\s*[а-яa-z]\d*|\s*[/-]\s*\d+)*(?:\.\d+)*$/iu.test(candidate) ? house(candidate) : null;
};
const valid = (entry: AddressIndex['entries'][number]) => Number.isFinite(entry.lat) && Number.isFinite(entry.lon)
  && entry.lat >= 51.02 && entry.lat <= 51.22 && entry.lon >= 71.30 && entry.lon <= 71.60
  && /^https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/\d+$/u.test(entry.sourceUrl);

/** Public venue addresses only, offline. Never accepts a user's location or calls a geocoder.
 * Exact observed street + house required; no transliteration, nearest point or fuzzy guessing.
 */
export function createAddressMatcher(index: AddressIndex, now: number | (() => number) = Date.now) {
  const clock = typeof now === 'number' ? () => now : now;
  const checkedAt = clock();
  const asOf = Date.parse(index.source.asOf), fetched = Date.parse(index.source.retrievedAt);
  const usable = index.source.license === 'ODbL-1.0' && /^https:\/\/download\.geofabrik\.de\/asia\/kazakhstan/u.test(index.source.url)
    && Number.isFinite(asOf) && Number.isFinite(fetched) && asOf <= fetched && fetched <= checkedAt + 300_000
    && checkedAt - asOf < 35 * 86400_000 && index.entries.length <= 30000;
  const streets = new Map<string, Map<string, AddressIndex['entries']>>();
  if (usable) for (const entry of index.entries.filter(valid)) {
    const number = parseHouse(entry.houseNumber);
    if (!number || number.length > 30) continue;
    for (const street of new Set([entry.street, ...(entry.streetAliases ?? [])].map(normalize).filter(Boolean))) {
      const houses = streets.get(street) ?? new Map<string, AddressIndex['entries']>();
      const points = houses.get(number) ?? [];
      points.push(entry); houses.set(number, points); streets.set(street, houses);
    }
  }
  return (address: string | null): AddressMatch | null => {
    if (!address || address.length > 1000 || hasBuildingModifier(address) || clock() - asOf >= 35 * 86400_000) return null;
    // Preserve punctuation and compare a WHOLE street segment, not a name substring.
    // A house segment must be complete:14.2/14-2/14А are never truncated to14.
    const segments = address.normalize('NFKC').replace(/[\u200b-\u200d\ufeff]/gu, '').split(/[,;]/u).map(value => value.trim());
    const matches: AddressIndex['entries'] = [];
    const collect = (street: string, rawNumber: string) => {
      const number = parseHouse(rawNumber);
      if (number) matches.push(...(streets.get(normalize(street))?.get(number) ?? []));
    };
    for (const [position, segment] of segments.entries()) {
      if (segments[position + 1]) collect(segment, segments[position + 1]);
      for (const split of segment.matchAll(/\s+(?=\d)/gu)) {
        collect(segment.slice(0, split.index), segment.slice(split.index).trim());
      }
    }
    const distinct = [...new Map(matches.map(entry => [`${entry.lat.toFixed(6)},${entry.lon.toFixed(6)}`, entry])).values()];
    if (distinct.length !== 1) return null;
    const entry = distinct[0];
    return { lat: entry.lat, lon: entry.lon, sourceUrl: entry.sourceUrl, asOf: index.source.asOf,
      quality: 'derived', method: 'osm-exact-address-v1', precision: 'building_or_address_point' };
  };
}

export function enrichEventAddresses(events: LiveAstanaEvent[], match: ReturnType<typeof createAddressMatcher>, matchVenue?: (event: LiveAstanaEvent) => VenueMatch | null): LiveAstanaEvent[] {
  return events.map(event => {
    if (event.lat !== null || event.lon !== null) return event;
    const result = match(event.address) ?? matchVenue?.(event);
    if (!result) return event;
    return { ...event, lat: result.lat, lon: result.lon, coordinateMatch: result, coordinateQuality: 'derived',
      coordinateProvenance: { sourceUrl: result.sourceUrl, fetchedAt: result.asOf, quality: 'derived', methodId: result.method },
      warnings: [...event.warnings.filter(value => !/Координаты не предоставлены/u.test(value)),
        'Точка определена по точному адресу OpenStreetMap, не подтверждена организатором; вход уточняйте.'],
    };
  });
}
