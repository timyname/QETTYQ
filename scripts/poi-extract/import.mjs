#!/usr/bin/env node
/** Offline, bounded OSM GeoJSON-sequence importer. No network or geocoding.
 * Input must be osmium export --geometry-types=point,polygon --attributes=type,id
 * from the Astana-only PBF extract. Raw PBF/exports stay in ignored source-cache.
 */
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BOUNDS = { south: 51.02, west: 71.30, north: 51.22, east: 71.60 };
const MAX_PLACES = 800, MAX_ADDRESSES = 30_000, MAX_FEATURES = 200_000;
const SOURCE = 'https://download.geofabrik.de/asia/kazakhstan-261019.osm.pbf';
const categories = {
  amenity: new Set(['cafe', 'restaurant', 'fast_food', 'food_court', 'ice_cream', 'theatre', 'cinema', 'arts_centre', 'library']),
  tourism: new Set(['museum', 'gallery', 'attraction', 'viewpoint']),
  leisure: new Set(['park', 'garden', 'fitness_centre', 'sports_centre', 'swimming_pool', 'stadium']),
};
const food = new Set(['cafe', 'restaurant', 'fast_food', 'food_court', 'ice_cream']);
const culture = new Set(['theatre', 'cinema', 'arts_centre', 'library', 'museum', 'gallery', 'attraction']);
const text = (value, max = 500) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
const inBounds = ([lon, lat]) => Number.isFinite(lat) && Number.isFinite(lon)
  && lat >= BOUNDS.south && lat <= BOUNDS.north && lon >= BOUNDS.west && lon <= BOUNDS.east;
const streetKey = value => value.normalize('NFKC').toLowerCase().replaceAll('ё', 'е')
  .replace(/[«»"'’]/gu, '').replace(/[.,]/gu, ' ').replace(/\s+/gu, ' ').trim();

/** Only co-published names on an actual highway way, never inferred translation.
 * A conflicting name in any same language quarantines that exact street key.
 */
export function observedStreetAliases(roads) {
  const result = new Map();
  for (const feature of roads) {
    const tags = feature.properties ?? {}, source = identity(tags);
    if (!source || tags['@type'] !== 'way' || !tags.highway || !Array.isArray(feature.geometry?.coordinates)
      || feature.geometry.type !== 'LineString' || !feature.geometry.coordinates.some(point => Array.isArray(point) && inBounds(point))) continue;
    const variants = ['name', 'name:kk', 'name:ru', 'name:en'].flatMap(key => text(tags[key], 200) ? [[key, text(tags[key], 200)]] : []);
    if (variants.length < 2) continue;
    for (const [, name] of variants) {
      const key = streetKey(name);
      if (!result.has(key)) result.set(key, { languages: new Map(), names: new Map(), proofs: new Map() });
      const entry = result.get(key);
      for (const [language, value] of variants) {
        // `name` is often either RU or KK and is not itself a language assertion.
        if (language !== 'name') {
          if (!entry.languages.has(language)) entry.languages.set(language, new Set());
          entry.languages.get(language).add(streetKey(value));
        }
        entry.names.set(streetKey(value), value);
        if (!entry.proofs.has(streetKey(value))) entry.proofs.set(streetKey(value), source.sourceUrl);
      }
    }
  }
  for (const [key, value] of result) if ([...value.languages.values()].some(values => values.size > 1)) result.delete(key);
  return result;
}

export function enrichAddressAliases(entries, roads) {
  const lookup = observedStreetAliases(roads);
  let enriched = 0;
  const output = entries.map(entry => {
    const match = lookup.get(streetKey(entry.street));
    if (!match) return entry;
    const aliases = [...new Set([...(entry.streetAliases ?? []), ...match.names.values()])]
      .filter(name => streetKey(name) !== streetKey(entry.street));
    if (!aliases.length) return entry;
    enriched++;
    return { ...entry, streetAliases: aliases,
      streetAliasSources: [...new Set(aliases.map(name => match.proofs.get(streetKey(name))).filter(Boolean))].sort() };
  });
  return { entries: output, enriched, observedStreetKeys: lookup.size };
}

function ringCentroid(ring) {
  if (!Array.isArray(ring) || ring.length < 4 || ring.some(p => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return null;
  const first = ring[0], last = ring.at(-1);
  if (first[0] !== last[0] || first[1] !== last[1]) return null;
  let twiceArea = 0, x = 0, y = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1], cross = a[0] * b[1] - b[0] * a[1];
    twiceArea += cross; x += (a[0] + b[0]) * cross; y += (a[1] + b[1]) * cross;
  }
  if (Math.abs(twiceArea) < 1e-15) return null;
  return { point: [x / (3 * twiceArea), y / (3 * twiceArea)], weight: Math.abs(twiceArea / 2) };
}

/** Polygon area centroid is derived, NOT an entrance or organizer-confirmed point. */
export function geometryPoint(geometry) {
  if (!geometry || typeof geometry !== 'object') return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates) && inBounds(geometry.coordinates)) {
    return { lon: geometry.coordinates[0], lat: geometry.coordinates[1], quality: 'observed' };
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  if (!Array.isArray(polygons)) return null;
  let weight = 0, x = 0, y = 0;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon)) return null;
    for (let i = 0; i < polygon.length; i++) {
      const ring = ringCentroid(polygon[i]);
      if (!ring) return null;
      const signedWeight = i === 0 ? ring.weight : -ring.weight;
      weight += signedWeight; x += ring.point[0] * signedWeight; y += ring.point[1] * signedWeight;
    }
  }
  if (weight <= 0 || !inBounds([x / weight, y / weight])) return null;
  return { lon: Number((x / weight).toFixed(7)), lat: Number((y / weight).toFixed(7)), quality: 'derived' };
}

function identity(tags) {
  const type = tags['@type'], id = tags['@id'];
  return ['node', 'way', 'relation'].includes(type) && Number.isSafeInteger(id) && id > 0
    ? { id: `osm:${type}:${id}`, sourceUrl: `https://www.openstreetmap.org/${type}/${id}` } : null;
}

function category(tags) {
  for (const key of Object.keys(categories)) if (categories[key].has(tags[key])) return tags[key];
  return null;
}

export function normalizeFeature(feature, retrievedAt) {
  const tags = feature?.properties ?? {}, source = identity(tags), point = geometryPoint(feature?.geometry);
  if (!source || !point) return { place: null, address: null, blockedId: null };
  // No owner, resident, personal phone/contact, image, or arbitrary website tags in address index.
  const street = text(tags['addr:street'], 200), houseNumber = text(tags['addr:housenumber'], 30);
  const address = street && houseNumber ? { street, houseNumber, lat: point.lat, lon: point.lon,
    sourceUrl: source.sourceUrl, quality: point.quality,
    ...(['ru', 'kk', 'en'].some(language => text(tags[`addr:street:${language}`], 200))
      ? { streetAliases: [...new Set(['ru', 'kk', 'en'].map(language => text(tags[`addr:street:${language}`], 200)).filter(Boolean))] } : {}),
  } : null;
  const unsafe = ['private', 'no', 'customers_only'].includes(tags.access) || tags.military !== undefined
    || tags.construction !== undefined || tags.disused === 'yes' || tags.abandoned === 'yes'
    || tags['disused:amenity'] !== undefined || tags['abandoned:amenity'] !== undefined;
  const kind = category(tags), name = text(tags['name:ru'] ?? tags.name, 300);
  if (unsafe || !kind || !name) return { place: null, address, blockedId: unsafe ? source.id : null };
  const cuisines = (text(tags.cuisine) ?? '').split(';').map(value => value.trim()).filter(Boolean).slice(0, 20);
  const websiteValue = text(tags.website ?? tags['contact:website'], 1000);
  let website = null;
  try { const url = new URL(websiteValue); if (url.protocol === 'https:' && !url.username && !url.password) website = url.href; } catch { /* unknown */ }
  return { address, blockedId: null, place: { ...source, name, category: kind,
    lat: point.lat, lon: point.lon, address: [street, houseNumber].filter(Boolean).join(', ') || null,
    tags: [...new Set([kind, ...cuisines, ...(food.has(kind) ? ['food'] : []), ...(culture.has(kind) ? ['culture'] : [])])],
    sourceName: 'OpenStreetMap contributors', retrievedAt, dataMode: 'snapshot', price: null,
    // Existing planning defaults, NOT observed dwell-time measurements.
    durationMinutes: ['cafe', 'fast_food', 'food_court', 'ice_cream'].includes(kind) ? 35 : kind === 'restaurant' ? 55 : 60,
    openingHours: typeof tags.opening_hours === 'string' && tags.opening_hours.length <= 500
      && tags.opening_hours.trim() ? tags.opening_hours : null,
    website, cuisines, coordinateQuality: point.quality,
    nameTranslations: Object.fromEntries(['ru', 'kk', 'en'].flatMap(language => text(tags[`name:${language}`], 300) ? [[language, text(tags[`name:${language}`], 300)]] : [])),
  } };
}

export function selectPlaces(existing, candidates, blockedIds = new Set()) {
  const observed = new Map(candidates.map(place => [place.id, place]));
  const retained = existing.filter(place => !blockedIds.has(place.id)).map(place => observed.get(place.id) ?? place);
  if (retained.length > MAX_PLACES || new Set(retained.map(place => place.id)).size !== retained.length) throw new Error('Invalid existing snapshot; not overwritten');
  const keptIds = new Set(retained.map(place => place.id));
  const additions = candidates.filter(place => !keptIds.has(place.id)).sort((a, b) => {
    // Better factual coverage first, then stable ID. Round-robin category prevents a food-only sample.
    const score = p => (p.openingHours ? 8 : 0) + (p.address ? 4 : 0) + (p.cuisines.length ? 2 : 0) + (p.website ? 1 : 0);
    return score(b) - score(a) || a.id.localeCompare(b.id, 'en');
  });
  const queues = new Map();
  for (const place of additions) { if (!queues.has(place.category)) queues.set(place.category, []); queues.get(place.category).push(place); }
  const ordered = [...queues.keys()].sort();
  while (retained.length < MAX_PLACES && ordered.some(key => queues.get(key).length)) {
    for (const key of ordered) { const next = queues.get(key).shift(); if (next && retained.length < MAX_PLACES) retained.push(next); }
  }
  return retained;
}

async function main() {
  const args = process.argv.slice(2), get = key => args[args.indexOf(key) + 1];
  if (args.includes('--enrich-addresses-only')) {
    const streetsInput = args.includes('--streets-input') ? get('--streets-input') : null;
    if (!args.includes('--write') || !streetsInput) throw new Error('Street enrichment requires --streets-input PATH --enrich-addresses-only --write');
    const inputSize = (await stat(streetsInput)).size;
    if (inputSize <= 0 || inputSize > 100_000_000) throw new Error('Street export byte bound exceeded');
    const index = JSON.parse(await readFile('data/astana-address-index.json', 'utf8'));
    if (index.source?.url !== SOURCE || index.source?.license !== 'ODbL-1.0' || index.entries?.length > MAX_ADDRESSES) throw new Error('Unexpected address source');
    const roads = [];
    const lines = createInterface({ input: createReadStream(streetsInput), crlfDelay: Infinity });
    let streetFeatures = 0;
    for await (const line of lines) {
      const clean = line.replace(/^\u001e/u, '').trim();
      if (!clean) continue;
      if (++streetFeatures > MAX_FEATURES || clean.length > 4_000_000) throw new Error('Street feature/line bound exceeded');
      const feature = JSON.parse(clean);
      if (feature.properties?.name || feature.properties?.['name:kk'] || feature.properties?.['name:ru']) roads.push(feature);
    }
    const enrichment = enrichAddressAliases(index.entries, roads);
    const metadataPath = `data/snapshots/osm-astana-geofabrik-${index.source.retrievedAt.slice(0, 10)}.json`;
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    metadata.streetAliases = { method: 'exact-normalized-observed-highway-names-v1', streetFeatures,
      namedRoadsRead: roads.length, observedStreetKeys: enrichment.observedStreetKeys, enrichedAddresses: enrichment.enriched,
      rule: 'Only exact normalized addr:street ↔ observed highway name/name:kk/name:ru/name:en; conflicting same-language names quarantined; no transliteration or inferred aliases.' };
    await writeFile('data/astana-address-index.json', `${JSON.stringify({ ...index, entries: enrichment.entries })}\n`);
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(JSON.stringify(metadata.streetAliases, null, 2));
    return;
  }
  const input = get('--input'), asOf = get('--source-as-of'), retrievedAt = get('--retrieved-at');
  const sha256 = get('--pbf-sha256'), pbfBytes = Number(get('--pbf-bytes'));
  if (!args.includes('--write') || !input || !args.includes('--input') || !args.includes('--source-as-of')
    || !args.includes('--retrieved-at') || !/^\d{4}-\d\d-\d\dT/.test(asOf ?? '')
    || !Number.isFinite(Date.parse(asOf)) || !Number.isFinite(Date.parse(retrievedAt)) || Date.parse(asOf) > Date.parse(retrievedAt)
    || !/^[a-f0-9]{64}$/.test(sha256 ?? '') || !Number.isInteger(pbfBytes) || pbfBytes <= 1000 || pbfBytes > 300_000_000) {
    throw new Error('Usage: node scripts/poi-extract/import.mjs --input ignored-export.geojsonseq --source-as-of ISO --retrieved-at ISO --pbf-sha256 HEX --pbf-bytes N --write');
  }
  const info = await stat(input);
  if (info.size <= 0 || info.size > 100_000_000) throw new Error('Input export must be 1..100000000 bytes');
  const existing = JSON.parse(await readFile('data/places.json', 'utf8'));
  const places = new Map(), addresses = new Map(), blocked = new Set();
  let features = 0, excludedGeometryOrIdentity = 0;
  const lines = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
  for await (const line of lines) {
    const clean = line.replace(/^\u001e/u, '').trim();
    if (!clean) continue;
    if (++features > MAX_FEATURES || clean.length > 4_000_000) throw new Error('Input feature/geometry bound exceeded');
    const feature = JSON.parse(clean), normalized = normalizeFeature(feature, retrievedAt);
    if (!identity(feature.properties ?? {}) || !geometryPoint(feature.geometry)) excludedGeometryOrIdentity++;
    if (normalized.blockedId) blocked.add(normalized.blockedId);
    if (normalized.place) places.set(normalized.place.id, normalized.place);
    if (normalized.address) {
      const a = normalized.address, key = `${a.street}\u0000${a.houseNumber}\u0000${a.lat.toFixed(6)}\u0000${a.lon.toFixed(6)}`;
      const previous = addresses.get(key);
      if (!previous || previous.quality === 'derived' && a.quality === 'observed') addresses.set(key, a);
    }
  }
  const selected = selectPlaces(existing, [...places.values()], blocked);
  if (selected.length < existing.length || selected.length > MAX_PLACES || !places.size) throw new Error('Unexpected empty/shrinking/over-limit POI import; previous files preserved');
  if (addresses.size > MAX_ADDRESSES) throw new Error('Address index exceeds 30000 entries; previous files preserved');
  const entries = [...addresses.values()].sort((a, b) => a.street.localeCompare(b.street, 'ru') || a.houseNumber.localeCompare(b.houseNumber, 'ru') || a.sourceUrl.localeCompare(b.sourceUrl, 'en'));
  const source = { url: SOURCE, asOf, retrievedAt, license: 'ODbL-1.0' };
  const retainedOldIds = selected.filter(p => existing.some(old => old.id === p.id));
  const meta = { source, importerVersion: 'qettyq-osmium-city-v1', pbfBytes, pbfSha256: sha256,
    bounds: BOUNDS, limits: { maxPlaces: MAX_PLACES, maxAddresses: MAX_ADDRESSES, maxFeatures: MAX_FEATURES },
    featuresRead: features, excludedGeometryOrIdentity, eligiblePlaces: places.size,
    records: selected.length, previousRecords: existing.length, previousIdsRetained: retainedOldIds.length,
    previousIdsUpdatedFromExtract: retainedOldIds.filter(p => places.has(p.id)).length,
    staleRetainedIds: retainedOldIds.filter(p => !places.has(p.id)).map(p => p.id),
    withHours: selected.filter(p => p.openingHours).length, withCuisine: selected.filter(p => p.cuisines?.length).length,
    withAddress: selected.filter(p => p.address).length, addresses: entries.length,
    coordinateQuality: { observed: selected.filter(p => p.coordinateQuality === 'observed').length, derived: selected.filter(p => p.coordinateQuality === 'derived').length },
    addressCoordinateQuality: { observed: entries.filter(p => p.quality === 'observed').length, derived: entries.filter(p => p.quality === 'derived').length },
    categoryCounts: Object.fromEntries([...new Set(selected.map(p => p.category))].sort().map(key => [key, selected.filter(p => p.category === key).length])),
    attribution: '© OpenStreetMap contributors', licenseUrl: 'https://www.openstreetmap.org/copyright',
    notes: ['Snapshot, not live business hours; source.asOf is the raw extract cutoff, not retrieval time.',
      'Polygon centroids are derived approximate geometry points, not entrances; missing geometry is omitted.',
      'opening_hours/cuisine/name translations are unmodified observed tags; missing values remain unknown.',
      'durationMinutes is an inherited deterministic planning default, not an observed visit duration.',
      'No prices, photographs, residents, owners or personal contact fields were imported.',
      'Address index retains ambiguous distinct points; consumer must reject non-unique exact matches.'],
  };
  await mkdir('data/snapshots', { recursive: true });
  // All parsing/limits/validation above complete before intentional dataset replacement.
  await writeFile('data/places.json', `${JSON.stringify(selected, null, 2)}\n`);
  await writeFile('data/astana-address-index.json', `${JSON.stringify({ source, entries })}\n`);
  await writeFile(`data/snapshots/osm-astana-geofabrik-${retrievedAt.slice(0, 10)}.json`, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(JSON.stringify(meta, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
