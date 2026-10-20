import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../../data/place-media.json';
import places from '../../data/places.json';
import { getPlaceMedia, resolveCommonsPlaceMedia } from '../../src/server/media/commons-place-media';

const now = Date.parse('2026-10-21T00:00:00Z');
const id = registry.records[0].placeId;
const fixture = () => structuredClone(registry);

describe('reviewed Commons place photography (offline)', () => {
  it('resolves exact approved OSM venue with plain credit and local photo only', () => {
    const media = resolveCommonsPlaceMedia(id, registry, now);
    expect(media).toMatchObject({ kind: 'real_place_photo', license: 'CC BY-SA 4.0', author: 'Nurken' });
    if (media.kind !== 'real_place_photo') throw new Error('Expected reviewed photograph');
    expect(media.src).toMatch(/^\/assets\/places\/[a-z0-9-]+\.jpg$/u);
    expect(media.credit).toContain(media.author);
    expect(media.credit).toContain(media.license);
    expect(media.credit).not.toMatch(/[<>]/u);
    expect(getPlaceMedia(id).kind).toBe('real_place_photo');
  });

  it('returns none for unknown/unlinked/invalid ids rather than random category photography', () => {
    for (const value of ['osm:node:999999999999', 'google:any', '../photo', '', 'osm:way:01']) {
      expect(resolveCommonsPlaceMedia(value, registry, now)).toEqual({ kind: 'none', src: null });
    }
  });

  it.each(['pending', 'blocked', 'revoked'])('does not use %s rights', status => {
    const data = fixture(); data.records[0].rights.status = status;
    expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
  });

  it.each(['photographLicenseVerified', 'visualVerified', 'allowStore', 'allowDisplay', 'allowRedistribute'])('requires strict true for %s', field => {
    const data = fixture(); Object.assign(data.records[0].rights, { [field]: 'true' });
    expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
  });

  it('rejects expired/future reviews and unknown subject rights (e.g. modern architecture)', () => {
    const expired = fixture(); expired.records[0].rights.reviewExpiresAt = '2026-10-20T00:00:00Z' as never;
    const future = fixture(); future.records[0].rights.reviewedAt = '2030-01-01T00:00:00Z';
    const subject = fixture(); subject.records[0].rights.subjectRights = 'unknown';
    for (const data of [expired, future, subject]) expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
  });

  it('rejects source/OSM/category identity mismatch', () => {
    const osm = fixture(); osm.records[0].identityProof.osmUrl = 'https://www.openstreetmap.org/node/1';
    const category = fixture(); category.records[0].identityProof.osmTagValue = 'Category:Unrelated place';
    const file = fixture(); file.records[0].sourceUrl = 'https://commons.wikimedia.org/wiki/File:Other.jpg';
    for (const data of [osm, category, file]) expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
  });

  it('rejects hotlinks, traversal, HTML credits, unknown license and missing binary checksum', () => {
    for (const patch of [{ src: 'https://upload.wikimedia.org/example.jpg' }, { src: '/assets/places/../image.jpg' },
      { credit: '<img src=x onerror=alert(1)>' }, { license: '__proto__' }, { sha256: '' }, { width: 1920 }, { bytes: 3_000_001 }]) {
      const data = fixture(); Object.assign(data.records[0], patch);
      expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
    }
  });

  it('fails closed without throwing on malformed unknown registry fields', () => {
    for (const data of [null, {}, { version: 1, records: null }, { version: 1, records: Array(21).fill(null) }]) {
      expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
    }
    const data = fixture(); Object.assign(data.records[0].identityProof, { osmTagValue: undefined });
    expect(resolveCommonsPlaceMedia(id, data, now).kind).toBe('none');
    const wrongLicense = fixture(); Object.assign(wrongLicense.records[0], { licenseUrl: 123 });
    expect(resolveCommonsPlaceMedia(id, wrongLicense, now).kind).toBe('none');
  });

  it('keeps real files bounded, byte-identical to registry and linked to actual POI ids', () => {
    expect(registry.records.length).toBeGreaterThan(0);
    expect(registry.records.length).toBeLessThanOrEqual(20);
    for (const record of registry.records) {
      expect(places.some(place => place.id === record.placeId && place.sourceUrl === record.identityProof.osmUrl)).toBe(true);
      const image = readFileSync(new URL(`../../public${record.src}`, import.meta.url));
      expect(image.byteLength).toBe(record.bytes);
      expect(createHash('sha256').update(image).digest('hex')).toBe(record.sha256);
      expect(image.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
      expect(image.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
      expect(Math.max(record.width, record.height)).toBeLessThanOrEqual(1500);
      expect(resolveCommonsPlaceMedia(record.placeId, registry, now).kind).toBe('real_place_photo');
    }
  });
});
