import registry from '../../../data/publisher-place-media.json';
import places from '../../../data/places.json';

export type PublisherPlacePhoto = {
  kind: 'publisher_place_photo'; src: string; alt: string; author: null; photographer: null;
  publisher: 'Давай Сходим'; credit: string; license: string; licenseUrl: string;
  sourceUrl: string; width: number; height: number; changes: string;
};
export type PublisherPlaceRecord = {
  placeId: string; sourcePageUrl: string; sourceImageUrl: string; sourceName: string;
  sourceAddress: string; sourceHouse: string; sourceStreetAlias: string;
  sourceLat: number; sourceLon: number; catalogName: string; catalogLat: number; catalogLon: number;
  articleImageEvidence?: { sourceArticleUrl: string; sectionTitle: string; sourceArticleAddress: string;
    sourceStreetAlias: string; sourceHouse: string; singleVenueSection: true };
  identity: { method: 'exact_name_and_observed_address' | 'exact_name_and_shared_address_building';
    observedStreet: string; observedStreetAliases: string[]; streetAliasSourceUrl: string;
    observedHouse: string; osmSourceUrl: string; boundary?: number[][]; sourceAsOf: string };
  status: 'approved' | 'blocked' | 'revoked'; rightsBasis: 'publisher_public_noncommercial_permission_with_credit_and_link';
  termsUrl: string; reviewedAt: string; reviewExpiresAt: string; fetchedAt: string;
  sha256: string; bytes: number; width: number; height: number; mime: 'image/jpeg';
  visualVerified: boolean; knownThirdPartyRestriction: boolean; alt: string; modifications: string;
};
const terms = 'https://sxodim.com/polzovatelskoe-soglashenie';
const plain = (v: unknown, max = 500): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[<>\u0000-\u001f]/u.test(v);
const normalizedName = (v: string) => v.normalize('NFKC').toLowerCase().replace(/^ресторан\s*/u, '').replace(/[«»"'\s]/gu, '');
const articleAddressPart = (v: string) => v.normalize('NFKC').toLowerCase().trim()
  .replace(/^(?:проспект\s+|улица\s+|пр\.\s*|ул\.\s*)/u, '').replace(/[,\s]/gu, '');
/** Separately reviewed, single-venue article section. The canonical place page
 * still supplies the observed identity/coordinates; a generic OG image is never
 * treated as proof that every inline article image belongs to this venue. */
function validArticleImageEvidence(p: PublisherPlaceRecord): boolean {
  const proof = p.articleImageEvidence;
  return Boolean(proof && proof.singleVenueSection === true && plain(p.sourceName) && plain(proof.sourceHouse, 30)
    && /^https:\/\/sxodim\.com\/astana\/article\/[a-z0-9-]+$/u.test(proof.sourceArticleUrl)
    && plain(proof.sectionTitle) && normalizedName(proof.sectionTitle) === normalizedName(p.sourceName)
    && plain(proof.sourceArticleAddress) && plain(proof.sourceStreetAlias)
    && proof.sourceHouse === p.sourceHouse
    // Punctuation/known road-prefix normalization only; never transliteration,
    // fuzzy street matching or inventing a new observed OSM alias.
    && /\p{L}/u.test(articleAddressPart(proof.sourceStreetAlias))
    && articleAddressPart(proof.sourceArticleAddress) === articleAddressPart(proof.sourceStreetAlias) + articleAddressPart(proof.sourceHouse)
    && Array.isArray(p.identity?.observedStreetAliases) && p.identity.observedStreetAliases.includes(proof.sourceStreetAlias));
}
function inside(lat: number, lon: number, ring?: number[][]): boolean {
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 500 || !ring.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
    || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) return false;
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i], [px, py] = ring[j];
    if ((y > lat) !== (py > lat) && lon < (px - x) * (lat - y) / (py - y) + x) result = !result;
  }
  return result;
}

/** Exact observed name + independently observed address/building proof.
 * Distance is only an extra rejection gate, NEVER a match by itself.
 */
export function validPublisherPlaceIdentity(p: PublisherPlaceRecord): boolean {
  const place = places.find(v => v.id === p.placeId);
  if (!place || p.catalogName !== place.name || p.catalogLat !== place.lat || p.catalogLon !== place.lon
    || !plain(p.sourceName) || normalizedName(p.sourceName) !== normalizedName(place.name)
    || ![p.sourceLat, p.sourceLon].every(Number.isFinite) || !plain(p.sourceAddress) || !plain(p.sourceStreetAlias)
    || !p.sourceAddress.includes(p.sourceStreetAlias) || !plain(p.sourceHouse, 30)
    || p.sourceAddress.split(',').at(-1)?.trim() !== p.sourceHouse
    || !p.identity || !plain(p.identity.observedStreet) || p.identity.observedHouse !== p.sourceHouse
    || !Array.isArray(p.identity.observedStreetAliases) || !p.identity.observedStreetAliases.includes(p.sourceStreetAlias)
    || !/^https:\/\/www\.openstreetmap\.org\/way\/[1-9]\d*$/u.test(p.identity.streetAliasSourceUrl)
    || !/^https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/[1-9]\d*$/u.test(p.identity.osmSourceUrl)
    || !Number.isFinite(Date.parse(p.identity.sourceAsOf))) return false;
  const metres = Math.hypot((p.sourceLat - place.lat) * 111_195, (p.sourceLon - place.lon) * 111_195 * Math.cos(place.lat * Math.PI / 180));
  if (metres > 80) return false;
  if (p.identity.method === 'exact_name_and_observed_address') return p.identity.osmSourceUrl === place.sourceUrl
    && place.address === `${p.identity.observedStreet}, ${p.sourceHouse}`;
  return p.identity.method === 'exact_name_and_shared_address_building'
    && inside(place.lat, place.lon, p.identity.boundary) && inside(p.sourceLat, p.sourceLon, p.identity.boundary);
}

export function resolvePublisherPlaceMedia(placeId: string, input: unknown = registry, now = Date.now()): PublisherPlacePhoto | null {
  const data = input as { version?: unknown; enabled?: unknown; monetizationEnabled?: unknown; scope?: unknown; termsUrl?: unknown; records?: unknown } | null;
  if (!Number.isFinite(now) || data?.version !== 1 || data.enabled !== true || data.monetizationEnabled !== false
    || data.scope !== 'noncommercial_pilot_only' || data.termsUrl !== terms || !Array.isArray(data.records) || data.records.length > 100) return null;
  for (const value of data.records) {
    const p = value as PublisherPlaceRecord | null;
    if (!p || p.placeId !== placeId || p.status !== 'approved' || p.rightsBasis !== 'publisher_public_noncommercial_permission_with_credit_and_link'
      || p.termsUrl !== terms || p.visualVerified !== true || p.knownThirdPartyRestriction !== false
      || !/^https:\/\/sxodim\.com\/astana\/place\/[a-z0-9-]+$/u.test(p.sourcePageUrl)
      || p.articleImageEvidence !== undefined && !validArticleImageEvidence(p)
      || !(/^https:\/\/sxodim\.com\/uploads\/posts\/[a-z0-9/_.-]+\.jpg$/iu.test(p.sourceImageUrl)
        || validArticleImageEvidence(p) && /^https:\/\/sxodim\.com\/uploads\/astana\/20\d{2}\/\d{2}\/[a-z0-9_.-]+\.jpg$/iu.test(p.sourceImageUrl)) || p.sourceImageUrl.includes('..')
      || !/^[a-f0-9]{64}$/u.test(p.sha256) || p.mime !== 'image/jpeg' || !plain(p.alt) || !plain(p.modifications)
      || !Number.isInteger(p.bytes) || p.bytes < 100 || p.bytes > 3_000_000
      || !Number.isInteger(p.width) || !Number.isInteger(p.height) || Math.min(p.width, p.height) < 64 || Math.max(p.width, p.height) > 3000
      || !validPublisherPlaceIdentity(p)) continue;
    const reviewed = Date.parse(p.reviewedAt), expires = Date.parse(p.reviewExpiresAt), fetched = Date.parse(p.fetchedAt);
    const sourceAsOf = Date.parse(p.identity.sourceAsOf);
    if (![reviewed, expires, fetched].every(Number.isFinite) || reviewed > now || fetched > now || expires <= now || expires - reviewed > 31 * 86_400_000
      || sourceAsOf > now || now - sourceAsOf > 35 * 86_400_000) continue;
    return { kind: 'publisher_place_photo', src: `/api/media/places/${p.sha256}`, alt: p.alt, author: null, photographer: null,
      publisher: 'Давай Сходим', credit: 'Давай Сходим · некоммерческий пилот', license: 'Publisher noncommercial permission', licenseUrl: terms,
      sourceUrl: p.articleImageEvidence?.sourceArticleUrl ?? p.sourcePageUrl, width: p.width, height: p.height, changes: p.modifications };
  }
  return null;
}
