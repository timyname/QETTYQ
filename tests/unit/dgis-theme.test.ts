import { describe, expect, it } from 'vitest';
import { approvedDgisStyleId, dgisThemeOptions, QETTYQ_DGIS_PALETTE } from '../../src/client/dgis-theme';

describe('2GIS QETTYQ theme contract (offline, no SDK or credential)', () => {
  it('keeps the app pearl/jade/lime overlay palette centralized', () => {
    expect(QETTYQ_DGIS_PALETTE).toEqual({ pearl: '#F4F6F2', jade: '#0B6E5D', ink: '#0B332D', lime: '#CFFC55' });
    expect(Object.isFrozen(QETTYQ_DGIS_PALETTE)).toBe(true);
  });
  it('does not invent a custom basemap style when none is published', () => {
    const options = dgisThemeOptions();
    expect(options).not.toHaveProperty('style');
    expect(options.defaultBackgroundColor).toBe(QETTYQ_DGIS_PALETTE.pearl);
    expect(options.pitch).toBe(0); expect(options.rotation).toBe(0);
    expect(options.styleState).toEqual({ trafficOn: false, parkingOn: false, navigatorOn: false, immersiveRoadsOn: false, terrainEnabled: false });
  });
  it('accepts an explicitly configured published-style UUID case-insensitively', () => {
    const syntheticId = 'F0AA1111-1234-ABCD-9876-0123456789AB';
    expect(approvedDgisStyleId(syntheticId)).toBe(syntheticId.toLowerCase());
    expect(dgisThemeOptions(syntheticId).style).toBe(syntheticId.toLowerCase());
  });
  it.each([null, undefined, {}, [], true, '', 'light', 'qettyq', 'https://styles.2gis.com/style.json',
    '<script>', 'F0AA1111-1234-ABCD-9876-0123456789AB\n', ' F0AA1111-1234-ABCD-9876-0123456789AB',
    'F0AA1111-1234-ABCD-9876-0123456789AB?key=synthetic'])('rejects arbitrary style input %j without a fetch or exception', value => {
    expect(approvedDgisStyleId(value)).toBeNull();
    expect(dgisThemeOptions(value)).not.toHaveProperty('style');
  });
  it('returns fresh reserved-global state for every map instance', () => {
    const first = dgisThemeOptions(); first.styleState.trafficOn = true;
    expect(dgisThemeOptions().styleState.trafficOn).toBe(false);
  });
});
