import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserMapConfig } from '../../src/server/pilot/browser-map-config';
import { GET } from '../../src/app/api/maps/config/route';
import { approvedBrowserMapKey, dgisBounds, dgisRouteBounds, DGIS_SDK_URL } from '../../src/client/dgis-mapgl';

const publicKey = 'SYNTHETIC-public-mapgl-key-only';
const privateKey = 'SYNTHETIC-private-server-key-only';
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('dedicated approved 2GIS browser map credential boundary (synthetic, no SDK requests)', () => {
  it('is disabled by default and never falls through to the server Search key', () => {
    expect(browserMapConfig({ '2GIS_API_KEY': privateKey })).toEqual({ enabled: false, provider: 'openstreetmap' });
    expect(browserMapConfig({ '2GIS_API_KEY': privateKey, QETTYQ_2GIS_BROWSER_KEY_APPROVED: 'true' })).toEqual({ enabled: false, provider: 'openstreetmap' });
  });
  it.each([undefined, 'false', 'TRUE', '1', 'yes', ' true '])('requires exact explicit approval, not truthy flag %s', flag => {
    const config = browserMapConfig({ '2GIS_API_KEY': privateKey, QETTYQ_2GIS_BROWSER_KEY: publicKey, QETTYQ_2GIS_BROWSER_KEY_APPROVED: flag });
    expect(config.enabled).toBe(false); expect(JSON.stringify(config)).not.toContain('key');
  });
  it('exposes only an explicitly approved separate public key', () => {
    const config = browserMapConfig({ '2GIS_API_KEY': privateKey, QETTYQ_2GIS_BROWSER_KEY: publicKey, QETTYQ_2GIS_BROWSER_KEY_APPROVED: 'true' });
    expect(config).toEqual({ enabled: true, provider: '2gis', browserKey: publicKey });
    expect(JSON.stringify(config)).not.toContain(privateKey);
  });
  it('rejects an accidental duplicate of the private server credential', () => {
    expect(browserMapConfig({ '2GIS_API_KEY': privateKey, QETTYQ_2GIS_BROWSER_KEY: privateKey, QETTYQ_2GIS_BROWSER_KEY_APPROVED: 'true' }).enabled).toBe(false);
  });
  it.each(['', 'short', 'https://evil.example/script.js', 'javascript:alert(1)', 'a'.repeat(513), '<script>synthetic</script>', 'synthetic\nkey-with-newline'])('rejects malformed public key %s', key => {
    expect(browserMapConfig({ QETTYQ_2GIS_BROWSER_KEY: key, QETTYQ_2GIS_BROWSER_KEY_APPROVED: 'true' }).enabled).toBe(false);
  });
  it('the real route refuses caching and does not leak other environment credentials', async () => {
    vi.stubEnv('2GIS_API_KEY', privateKey); vi.stubEnv('GOOGLE_MAPS_SERVER_API_KEY', 'SYNTHETIC-google-private');
    vi.stubEnv('QETTYQ_2GIS_BROWSER_KEY', publicKey); vi.stubEnv('QETTYQ_2GIS_BROWSER_KEY_APPROVED', 'false');
    const response = GET(), body = await response.text();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('cdn-cache-control')).toBe('no-store');
    expect(JSON.parse(body)).toEqual({ enabled: false, provider: 'openstreetmap' });
    expect(body).not.toContain(privateKey); expect(body).not.toContain(publicKey); expect(body).not.toContain('google');
  });
  it('the route returns the dedicated key only after approval', async () => {
    vi.stubEnv('2GIS_API_KEY', privateKey); vi.stubEnv('QETTYQ_2GIS_BROWSER_KEY', publicKey); vi.stubEnv('QETTYQ_2GIS_BROWSER_KEY_APPROVED', 'true');
    expect(await GET().json()).toEqual({ enabled: true, provider: '2gis', browserKey: publicKey });
  });
  it.each([null, undefined, [], {}, { enabled: 'true', provider: '2gis', browserKey: publicKey },
    { enabled: false, provider: '2gis', browserKey: publicKey }, { enabled: true, provider: 'google', browserKey: publicKey },
    { enabled: true, provider: '2gis', browserKey: privateKey + '\nscript' }])('client rejects invalid/unapproved config %j', config => {
    expect(approvedBrowserMapKey(config)).toBeNull();
  });
  it('client accepts only the approved-provider shape and fixed SDK URL contains no key', () => {
    expect(approvedBrowserMapKey({ enabled: true, provider: '2gis', browserKey: publicKey })).toBe(publicKey);
    expect(DGIS_SDK_URL).toBe('https://mapgl.2gis.com/api/js/v1.78.0');
    expect(new URL(DGIS_SDK_URL).search).toBe('');
  });
});

describe('2GIS adapter bounds and route validation (synthetic offline geometry)', () => {
  it('computes lon/lat bounds without reversing coordinates or changing route data', () => {
    const points = [[71.4, 51.1], [71.5, 51.2], [71.45, 51.15]];
    expect(dgisBounds(points)).toEqual({ southWest: [71.4, 51.1], northEast: [71.5, 51.2] });
    expect(points[0]).toEqual([71.4, 51.1]);
  });
  it.each([[], [[NaN, 51]], [[181, 51]], [[71, 91]], [[71]], [[Infinity, 51]], Array.from({ length: 20_001 }, () => [71, 51])].map(points => ({ points })))('rejects invalid/oversize bounds', ({ points }) => {
    expect(dgisBounds(points)).toBeNull();
  });
  it('never calls a one-point/invalid geometry a street route', () => {
    expect(dgisRouteBounds({ type: 'LineString', coordinates: [[71.4, 51.1]] })).toBeNull();
    expect(dgisRouteBounds({ type: 'Polygon', coordinates: [[71.4, 51.1], [71.5, 51.2]] })).toBeNull();
    expect(dgisRouteBounds(null)).toBeNull();
    expect(dgisRouteBounds({ type: 'LineString', coordinates: [[71.4, 51.1], [71.5, 51.2]] })).not.toBeNull();
  });
});
