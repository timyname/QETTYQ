import { describe, expect, it } from 'vitest';
import { mapSearchMatches } from '../../src/client/map-search-text';
import { searchMapSnapshot } from '../../src/server/pilot/map-search';
import { pilotPlaces } from '../../src/server/pilot/catalog';

const now = Date.parse('2026-10-21T00:00:00Z');
describe('offline map search with sourced coordinates', () => {
  it('accepts alternate Kazakh keyboard spelling for retrieval, not identity matching', () => {
    expect(mapSearchMatches('Мәңгілік Ел, 10/1', 'Мангилик ел 10/1')).toBe(true);
    expect(mapSearchMatches('Мәңгілік Ел, 10/12', 'Мангилик ел 10/1')).toBe(false);
    expect(mapSearchMatches('Кунаева 142', 'Кунаева 14')).toBe(false);
  });
  it('returns exact named real place first, retaining its observed coordinates', () => {
    const place = pilotPlaces.find(p => p.name === 'Арарат')!;
    expect(place).toBeDefined();
    const items = searchMapSnapshot('Арарат', now);
    expect(items[0]).toMatchObject({ kind: 'place', id: place.id, lat: place.lat, lon: place.lon, sourceUrl: place.sourceUrl });
    expect(items.length).toBeLessThanOrEqual(8);
  });
  it('can find sourced public addresses without creating a venue or inventing an entrance', () => {
    const items = searchMapSnapshot('Мангилик ел 10/1', now);
    expect(items.some(item => item.kind === 'address')).toBe(true);
    for (const item of items.filter(item => item.kind === 'address')) {
      expect(item.title).toMatch(/10\/1$/u); expect(item.quality).toBe('derived');
      expect(item.sourceUrl).toMatch(/^https:\/\/www.openstreetmap.org\//u);
    }
  });
  it('keeps unknown/expired/oversize queries empty rather than calling a provider', () => {
    expect(searchMapSnapshot('SYNTHETIC nonexistent address', now)).toEqual([]);
    expect(searchMapSnapshot('x', now)).toEqual([]);
    expect(searchMapSnapshot('x'.repeat(161), now)).toEqual([]);
    expect(searchMapSnapshot('Мангилик ел 10/1', Date.parse('2027-01-01T00:00:00Z')).filter(item => item.kind === 'address')).toEqual([]);
  });
});
