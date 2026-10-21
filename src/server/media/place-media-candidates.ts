/** Offline discovery only. An OSM tag proves a source link, not image rights.
 * Output is never consumed by display resolvers and never authorizes a fetch.
 */
export type MediaCandidatePlace = { id: string; name: string; sourceUrl: string };
export type PlaceMediaCandidate = {
  placeId: string; name: string; osmUrl: string; sourceAsOf: string;
  links: Array<{ tag: 'wikimedia_commons' | 'wikidata' | 'image'; value: string; reviewUrl: string }>;
  state: 'needs_file_identity_and_rights_review'; allowDownload: false; allowDisplay: false;
};

const clean = (value: unknown, max = 300): value is string => typeof value === 'string'
  && value.trim().length > 0 && value.length <= max && !/[<>\u0000-\u001f]/u.test(value);
function reviewImageUrl(value: unknown): string | null {
  if (!clean(value, 1500)) return null;
  try {
    const url = new URL(value);
    // Links are review-only, never an HTTP fetch allowlist. Reject credentials,
    // query tokens, local hosts/IPs and unsafe protocols even in review output.
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
      || !/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/u.test(url.hostname)
      || /\.(?:local|localhost|internal|test|invalid|lan)$/u.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

export function collectPlaceMediaCandidates(
  places: MediaCandidatePlace[], features: unknown[], sourceAsOf: string,
): PlaceMediaCandidate[] {
  if (!Number.isFinite(Date.parse(sourceAsOf)) || places.length > 10_000 || features.length > 100_000) throw new Error('Invalid bounded media discovery input');
  const indexed = new Map(places.filter(place => /^osm:(?:node|way|relation):[1-9]\d*$/u.test(place.id)
    && clean(place.name) && place.sourceUrl === place.id.replace(/^osm:(node|way|relation):/u, 'https://www.openstreetmap.org/$1/'))
    .map(place => [place.id, place]));
  const output = new Map<string, PlaceMediaCandidate>();
  for (const feature of features) {
    const raw = feature as { properties?: Record<string, unknown> } | null;
    const tags = raw?.properties;
    if (!tags || !['node', 'way', 'relation'].includes(String(tags['@type']))
      || !/^[1-9]\d*$/u.test(String(tags['@id']))) continue;
    const placeId = `osm:${tags['@type']}:${tags['@id']}`, place = indexed.get(placeId);
    if (!place) continue;
    const links: PlaceMediaCandidate['links'] = [];
    const commons = tags.wikimedia_commons;
    if (clean(commons) && /^(?:Category|File):\S/u.test(commons) && !/[#?]/u.test(commons)) {
      links.push({ tag: 'wikimedia_commons', value: commons,
        reviewUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(commons.replaceAll(' ', '_'))}` });
    }
    const wikidata = tags.wikidata;
    if (typeof wikidata === 'string' && /^Q[1-9]\d*$/u.test(wikidata)) links.push({ tag: 'wikidata', value: wikidata, reviewUrl: `https://www.wikidata.org/wiki/${wikidata}` });
    const image = reviewImageUrl(tags.image);
    if (image) links.push({ tag: 'image', value: image, reviewUrl: image });
    if (!links.length) continue;
    // Conflicting duplicate records are not silently merged or chosen first.
    const previous = output.get(placeId);
    if (previous && JSON.stringify(previous.links) !== JSON.stringify(links)) throw new Error('Conflicting OSM media source records');
    output.set(placeId, { placeId, name: place.name, osmUrl: place.sourceUrl, sourceAsOf, links,
      state: 'needs_file_identity_and_rights_review', allowDownload: false, allowDisplay: false });
  }
  return [...output.values()].sort((a, b) => a.placeId.localeCompare(b.placeId, 'en'));
}
