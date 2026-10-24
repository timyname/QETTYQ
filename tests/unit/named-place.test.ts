import { describe, expect, it } from 'vitest';
import { resolveCurrentNamedPlace } from '../../src/server/assistant/named-place';
import { pilotPlaces } from '../../src/server/pilot/catalog';
import type { Place } from '../../src/domain/types';

const fixture = (id: string, patch: Partial<Place> = {}): Place => ({
  id, name: 'SYNTHETIC TEST · Gallery', category: 'museum', lat: 51.1, lon: 71.4, address: null,
  tags: ['museum', 'culture'], sourceUrl: 'https://example.invalid/synthetic-gallery', sourceName: 'SYNTHETIC TEST',
  retrievedAt: '2026-10-24T00:00:00Z', dataMode: 'snapshot', price: null, durationMinutes: 60, ...patch,
});
describe('internal current-name resolution, exact catalog rows only', () => {
  it('matches a unique actual translated venue name without guessing a new venue', () => {
    expect(resolveCurrentNamedPlace('Astana Opera', pilotPlaces)).toEqual({ name: 'Астана Опера', goal: 'activity' });
  });
  it('normalizes case and repeated whitespace only', () => {
    expect(resolveCurrentNamedPlace('  aSTANA   OPERA  ', pilotPlaces)).toEqual({ name: 'Астана Опера', goal: 'activity' });
  });
  it.each(['Astana Oper', 'Astana Opra', 'Astana Opera nearby', 'Хочу в Astana Opera', 'Что есть в Astana Opera?', 'Opera', 'Unknown Test Venue'])('does not guess a hint for %s', text => {
    expect(resolveCurrentNamedPlace(text, pilotPlaces)).toBeUndefined();
  });
  it('does not pick one branch of the actual Rafe chain', () => {
    expect(pilotPlaces.filter(place => place.name === 'Rafe').length).toBeGreaterThan(1);
    expect(resolveCurrentNamedPlace('Rafe', pilotPlaces)).toBeUndefined();
  });
  it('rejects colliding aliases belonging to distinct records', () => {
    const places = [fixture('one', { name: 'One', nameTranslations: { en: 'Same Name' } }),
      fixture('two', { name: 'Two', nameTranslations: { kk: 'Same Name' } })];
    expect(resolveCurrentNamedPlace('Same Name', places)).toBeUndefined();
  });
  it('one record with multiple identical translated names is still unique', () => {
    expect(resolveCurrentNamedPlace('Same Name', [fixture('one', { name: 'Same Name', nameTranslations: { en: 'Same Name', ru: 'Same Name' } })]))
      .toEqual({ name: 'Same Name', goal: 'activity' });
  });
  it('maps only known catalog category tags and never claims a price or schedule', () => {
    for (const [tags, goal] of [[['restaurant', 'food'], 'food'], [['park'], 'walk'], [['theatre', 'culture'], 'activity']] as const) {
      const result = resolveCurrentNamedPlace('SYNTHETIC TEST · Gallery', [fixture('one', { tags: [...tags] })]);
      expect(result).toEqual({ name: 'SYNTHETIC TEST · Gallery', goal }); expect(result).not.toHaveProperty('price');
    }
    expect(resolveCurrentNamedPlace('SYNTHETIC TEST · Gallery', [fixture('one', { tags: ['unrecognized'] })])).toBeUndefined();
  });
});
