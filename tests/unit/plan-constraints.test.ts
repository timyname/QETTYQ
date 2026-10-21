import { describe, expect, it } from 'vitest';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { calculateMixedPlan, type PlanStop } from '../../src/server/pilot/plans';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';

describe('separate plan constraint violations for street recalculation', () => {
  const stop: PlanStop = { ...publicPlace(pilotPlaces[0]), durationMinutes: 90, durationState: 'estimated', price: { min: 2000, max: 3000 } };
  it('keeps budget violation independent of the time estimate', () => {
    const context = pilotContextSchema.parse({ minutes: 720, budget: 1000, origin: { lat: stop.lat, lon: stop.lon } });
    expect(calculateMixedPlan([stop], context).constraintViolations).toEqual({ time: false, budget: true });
  });
  it('exposes an estimated time violation without claiming a budget violation', () => {
    const context = pilotContextSchema.parse({ minutes: 20, budget: null, origin: { lat: stop.lat, lon: stop.lon } });
    expect(calculateMixedPlan([stop], context).constraintViolations).toEqual({ time: true, budget: false });
  });
});
