import { describe, expect, it } from 'vitest';
import { arrivalLabels, astanaDateInput, googleWalkingPlanUrl, parseAstanaDateInput } from '../../src/client/route-timeline';

describe('Astana departure and route timeline', () => {
  it('formats and parses independent of device timezone', () => {
    expect(astanaDateInput('2026-10-20T12:15:00Z')).toBe('2026-10-20T17:15');
    expect(parseAstanaDateInput('2026-10-20T17:15')).toBe('2026-10-20T12:15:00.000Z');
  });
  it('rejects impossible and empty dates', () => {
    expect(parseAstanaDateInput('2026-02-31T12:00')).toBeNull();
    expect(parseAstanaDateInput('')).toBeNull();
    expect(astanaDateInput('invalid')).toBe('');
  });
  it('includes preceding visits, but never invents arrival without origin', () => {
    expect(arrivalLabels('2026-10-20T12:00:00Z', true, [60, 30], [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }])).toEqual(['2026-10-20T12:10:00.000Z', '2026-10-20T13:25:00.000Z']);
    expect(arrivalLabels('2026-10-20T12:00:00Z', false, [60])).toEqual([null]);
  });
  it('builds a multi-stop external route, not only the first destination', () => {
    const url = new URL(googleWalkingPlanUrl([{ lat: 51.1, lon: 71.4 }, { lat: 51.2, lon: 71.5 }], { lat: 51.15, lon: 71.45 })!);
    expect(url.searchParams.get('waypoints')).toBe('51.1,71.4');
    expect(url.searchParams.get('destination')).toBe('51.2,71.5');
    expect(url.searchParams.get('origin')).toBe('51.15,71.45');
    expect(url.searchParams.get('travelmode')).toBe('walking');
    expect(googleWalkingPlanUrl([])).toBeNull();
  });
  it('keeps later arrival unknown after an unknown leg or invalid visit', () => {
    expect(arrivalLabels('2026-10-20T12:00:00Z', true, [30, 30], [undefined!, { estimatedMinutes: 5 }])).toEqual([null, null]);
    for (const bad of [NaN, Infinity, -1]) expect(arrivalLabels('2026-10-20T12:00:00Z', true, [bad, 30], [{ estimatedMinutes: 5 }, { estimatedMinutes: 5 }])).toEqual([null, null]);
  });
});
