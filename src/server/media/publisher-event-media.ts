import registry from '../../../data/publisher-event-media.json';

export type PublisherPosterRecord = {
  eventSourceUrl: string; sourceImageUrl: string; localAssetPath: string; eventName: string;
  publisher: 'Давай Сходим'; termsUrl: string; rightsBasis: 'publisher_public_noncommercial_permission_with_credit_and_link';
  status: 'approved' | 'blocked' | 'revoked'; reviewedAt: string; reviewExpiresAt: string;
  fetchedAt: string; sha256: string; bytes: number; width: number; height: number;
  mime: 'image/jpeg' | 'image/png' | 'image/webp'; visualVerified: boolean;
  knownThirdPartyRestriction: boolean; author: string | null; modifications: string;
};
export type PublisherPoster = { kind: 'publisher_poster'; src: string; alt: string; label: string;
  notice: string; credit: string; sourceUrl: string; termsUrl: string; fit: 'contain' };
const terms = 'https://sxodim.com/polzovatelskoe-soglashenie';
const safeEvent = (url: unknown): url is string => typeof url === 'string'
  && /^https:\/\/sxodim\.com\/astana\/event\/[a-z0-9-]+$/u.test(url);
const safeImage = (url: unknown): url is string => typeof url === 'string'
  && /^https:\/\/sxodim\.com\/uploads\/posts\/[a-z0-9/_.-]+\.(?:jpe?g|png|webp)$/iu.test(url)
  && !url.includes('..');

/** Separate publisher license, not a fabricated individual organizer grant.
 * A future commercial launch must disable/review this noncommercial registry.
 */
export function resolvePublisherEventMedia(eventUrl: string, input: unknown = registry, now = Date.now()): PublisherPoster | null {
  const data = input as { version?: unknown; enabled?: unknown; monetizationEnabled?: unknown; scope?: unknown; termsUrl?: unknown; records?: unknown } | null;
  if (!safeEvent(eventUrl) || !Number.isFinite(now) || data?.version !== 1 || data.enabled !== true || data.monetizationEnabled !== false || data.scope !== 'noncommercial_pilot_only'
    || data.termsUrl !== terms || !Array.isArray(data.records) || data.records.length > 100) return null;
  for (const value of data.records) {
    const p = value as Partial<PublisherPosterRecord> | null;
    if (!p || p.eventSourceUrl !== eventUrl || p.status !== 'approved' || p.publisher !== 'Давай Сходим'
      || p.termsUrl !== terms || p.rightsBasis !== 'publisher_public_noncommercial_permission_with_credit_and_link'
      || p.visualVerified !== true || p.knownThirdPartyRestriction !== false || !safeImage(p.sourceImageUrl)
      || typeof p.localAssetPath !== 'string' || !/^\/api\/media\/events\/[a-f0-9]{64}$/u.test(p.localAssetPath)
      || typeof p.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(p.sha256)
      || p.localAssetPath !== `/api/media/events/${p.sha256}` || p.mime !== 'image/jpeg'
      || !Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width! < 64 || p.height! < 64 || p.width! > 3000 || p.height! > 3000
      || !Number.isInteger(p.bytes) || p.bytes! < 100 || p.bytes! > 3_000_000
      || typeof p.eventName !== 'string' || !p.eventName.trim() || p.eventName.length > 300 || /[<>\u0000-\u001f]/u.test(p.eventName)) continue;
    const reviewed = Date.parse(p.reviewedAt ?? ''), expires = Date.parse(p.reviewExpiresAt ?? ''), fetched = Date.parse(p.fetchedAt ?? '');
    if (![reviewed, expires, fetched].every(Number.isFinite) || reviewed > now || fetched > now || expires <= now
      || expires - reviewed > 31 * 86_400_000) continue;
    return { kind: 'publisher_poster', src: p.localAssetPath, alt: `Изображение события «${p.eventName}» с сайта Давай Сходим`,
      label: 'Изображение из афиши', notice: 'Некоммерческий пилот · изображение издателя', credit: 'Давай Сходим',
      sourceUrl: eventUrl, termsUrl: terms, fit: 'contain' };
  }
  return null;
}

