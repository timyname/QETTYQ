import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../../data/publisher-place-media.json';
import { resolvePublisherPlaceMedia, validPublisherPlaceIdentity, type PublisherPlaceRecord } from '../../src/server/media/publisher-place-media';
import { readPublisherPlaceImage } from '../../src/server/media/publisher-place-files';
import { getPlaceMedia } from '../../src/server/media/commons-place-media';
const now = Date.parse('2026-10-24T00:00:00Z');
const fixture = () => structuredClone(registry.records[0]) as PublisherPlaceRecord;
const data = (p = fixture()) => ({ ...registry, records: [p] });
describe('publisher venue photos with exact independently observed identity', () => {
  it('binds Ribambelle by exact name and BOTH provider/catalog points inside the observed Dostyk16 building', () => {
    const p = fixture(); expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(resolvePublisherPlaceMedia(p.placeId, data(p), now)).toMatchObject({ kind: 'publisher_place_photo', author: null, photographer: null, publisher: 'Давай Сходим' });
    expect(getPlaceMedia(p.placeId).kind).toBe('publisher_place_photo');
  });
  it('binds Saksaul by exact observed node name/street/house, not proximity alone', () => {
    const p = registry.records[1] as PublisherPlaceRecord;
    expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(resolvePublisherPlaceMedia(p.placeId, registry, now)?.sourceUrl).toBe(p.sourcePageUrl);
  });
  it('binds Uno only to independently addressed Kenesary13 building, retaining the exact publisher exterior', () => {
    const p = registry.records[2] as PublisherPlaceRecord;
    expect(p.sourcePageUrl).toBe('https://sxodim.com/astana/place/uno');
    expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(resolvePublisherPlaceMedia(p.placeId, registry, now)).toMatchObject({
      kind: 'publisher_place_photo', width: 1522, height: 570,
      src: '/api/media/places/3070d0f30ac8d04ba3d6856413912b98efa63f0a909d33d160d3fbe6de8d9f83',
    });
    const outside = structuredClone(p);
    outside.sourceLon = 71.4103;
    expect(validPublisherPlaceIdentity(outside)).toBe(false);
    expect(resolvePublisherPlaceMedia(p.placeId, { ...registry, records: [outside] }, now)).toBeNull();
  });
  it('refuses another branch/changed address even for the same brand and nearby coordinates', () => {
    for (const patch of [{ sourceHouse: '18' }, { sourceAddress: 'Астана, улица Достык, 18' }, { sourceName: 'Other Restaurant' },
      { sourceAddress: 'Астана, улица Кунаева, 16', sourceStreetAlias: 'улица Кунаева' },
      { sourceLat: 51.124742, sourceLon: 71.434 }, { catalogLat: 51.1247 }, { placeId: 'osm:node:453247457' }]) {
      const p = { ...fixture(), ...patch }; expect(validPublisherPlaceIdentity(p)).toBe(false);
      expect(resolvePublisherPlaceMedia(p.placeId, data(p), now)).toBeNull();
    }
  });
  it('requires an actual closed shared building polygon, not a near-point match', () => {
    for (const boundary of [undefined, [[71.43, 51.12], [71.431, 51.12], [71.431, 51.121], [71.43, 51.12]]]) {
      const p = fixture(); p.identity.boundary = boundary;
      expect(validPublisherPlaceIdentity(p)).toBe(false);
    }
  });
  it('blocks expired/revoked/restricted media and commercial or disabled scope', () => {
    const p = fixture();
    for (const patch of [{ status: 'revoked' as const }, { visualVerified: false }, { knownThirdPartyRestriction: true }, { reviewExpiresAt: new Date(now).toISOString() }]) {
      expect(resolvePublisherPlaceMedia(p.placeId, data({ ...p, ...patch }), now)).toBeNull();
    }
    expect(resolvePublisherPlaceMedia(p.placeId, { ...data(), monetizationEnabled: true }, now)).toBeNull();
    expect(resolvePublisherPlaceMedia(p.placeId, { ...data(), enabled: false }, now)).toBeNull();
  });
  it('never permits arbitrary source URLs, formats or asset paths', () => {
    const p = fixture();
    for (const sourceImageUrl of ['https://google.com/a.jpg', 'https://sxodim.com/uploads/posts/x.svg', 'https://sxodim.com/uploads/posts/a.jpg?key=x']) {
      expect(resolvePublisherPlaceMedia(p.placeId, data({ ...p, sourceImageUrl }), now)).toBeNull();
    }
  });
  it('verifies real private JPEGs and gated served bytes by SHA, and denies expired media', async () => {
    expect(registry.records).toHaveLength(3);
    for (const record of registry.records) {
      const bytes = readFileSync(`data/place-media-cache/${record.sha256}.jpg`);
      expect(bytes.length).toBe(record.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
      const served = await readPublisherPlaceImage(record.sha256, now);
      expect(served && createHash('sha256').update(served.bytes).digest('hex')).toBe(record.sha256);
      expect(await readPublisherPlaceImage(record.sha256, Date.parse(record.reviewExpiresAt))).toBeNull();
    }
    expect(await readPublisherPlaceImage('../secrets')).toBeNull();
  });
});
