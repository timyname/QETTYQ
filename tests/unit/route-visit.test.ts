import { describe, expect, it } from 'vitest';
import { nearbyRouteStop } from '../../src/client/route-visit';
const stop = { id: 'synthetic', lat: 51.13, lon: 71.43 };
describe('foreground proximity candidate, not visit proof', () => {
  it('requires accurate GPS near exactly one stop', () => {
    expect(nearbyRouteStop([stop], stop, 20)).toEqual(stop);
    expect(nearbyRouteStop([stop], stop, 100)).toBeNull();
    expect(nearbyRouteStop([stop, { ...stop, id: 'adjacent' }], stop, 20)).toBeNull();
    expect(nearbyRouteStop([stop], { lat: 51.2, lon: 71.5 }, 20)).toBeNull();
  });
});
