import { describe, expect, it, vi } from 'vitest';
import { getPlaceMedia, resolveCommonsPlaceMedia, type CommonsPlacePhotoRecord } from '../../src/server/media/commons-place-media';

// Independent A8 negative fixtures. All metadata/identity/review claims below
// are SYNTHETIC unit-test values, never seed records or real photo approvals.
const now = Date.parse('2026-10-21T10:00:00Z');
const placeId = 'osm:node:12345';
function fixture(): CommonsPlacePhotoRecord {
  return { placeId, src: '/assets/places/synthetic-natural-park.jpg', alt: 'SYNTHETIC TEST nature only',
    author: 'SYNTHETIC TEST author', credit: 'SYNTHETIC TEST author · CC BY-SA 4.0', license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:SYNTHETIC_TEST.jpg',
    fileTitle: 'File:SYNTHETIC TEST.jpg', width: 640, height: 480, bytes: 16000, sha256: 'a'.repeat(64), changes: 'SYNTHETIC TEST resize',
    fetchedAt: '2026-10-21T09:00:00Z', photographedAt: null,
    identityProof: { osmUrl: 'https://www.openstreetmap.org/node/12345', osmTag: 'wikimedia_commons', osmTagValue: 'Category:SYNTHETIC TEST nature',
      commonsCategory: 'Category:SYNTHETIC TEST nature', categoryVerified: true,
      categoryEvidenceUrl: 'https://commons.wikimedia.org/wiki/Category:SYNTHETIC_TEST_nature', sourceAsOf: '2026-10-21T09:00:00Z' },
    rights: { status: 'approved', reviewedAt: '2026-10-21T09:00:00Z', reviewExpiresAt: '2026-10-22T09:00:00Z',
      photographLicenseVerified: true, visualVerified: true, subjectRights: 'nature_no_protected_work',
      allowStore: true, allowDisplay: true, allowRedistribute: true, notes: 'SYNTHETIC TEST only, not a real permission' } };
}
const registry = (record: unknown) => ({ version: 1, records: [record] });

describe('A8 independent Commons place-photo policy audit (offline)', () => {
  it('returns reviewed exact-identity local media with visible source/license/author/change metadata', () => {
    const photo = fixture(), result = resolveCommonsPlaceMedia(placeId, registry(photo), now);
    expect(result).toEqual({ kind: 'real_place_photo', src: photo.src, alt: photo.alt, author: photo.author, credit: photo.credit,
      license: photo.license, licenseUrl: photo.licenseUrl, sourceUrl: photo.sourceUrl, width: photo.width, height: photo.height, changes: photo.changes, photographedAt: photo.photographedAt });
  });
  it('never guesses a nearby or same-category venue photo and never performs a request', () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('NO_NETWORK'));
    try {
      expect(resolveCommonsPlaceMedia('osm:node:54321', registry(fixture()), now)).toEqual({ kind: 'none', src: null });
      expect(getPlaceMedia('osm:node:999999999999999')).toEqual({ kind: 'none', src: null });
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it.each(['pending', 'blocked', 'revoked'] as const)('denies review status %s despite a valid photograph license', status => {
    const photo = fixture(); photo.rights.status = status;
    expect(resolveCommonsPlaceMedia(placeId, registry(photo), now)).toEqual({ kind: 'none', src: null });
  });
  it('does not treat a photograph license as permission to reproduce a protected building/sculpture', () => {
    const photo = fixture(); photo.rights.subjectRights = 'unknown';
    expect(resolveCommonsPlaceMedia(placeId, registry(photo), now)).toEqual({ kind: 'none', src: null });
  });
  it.each(['photographLicenseVerified', 'visualVerified', 'allowStore', 'allowDisplay', 'allowRedistribute'] as const)('requires boolean true, not truthy false-string, for %s', flag => {
    const photo = fixture() as unknown as { rights: Record<string, unknown> };
    photo.rights[flag] = 'false';
    expect(resolveCommonsPlaceMedia(placeId, registry(photo), now)).toEqual({ kind: 'none', src: null });
  });
  it('fails closed for malformed identity/license fields instead of throwing on unknown registry input', () => {
    const missingIdentity = fixture() as unknown as { identityProof: Record<string, unknown> };
    delete missingIdentity.identityProof.osmTagValue;
    expect(() => resolveCommonsPlaceMedia(placeId, registry(missingIdentity), now)).not.toThrow();
    expect(resolveCommonsPlaceMedia(placeId, registry(missingIdentity), now)).toEqual({ kind: 'none', src: null });
    const malformedLicense = { ...fixture(), licenseUrl: 123 };
    expect(() => resolveCommonsPlaceMedia(placeId, registry(malformedLicense), now)).not.toThrow();
    expect(resolveCommonsPlaceMedia(placeId, registry(malformedLicense), now)).toEqual({ kind: 'none', src: null });
  });
  it.each(['https://', 'http://example.org/grant', 'https://127.0.0.1/private', 'https://user:password@example.org/grant'])('denies invalid/nonpublic separate subject-rights proof %s', permission => {
    const photo = fixture(); photo.rights.subjectRights = 'separate_permission'; photo.rights.subjectPermissionUrl = permission;
    expect(resolveCommonsPlaceMedia(placeId, registry(photo), now)).toEqual({ kind: 'none', src: null });
  });
  it.each(['https://remote.example.org/photo.jpg', '/assets/places/../private.jpg', '/assets/places/remote.svg'])('rejects unreviewed image transport/path %s', path => {
    const photo = fixture(); photo.src = path;
    expect(resolveCommonsPlaceMedia(placeId, registry(photo), now)).toEqual({ kind: 'none', src: null });
  });
  it('denies expired/future review, missing attribution and mismatched source identity', () => {
    const expired = fixture(); expired.rights.reviewExpiresAt = new Date(now).toISOString();
    const future = fixture(); future.rights.reviewedAt = new Date(now + 3600_000).toISOString();
    const noCredit = fixture(); noCredit.credit = '';
    const wrongIdentity = fixture(); wrongIdentity.identityProof.osmUrl = 'https://www.openstreetmap.org/node/54321';
    for (const photo of [expired, future, noCredit, wrongIdentity]) expect(resolveCommonsPlaceMedia(placeId, registry(photo), now)).toEqual({ kind: 'none', src: null });
  });
});
