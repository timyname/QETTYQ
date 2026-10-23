import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import registry from '../../data/publisher-event-media.json';
import { resolvePublisherEventMedia, type PublisherPosterRecord } from '../../src/server/media/publisher-event-media';
import { readPublisherEventImage } from '../../src/server/media/publisher-event-files';
const now = Date.parse('2026-10-24T12:00:00Z'), url = 'https://sxodim.com/astana/event/synthetic-event';
const checksum = 'a'.repeat(64);
const fixture = (): PublisherPosterRecord => ({ eventSourceUrl: url, sourceImageUrl: 'https://sxodim.com/uploads/posts/2026/10/synthetic.jpg',
  localAssetPath: `/api/media/events/${checksum}`, eventName: 'SYNTHETIC TEST event', publisher: 'Давай Сходим',
  termsUrl: 'https://sxodim.com/polzovatelskoe-soglashenie', rightsBasis: 'publisher_public_noncommercial_permission_with_credit_and_link',
  status: 'approved', reviewedAt: '2026-10-24T00:00:00Z', reviewExpiresAt: '2026-11-23T00:00:00Z', fetchedAt: '2026-10-24T00:00:00Z',
  sha256: checksum, bytes: 1234, width: 1522, height: 570, mime: 'image/jpeg', visualVerified: true, knownThirdPartyRestriction: false,
  author: null, modifications: 'Synthetic test fixture, never a real permission' });
const data = (record = fixture()) => ({ ...registry, records: [record] });
describe('scoped noncommercial publisher event photography', () => {
  it('keeps honest publisher identity, exact event source, attribution and private gated path', () => {
    expect(resolvePublisherEventMedia(url, data(), now)).toMatchObject({ kind: 'publisher_poster', src: `/api/media/events/${checksum}`, credit: 'Давай Сходим', sourceUrl: url });
  });
  it('cannot enable another event/branch by generic poster category', () => {
    expect(resolvePublisherEventMedia(`${url}-other`, data(), now)).toBeNull();
  });
  it.each(['blocked', 'revoked'] as const)('blocks %s reviewed media', status => {
    expect(resolvePublisherEventMedia(url, data({ ...fixture(), status }), now)).toBeNull();
  });
  it('requires noncommercial scope and verified publisher terms reference', () => {
    expect(resolvePublisherEventMedia(url, { ...data(), enabled: false }, now)).toBeNull();
    expect(resolvePublisherEventMedia(url, { ...data(), monetizationEnabled: true }, now)).toBeNull();
    expect(resolvePublisherEventMedia(url, { ...data(), scope: 'commercial' }, now)).toBeNull();
    expect(resolvePublisherEventMedia(url, data({ ...fixture(), termsUrl: 'https://example.com/permission' }), now)).toBeNull();
  });
  it('blocks known third-party restriction, unreviewed and expired/future files', () => {
    for (const patch of [{ knownThirdPartyRestriction: true }, { visualVerified: false }, { reviewedAt: '2027-01-01' },
      { reviewExpiresAt: new Date(now).toISOString() }, { reviewExpiresAt: '2027-01-01' }, { fetchedAt: '2027-01-01' }]) {
      expect(resolvePublisherEventMedia(url, data({ ...fixture(), ...patch }), now)).toBeNull();
    }
  });
  it.each(['https://evil.example/photo.jpg', 'https://sxodim.com/uploads/posts/../private.jpg', 'https://sxodim.com/uploads/posts/x.svg', 'https://sxodim.com/uploads/posts/x.jpg?token=x'])('blocks unsafe media source %s', sourceImageUrl => {
    expect(resolvePublisherEventMedia(url, data({ ...fixture(), sourceImageUrl }), now)).toBeNull();
  });
  it('rejects forever-public paths, mismatched SHA or malformed bytes/dimensions', () => {
    for (const patch of [{ localAssetPath: '/assets/event-posters/a.jpg' }, { sha256: 'b'.repeat(64) }, { width: 3001 }, { bytes: 3_000_001 }, { eventName: '<script>test</script>' }]) {
      expect(resolvePublisherEventMedia(url, data({ ...fixture(), ...patch }), now)).toBeNull();
    }
  });
  it('verifies all real checked-in media against hash, bytes and exact public publisher source', async () => {
    for (const value of registry.records) {
      const record = value as PublisherPosterRecord;
      const bytes = readFileSync(`data/event-media-cache/${record.sha256}.jpg`);
      expect(bytes.length).toBe(record.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
      expect(resolvePublisherEventMedia(record.eventSourceUrl, registry, Date.parse(record.reviewedAt) + 1000)).not.toBeNull();
      const served = await readPublisherEventImage(record.sha256, Date.parse(record.reviewedAt) + 1000);
      expect(served?.bytes.length).toBe(bytes.length);
      expect(served && createHash('sha256').update(served.bytes).digest('hex')).toBe(record.sha256);
      expect(served?.mime).toBe('image/jpeg');
      expect(await readPublisherEventImage(record.sha256, Date.parse(record.reviewExpiresAt))).toBeNull();
    }
  });
  it('rejects traversal and unknown ids without a media read', async () => {
    expect(await readPublisherEventImage('../secrets')).toBeNull();
    expect(await readPublisherEventImage('0'.repeat(64))).toBeNull();
  });
});
