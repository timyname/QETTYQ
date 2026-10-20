import { describe, expect, it } from 'vitest';
import { eventPlanStop } from '../../src/server/pilot/event-plan-stop';
import { calculateMixedPlan } from '../../src/server/pilot/plans';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { arrivalLabels } from '../../src/client/route-timeline';
import type { LiveAstanaEvent } from '../../src/server/ingestion/sxodim-live';

const now = Date.parse('2026-10-21T00:00:00Z');
const event = { id: 'synthetic:event', name: 'SYNTHETIC TEST', category: 'theatre', venueName: 'SYNTHETIC TEST venue', address: 'SYNTHETIC TEST', lat: 51.13, lon: 71.43,
  startsAt: '2026-10-22T14:00:00Z', endsAt: null, durationMinutes: null, status: 'scheduled', freshness: 'fresh',
  priceFromKzt: 3000, price: { kind: 'from', basis: 'unknown' }, fetchedAt: '2026-10-21T00:00:00Z', provenance: { sourceUrl: 'https://example.invalid/synthetic' } } as LiveAstanaEvent;
describe('mixed event and place plan', () => {
  it('keeps unknown duration/price unknown, not zero or assumed film runtime', () => {
    const stop = eventPlanStop(event, now)!;
    expect(stop).toMatchObject({ durationMinutes: null, durationState: 'unknown', price: null, eventStartsAt: event.startsAt });
    const plan = calculateMixedPlan([stop], pilotContextSchema.parse({ origin: { lat: 51.12, lon: 71.42 } }));
    expect(plan.travelMinutes).toBeGreaterThan(0);
    expect(plan.visitMinutes).toBeNull(); expect(plan.totalMinutes).toBeNull(); expect(plan.budget.min).toBeNull();
    expect(plan.feasibility).toBe('uncertain');
  });
  it('uses observed start/end duration when provided', () => {
    expect(eventPlanStop({ ...event, endsAt: '2026-10-22T15:30:00Z' }, now)).toMatchObject({ durationMinutes: 90, durationState: 'observed' });
  });
  it.each([{ ...event, lat: null }, { ...event, freshness: 'stale' as const }, { ...event, startsAt: '2026-10-20T14:00:00Z' }])('rejects missing geometry, stale or expired occurrences', value => {
    expect(eventPlanStop(value, now)).toBeNull();
  });
  it('unknown visit does not erase arrival at that stop but invalidates later ETA', () => {
    expect(arrivalLabels('2026-10-21T00:00:00Z', true, [null, 20], [{ estimatedMinutes: 10 }, { estimatedMinutes: 5 }])).toEqual(['2026-10-21T00:10:00.000Z', null]);
  });
});
