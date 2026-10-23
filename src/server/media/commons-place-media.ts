import registryJson from '../../../data/place-media.json';
import { validGeographicMediaProof, type ReviewedGeographicMediaProof } from './geographic-media-identity';
import { resolvePublisherPlaceMedia, type PublisherPlacePhoto } from './publisher-place-media';

export type RealPlacePhoto = {
  kind: 'real_place_photo'; src: string; alt: string; author: string; credit: string;
  license: string; licenseUrl: string; sourceUrl: string; width: number; height: number; changes: string;
  photographedAt?: string | null;
};
export type PlaceMedia = RealPlacePhoto | PublisherPlacePhoto | { kind: 'none'; src: null };
export type CommonsPlacePhotoRecord = {
  placeId: string; src: string; alt: string; author: string; credit: string;
  license: string; licenseUrl: string; sourceUrl: string; fileTitle: string;
  width: number; height: number; bytes: number; sha256: string; changes: string;
  fetchedAt: string; photographedAt: string | null;
  identityProof: { osmUrl: string; osmTag: 'wikimedia_commons' | 'wikidata' | 'reviewed_geographic_match'; osmTagValue: string;
    geographicMatch?: ReviewedGeographicMediaProof;
    commonsCategory: string; categoryVerified: boolean; categoryEvidenceUrl: string; sourceAsOf: string };
  rights: { status: 'approved' | 'pending' | 'blocked' | 'revoked'; reviewedAt: string; reviewExpiresAt: string | null;
    photographLicenseVerified: boolean; visualVerified: boolean;
    subjectRights: 'nature_no_protected_work' | 'separate_permission' | 'public_domain' | 'unknown';
    subjectPermissionUrl?: string; allowStore: boolean; allowDisplay: boolean; allowRedistribute: boolean; notes: string };
};

const licenses: Record<string, string> = {
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};
const plain = (value: unknown, max: number): value is string => typeof value === 'string'
  && value.trim().length > 0 && value.length <= max && !/[<>\u0000-\u001f]/u.test(value);
const iso = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const normalizedTitle = (title: string) => title.replaceAll('_', ' ').normalize('NFC');
const none = (): PlaceMedia => ({ kind: 'none', src: null });
const safeHttps = (value: unknown): value is string => {
  if (!plain(value, 1500)) return false;
  try { const url = new URL(value); return url.protocol === 'https:'
    && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/u.test(url.hostname)
    && !/\.(?:localhost|local|internal|invalid|test|lan)$/u.test(url.hostname)
    && !url.username && !url.password && !url.hash; } catch { return false; }
};

function safeCommonsPage(value: string, prefix: 'File:' | 'Category:', title?: string): boolean {
  try {
    const url = new URL(value);
    const page = decodeURIComponent(url.pathname.replace(/^\/wiki\//u, ''));
    return url.origin === 'https://commons.wikimedia.org' && url.pathname.startsWith('/wiki/')
      && !url.search && !url.hash && !url.username && !url.password && page.startsWith(prefix)
      && (!title || normalizedTitle(page) === normalizedTitle(title));
  } catch { return false; }
}

/** Pure allowlist resolver. It never fetches/hotlinks or guesses a venue's image.
 * Review flags are curated evidence, not a legal guarantee from the software.
 */
export function resolveCommonsPlaceMedia(placeId: string, registry: unknown, now = Date.now()): PlaceMedia {
  if (!/^osm:(?:node|way|relation):[1-9]\d*$/u.test(placeId) || !Number.isFinite(now)) return none();
  const raw = registry as { version?: unknown; records?: unknown } | null;
  if (raw?.version !== 1 || !Array.isArray(raw.records) || raw.records.length > 20) return none();
  for (const value of raw.records) {
    const photo = value as Partial<CommonsPlacePhotoRecord> | null;
    if (!photo || photo.placeId !== placeId) continue;
    const proof = photo.identityProof, rights = photo.rights;
    const [provider, type, id] = placeId.split(':');
    if (provider !== 'osm' || !proof || proof.osmUrl !== `https://www.openstreetmap.org/${type}/${id}`
      || proof.categoryVerified !== true || !plain(proof.commonsCategory, 250) || !plain(proof.osmTagValue, 250)
      || !safeCommonsPage(proof.categoryEvidenceUrl, 'Category:', proof.commonsCategory)
      || !iso(proof.sourceAsOf) || Date.parse(proof.sourceAsOf) > now + 300_000
      || proof.osmTag === 'wikimedia_commons' && normalizedTitle(proof.osmTagValue) !== normalizedTitle(proof.commonsCategory)
      || proof.osmTag === 'wikidata' && !/^Q[1-9]\d*$/u.test(proof.osmTagValue)
      || proof.osmTag === 'reviewed_geographic_match' && (!plain(photo.sourceUrl, 1500)
        || proof.osmTagValue !== 'manual_file_gps_inside_observed_osm_boundary'
        || !validGeographicMediaProof(proof.geographicMatch, photo.sourceUrl, now))
      || !['wikimedia_commons', 'wikidata', 'reviewed_geographic_match'].includes(proof.osmTag)) continue;
    if (!rights || rights.status !== 'approved' || rights.photographLicenseVerified !== true || rights.visualVerified !== true
      || rights.allowStore !== true || rights.allowDisplay !== true || rights.allowRedistribute !== true
      || !['nature_no_protected_work', 'separate_permission', 'public_domain'].includes(rights.subjectRights)
      || rights.subjectRights === 'separate_permission' && !safeHttps(rights.subjectPermissionUrl)
      || !iso(rights.reviewedAt) || Date.parse(rights.reviewedAt) > now + 300_000
      || rights.reviewExpiresAt !== null && (!iso(rights.reviewExpiresAt) || Date.parse(rights.reviewExpiresAt) <= now)) continue;
    if (!plain(photo.fileTitle, 300) || !photo.fileTitle.startsWith('File:') || !plain(photo.sourceUrl, 1500)
      || !safeCommonsPage(photo.sourceUrl, 'File:', photo.fileTitle)
      || !plain(photo.src, 180) || !/^\/assets\/places\/[a-z0-9-]+\.jpg$/u.test(photo.src)
      || !plain(photo.alt, 500) || !plain(photo.author, 200) || !plain(photo.credit, 500) || !plain(photo.changes, 300)
      || !plain(photo.license, 50) || !Object.hasOwn(licenses, photo.license)
      || !plain(photo.licenseUrl, 200) || photo.licenseUrl.replace(/\/$/u, '') !== licenses[photo.license].replace(/\/$/u, '')
      || !Number.isInteger(photo.width) || !Number.isInteger(photo.height)
      || photo.width! < 64 || photo.width! > 1500 || photo.height! < 64 || photo.height! > 1500
      || !Number.isInteger(photo.bytes) || photo.bytes! <= 0 || photo.bytes! > 3_000_000
      || !/^[a-f0-9]{64}$/u.test(photo.sha256 ?? '') || !photo.credit.includes(photo.author) || !photo.credit.includes(photo.license)
      || !iso(photo.fetchedAt) || Date.parse(photo.fetchedAt) > now + 300_000) continue;
    return { kind: 'real_place_photo', src: photo.src, alt: photo.alt, author: photo.author, credit: photo.credit,
      license: photo.license, licenseUrl: photo.licenseUrl!, sourceUrl: photo.sourceUrl,
      width: photo.width!, height: photo.height!, changes: photo.changes,
      photographedAt: typeof photo.photographedAt === 'string' && plain(photo.photographedAt, 60) ? photo.photographedAt : null };
  }
  return none();
}

export function getPlaceMedia(placeId: string): PlaceMedia {
  const commons = resolveCommonsPlaceMedia(placeId, registryJson);
  return commons.kind !== 'none' ? commons : resolvePublisherPlaceMedia(placeId) ?? commons;
}
