import { describe, expect, it } from 'vitest';
import { twoGisWalkingPlanUrl } from '../../src/client/2gis-navigation';
import { reorderRouteStops } from '../../src/client/reorder-route-stops';

describe('compact route ordering and external navigation', () => {
  const stops = [{ lat: 51.1, lon: 71.4 }, { lat: 51.2, lon: 71.5 }, { lat: 51.3, lon: 71.6 }];
  it('keeps all three ordered stops in the official pedestrian link', () => {
    expect(twoGisWalkingPlanUrl(stops, { lat: 51, lon: 71 })).toBe('https://2gis.ru/directions/tab/pedestrian/points/71,51|71.4,51.1|71.5,51.2|71.6,51.3');
  });
  it('leaves current position to 2GIS when the origin is unknown', () => {
    expect(twoGisWalkingPlanUrl([stops[0]])).toContain('/points/|71.4,51.1');
  });
  it('preserves an explicit return destination', () => {
    expect(twoGisWalkingPlanUrl([stops[0]], null, stops[1])).toContain('|71.5,51.2');
  });
  it('rejects missing, invalid and excessive coordinates without exposing keys', () => {
    expect(twoGisWalkingPlanUrl([])).toBeNull();
    expect(twoGisWalkingPlanUrl([{ lat: NaN, lon: 71 }])).toBeNull();
    expect(twoGisWalkingPlanUrl(stops, { lat: 91, lon: 71 })).toBeNull();
    expect(twoGisWalkingPlanUrl(Array.from({ length: 11 }, () => stops[0]))).toBeNull();
  });
  it('moves the first and last of three stops without mutation', () => {
    const ids = ['a', 'b', 'c'];
    expect(reorderRouteStops(ids, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorderRouteStops(ids, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
  it('keeps all stops on invalid, duplicate or no-op moves', () => {
    for (const [from, to] of [[-1, 1], [0, 3], [1.5, 0], [1, 1]]) expect(reorderRouteStops(['a', 'b', 'c'], from, to)).toEqual(['a', 'b', 'c']);
    expect(reorderRouteStops(['a', 'a'], 0, 1)).toEqual(['a', 'a']);
  });
});
