import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../../data/publisher-place-media.json';
import { resolvePublisherPlaceMedia, validPublisherPlaceIdentity, type PublisherPlaceRecord } from '../../src/server/media/publisher-place-media';
import { readPublisherPlaceImage } from '../../src/server/media/publisher-place-files';
import { getPlaceMedia } from '../../src/server/media/commons-place-media';
const now = Date.parse('2026-10-24T12:00:00Z');
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
  it('binds Kultura Diktuet by its observed exact Syganak33 address, not a generic café photo', () => {
    const p = registry.records.find(p => p.placeId === 'osm:node:12959449801') as PublisherPlaceRecord;
    expect(p.sourceName).toBe('Культура Диктует');
    expect(p.identity.method).toBe('exact_name_and_observed_address');
    expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(resolvePublisherPlaceMedia(p.placeId, registry, now)?.src).toBe('/api/media/places/2d43f7fa56a36fd98059239c52b8c7881893238a5c8e2ee297a2da2a3a9bc19d');
    expect(validPublisherPlaceIdentity({ ...p, sourceHouse: '35' })).toBe(false);
  });
  it('binds Chaleur only when both source and catalog points are inside observed AbuDhabiPlaza60/5', () => {
    const p = registry.records.find(p => p.placeId === 'osm:node:10170946745') as PublisherPlaceRecord;
    expect(p.sourceName).toBe('Chaleur');
    expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(resolvePublisherPlaceMedia(p.placeId, registry, now)?.src).toBe('/api/media/places/fb1d94d1254eb55a1abd921c320b5e58253ca3f2a716ca8ab26829eaf74e21db');
    const outside = structuredClone(p);
    outside.sourceLat = 51.121;
    expect(validPublisherPlaceIdentity(outside)).toBe(false);
    expect(resolvePublisherPlaceMedia(p.placeId, { ...registry, records: [outside] }, now)).toBeNull();
  });
  it('requires an actual closed shared building polygon, not a near-point match', () => {
    for (const boundary of [undefined, [[71.43, 51.12], [71.431, 51.12], [71.431, 51.121], [71.43, 51.12]]]) {
      const p = fixture(); p.identity.boundary = boundary;
      expect(validPublisherPlaceIdentity(p)).toBe(false);
    }
  });
  it('uses an exact reviewed Yakitoriya article interior with literal single-branch caption/address and article attribution', () => {
    const p = registry.records.find(record => record.placeId === 'osm:way:237347726') as PublisherPlaceRecord;
    expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(p.articleImageEvidence?.sourceArticleAddress).toBe('Туран 21');
    expect(p.identity.observedStreetAliases).not.toContain('Туран');
    expect(resolvePublisherPlaceMedia(p.placeId, registry, now)).toMatchObject({
      kind: 'publisher_place_photo', width: 745, height: 497,
      sourceUrl: p.articleImageEvidence?.sourceArticleUrl,
      src: '/api/media/places/51798fc98fa8f03eafc369c73ea02871090ca63521cf78fdda58a0a668cc6ec1',
    });
  });
  it('rejects legacy article JPEG without exact section, single branch, street/house and publisher URL proof', () => {
    const original = registry.records.find(record => record.placeId === 'osm:way:237347726') as PublisherPlaceRecord;
    if (!original.articleImageEvidence) throw new Error('Expected reviewed article evidence');
    const noProof = structuredClone(original); delete noProof.articleImageEvidence;
    expect(resolvePublisherPlaceMedia(noProof.placeId, { ...registry, records: [noProof] }, now)).toBeNull();
    for (const patch of [
      { singleVenueSection: false }, { sectionTitle: 'Other Restaurant' }, { sourceHouse: '22' },
      { sourceArticleAddress: 'Туран 22' }, { sourceArticleAddress: 'Кунаева 21' },
      { sourceArticleAddress: 'Туран 21, Достык 9' }, { sourceStreetAlias: 'Туран' },
      { sourceArticleUrl: 'https://example.com/astana/article/test' },
      { sourceArticleUrl: 'https://sxodim.com/astana/place/yakitoriya' },
    ]) {
      const p = structuredClone(original);
      Object.assign(p.articleImageEvidence!, patch);
      expect(resolvePublisherPlaceMedia(p.placeId, { ...registry, records: [p] }, now)).toBeNull();
    }
    const png = structuredClone(original); png.sourceImageUrl = png.sourceImageUrl.replace('.jpg', '.png');
    expect(resolvePublisherPlaceMedia(png.placeId, { ...registry, records: [png] }, now)).toBeNull();
  });
  it.each([
    ['osm:node:10248180510', 'Delish', '49071fa16c1dc6f2229a68e262ea89048e1da3ec18e0a1261a70a9af5e598146'],
    ['osm:node:4913160607', 'Меруерт', 'bf220e216e7cafdd59821d4d0d303c7cbc4b1b29b05616bcb45e54e951d90934'],
  ])('resolves %s only through its exact dated publisher article JPEG and shared address polygon', (placeId, name, hash) => {
    const p = registry.records.find(record => record.placeId === placeId) as PublisherPlaceRecord;
    expect(p.sourceName).toBe(name);
    expect(p.identity.method).toBe('exact_name_and_shared_address_building');
    expect(validPublisherPlaceIdentity(p)).toBe(true);
    expect(resolvePublisherPlaceMedia(placeId, registry, now)).toMatchObject({
      kind: 'publisher_place_photo', src: `/api/media/places/${hash}`, sourceUrl: p.articleImageEvidence?.sourceArticleUrl,
    });
    const outside = structuredClone(p); outside.sourceLon += 0.0008;
    expect(resolvePublisherPlaceMedia(placeId, { ...registry, records: [outside] }, now)).toBeNull();
  });
  it('allows uploads/images only with precise reviewed article evidence and the bounded dated JPEG path', () => {
    const original = registry.records.find(record => record.placeId === 'osm:node:10248180510') as PublisherPlaceRecord;
    const noProof = structuredClone(original); delete noProof.articleImageEvidence;
    expect(resolvePublisherPlaceMedia(noProof.placeId, { ...registry, records: [noProof] }, now)).toBeNull();
    for (const sourceImageUrl of [
      'https://sxodim.com/uploads/images/anything.jpg',
      original.sourceImageUrl.replace('/optimized/', '/'),
      original.sourceImageUrl.replace('_800xauto-q-85.jpg', '_800xauto-q-85.png'),
      original.sourceImageUrl.replace('_800xauto-q-85.jpg', '_800xauto-q-85.jpg?key=private'),
      original.sourceImageUrl.replace('07b35e02dad6b750dd6959e2a56ac939', 'other'),
      original.sourceImageUrl.replace('sxodim.com', 'example.com'),
    ]) {
      const p = { ...original, sourceImageUrl };
      expect(resolvePublisherPlaceMedia(p.placeId, { ...registry, records: [p] }, now)).toBeNull();
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
    expect(registry.records).toHaveLength(8);
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
