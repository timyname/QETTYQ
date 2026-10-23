import { describe, expect, it } from 'vitest';
import { validGeographicMediaProof, type ReviewedGeographicMediaProof } from '../../src/server/media/geographic-media-identity';
import registry from '../../data/place-media.json';
import { resolveCommonsPlaceMedia } from '../../src/server/media/commons-place-media';
const source = 'https://commons.wikimedia.org/wiki/File:ASTANA_love_park_2005.JPG';
const now = Date.parse('2026-10-24T20:00:00Z');
const fixture = (): ReviewedGeographicMediaProof => ({ fileLat: 51.131054, fileLon: 71.410811,
  osmBoundary: [[71.4064206, 51.1300467], [71.41061, 51.1293845], [71.4119988, 51.1329313], [71.4078335, 51.1336], [71.4064206, 51.1300467]],
  matchedVenueLabel: 'Парк влюбленных', fileDescription: 'Park in Astana between Turan and Kabanbay batyra avenues', filePageUrl: source, reviewedAt: '2026-10-23T00:00:00Z' });
describe('curated file GPS inside observed exact OSM park boundary', () => {
  it('accepts reviewed exact source and observed GPS inside polygon, never an invented OSM Wikimedia tag', () => {
    expect(validGeographicMediaProof(fixture(), source, now)).toBe(true);
    expect(resolveCommonsPlaceMedia('osm:way:37884583', registry, now).kind).toBe('real_place_photo');
  });
  it('rejects nearby coordinates just outside the park instead of guessing same venue', () => {
    for (const [fileLat, fileLon] of [[51.129, 71.4108], [51.131, 71.414], [51.150, 71.420]]) {
      expect(validGeographicMediaProof({ ...fixture(), fileLat, fileLon }, source, now)).toBe(false);
    }
  });
  it('rejects guessed/absent GPS, changed source page and malformed/open polygon', () => {
    expect(validGeographicMediaProof({ ...fixture(), fileLat: NaN }, source, now)).toBe(false);
    expect(validGeographicMediaProof(fixture(), `${source}-other`, now)).toBe(false);
    expect(validGeographicMediaProof({ ...fixture(), osmBoundary: fixture().osmBoundary.slice(0, -1) }, source, now)).toBe(false);
    expect(validGeographicMediaProof(undefined, source, now)).toBe(false);
  });
});
