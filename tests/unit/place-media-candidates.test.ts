import { describe, expect, it } from 'vitest';
import { collectPlaceMediaCandidates } from '../../src/server/media/place-media-candidates';
const place = { id: 'osm:node:12', name: 'Exact venue', sourceUrl: 'https://www.openstreetmap.org/node/12' };
const asOf = '2026-10-19T20:21:11Z';
const feature = (tags: Record<string, unknown>) => ({ properties: { '@type': 'node', '@id': 12, ...tags } });
describe('offline exact-place media discovery', () => {
  it('keeps linked Commons/Wikidata candidates separate from permission to show or download', () => {
    const [result] = collectPlaceMediaCandidates([place], [feature({ wikimedia_commons: 'Category:Exact venue', wikidata: 'Q12' })], asOf);
    expect(result).toMatchObject({ placeId: place.id, sourceAsOf: asOf, allowDownload: false, allowDisplay: false });
    expect(result.links).toHaveLength(2);
    expect(result.links[0].reviewUrl).toBe('https://commons.wikimedia.org/wiki/Category%3AExact_venue');
  });
  it('does not search/guess a photo based on venue name or category', () => {
    expect(collectPlaceMediaCandidates([place], [feature({ name: 'Exact venue', amenity: 'restaurant' })], asOf)).toEqual([]);
  });
  it('requires exact catalog OSM id/source correspondence', () => {
    expect(collectPlaceMediaCandidates([{ ...place, sourceUrl: 'https://www.openstreetmap.org/node/13' }], [feature({ wikidata: 'Q12' })], asOf)).toEqual([]);
    expect(collectPlaceMediaCandidates([place], [feature({ '@id': 13, wikidata: 'Q12' })], asOf)).toEqual([]);
  });
  it.each(['http://example.com/photo.jpg', 'https://127.0.0.1/a.jpg', 'https://host.local/a.jpg', 'https://user:pass@example.com/x.jpg', 'https://example.com/x?key=secret', 'javascript:alert(1)'])('rejects unsafe review link %s', image => {
    expect(collectPlaceMediaCandidates([place], [feature({ image })], asOf)).toEqual([]);
  });
  it('keeps a public external image only as a rights-unverified review link', () => {
    const [result] = collectPlaceMediaCandidates([place], [feature({ image: 'https://example.com/photo.jpg' })], asOf);
    expect(result.links[0].tag).toBe('image'); expect(result.allowDisplay).toBe(false);
  });
  it('is deterministic/idempotent and rejects conflicting duplicates', () => {
    const f = feature({ wikidata: 'Q12' });
    expect(collectPlaceMediaCandidates([place], [f, f], asOf)).toHaveLength(1);
    expect(() => collectPlaceMediaCandidates([place], [f, feature({ wikidata: 'Q13' })], asOf)).toThrow('Conflicting');
  });
  it('rejects malformed timestamps, HTML and unscoped Commons tags', () => {
    expect(() => collectPlaceMediaCandidates([place], [], 'today')).toThrow();
    expect(collectPlaceMediaCandidates([place], [feature({ wikimedia_commons: '<script>File:x</script>', wikidata: 'Q12?key=x' })], asOf)).toEqual([]);
    expect(collectPlaceMediaCandidates([place], [feature({ wikimedia_commons: 'Unrelated category' })], asOf)).toEqual([]);
  });
});
