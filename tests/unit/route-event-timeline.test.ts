import { describe, expect, it } from 'vitest';
import { arrivalLabels, buildRouteTimeline } from '../../src/client/route-timeline';

describe('source-backed event schedule in the deterministic route timeline', () => {
  const departure = '2026-10-21T12:00:00Z';
  it('waits until event start before counting its actual duration and next leg', () => {
    const result = buildRouteTimeline(departure, true, [
      { durationMinutes: 90, eventStartsAt: '2026-10-21T13:00:00Z' }, { durationMinutes: 20 },
    ], [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }]);
    expect(result.stops[0]).toEqual({ arrival: '2026-10-21T12:10:00.000Z', visitStart: '2026-10-21T13:00:00.000Z', departure: '2026-10-21T14:30:00.000Z', waitMinutes: 50, lateMinutes: 0 });
    expect(result.stops[1].arrival).toBe('2026-10-21T14:45:00.000Z');
    expect(result.waitMinutes).toBe(50);
    expect(result.totalMinutes).toBe(185);
    expect(result.lateStopIndices).toEqual([]);
  });
  it('reports lateness rather than silently pretending an event still fits', () => {
    const result = buildRouteTimeline(departure, true, [{ durationMinutes: 90, eventStartsAt: '2026-10-21T12:05:00Z' }], [{ estimatedMinutes: 15 }]);
    expect(result.stops[0].lateMinutes).toBe(10);
    expect(result.stops[0].waitMinutes).toBe(0);
    expect(result.lateStopIndices).toEqual([0]);
    expect(result.totalMinutes).toBe(105);
  });
  it('retains current arrival with unknown duration but never invents later arrivals', () => {
    const result = buildRouteTimeline(departure, true, [{ durationMinutes: null, eventStartsAt: '2026-10-21T13:00:00Z' }, { durationMinutes: 20 }], [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }]);
    expect(result.stops[0].arrival).toBe('2026-10-21T12:10:00.000Z');
    expect(result.stops[0].visitStart).toBe('2026-10-21T13:00:00.000Z');
    expect(result.stops[0].departure).toBeNull();
    expect(result.stops[1].arrival).toBeNull();
    expect(result.totalMinutes).toBeNull();
    expect(result.waitMinutes).toBeNull();
  });
  it('keeps legacy nullable arrival behavior and rejects invalid durations', () => {
    expect(arrivalLabels(departure, true, [null, 20], [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }])).toEqual(['2026-10-21T12:10:00.000Z', null]);
    for (const bad of [NaN, Infinity, -1]) expect(arrivalLabels(departure, true, [bad, 20], [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }])).toEqual([null, null]);
  });
  it('does not calculate schedule feasibility from an unknown origin or leg', () => {
    const stops = [{ durationMinutes: 90, eventStartsAt: '2026-10-21T13:00:00Z' }];
    expect(buildRouteTimeline(departure, false, stops, [{ estimatedMinutes: 10 }]).totalMinutes).toBeNull();
    expect(buildRouteTimeline(departure, true, stops).stops[0].arrival).toBeNull();
  });
  it('includes an explicit return leg and does not silently add one', () => {
    const stops = [{ durationMinutes: 20 }];
    expect(buildRouteTimeline(departure, true, stops, [{ estimatedMinutes: 10 }]).totalMinutes).toBe(30);
    expect(buildRouteTimeline(departure, true, stops, [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }]).totalMinutes).toBe(45);
  });
  it('preserves arrival but invalidates later timing on invalid source event time', () => {
    const result = buildRouteTimeline(departure, true, [{ durationMinutes: 90, eventStartsAt: 'not-a-date' }, { durationMinutes: 20 }], [{ estimatedMinutes: 10 }, { estimatedMinutes: 15 }]);
    expect(result.stops[0].arrival).toBe('2026-10-21T12:10:00.000Z');
    expect(result.stops[0].waitMinutes).toBeNull();
    expect(result.stops[1].arrival).toBeNull();
    expect(result.totalMinutes).toBeNull();
  });
  it('counts two separate event waits and preserves sub-minute arithmetic', () => {
    const result = buildRouteTimeline(departure, true, [{ durationMinutes: 20, eventStartsAt: '2026-10-21T12:20:30Z' }, { durationMinutes: 30, eventStartsAt: '2026-10-21T13:00:00Z' }], [{ estimatedMinutes: 10 }, { estimatedMinutes: 5 }]);
    expect(result.waitMinutes).toBe(25);
    expect(result.totalMinutes).toBe(90);
    expect(result.stops[1].visitStart).toBe('2026-10-21T13:00:00.000Z');
  });
  it('rejects finite numbers outside the representable date range', () => {
    expect(buildRouteTimeline(departure, true, [{ durationMinutes: 20 }], [{ estimatedMinutes: Number.MAX_VALUE }]).totalMinutes).toBeNull();
    expect(buildRouteTimeline(departure, true, [{ durationMinutes: Number.MAX_VALUE }], [{ estimatedMinutes: 10 }]).totalMinutes).toBeNull();
  });
});
