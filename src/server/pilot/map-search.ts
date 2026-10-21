import addresses from '../../../data/astana-address-index.json';
import { pilotPlaces } from './catalog';
import { mapSearchMatches, mapSearchText, type MapSearchResult } from '../../client/map-search-text';

const addressRows = addresses.entries.map((row, index) => ({ row, id: `address-${index}`,
  text: `${row.street} ${'streetAliases' in row ? (row.streetAliases as string[]).join(' ') : ''} ${row.houseNumber}` }));

/** Offline sourced snapshot, no search text retained, geocoder or paid calls. */
export function searchMapSnapshot(query: string, now = Date.now()): MapSearchResult[] {
  if (query.trim().length < 2 || query.length > 160) return [];
  const needle = mapSearchText(query);
  const places = pilotPlaces.filter(place => mapSearchMatches(`${place.name} ${place.address ?? ''}`, query))
    .sort((a, b) => Number(mapSearchText(b.name) === needle) - Number(mapSearchText(a.name) === needle) || a.name.localeCompare(b.name))
    .slice(0, 8).map(place => ({ id: place.id, kind: 'place' as const, title: place.name, address: place.address,
      lat: place.lat, lon: place.lon, sourceUrl: place.sourceUrl, quality: place.coordinateQuality ?? 'observed', asOf: place.retrievedAt }));
  const fresh = now >= Date.parse(addresses.source.asOf) && now - Date.parse(addresses.source.asOf) < 35 * 86400_000;
  const matches: MapSearchResult[] = fresh ? addressRows.filter(entry => mapSearchMatches(entry.text, query)).slice(0, 8).map(({ row, id }) => ({ id, kind: 'address', title: `${row.street}, ${row.houseNumber}`, address: null,
    lat: row.lat, lon: row.lon, sourceUrl: row.sourceUrl, quality: 'derived', asOf: addresses.source.asOf })) : [];
  return [...places, ...matches].slice(0, 8);
}
