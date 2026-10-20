import { describe, expect, it, vi } from 'vitest';
import { createStreetRouter, parseStreetRoute, routingStatus, validRoutingPoints } from '../../src/server/pilot/street-routing';

const points = [{ lat: 51.1282, lon: 71.4304 }, { lat: 51.133, lon: 71.428 }];
const osrm = () => ({ code: 'Ok', routes: [{ distance: 708.5, duration: 567.2, legs: [{ distance: 708.5, duration: 567.2 }], geometry: { type: 'LineString', coordinates: [[71.4304, 51.1282], [71.43, 51.13], [71.428, 51.133]] } }] });
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

describe('street routing with synthetic provider responses, no network', () => {
  it('accepts only a bounded Astana point list and finite numeric coordinates', () => {
    expect(validRoutingPoints(points)).toBe(true);
    for (const bad of [[], [points[0]], Array(9).fill(points[0]), [{ lat: NaN, lon: 71.4 }, points[1]], [{ lat: 43.25, lon: 76.9 }, points[1]], [{ lat: '51.1', lon: 71.4 }, points[1]]]) expect(validRoutingPoints(bad)).toBe(false);
  });
  it('keeps public routing disabled, requires global limiter and separate Valhalla policy gate', () => {
    const req = new Request('https://qettyq.example/api/routing');
    expect(routingStatus(req, { NODE_ENV: 'production' }).reason).toBe('PUBLIC_ROUTING_DISABLED');
    expect(routingStatus(req, { NODE_ENV: 'production', QETTYQ_PUBLIC_ROUTING_ENABLED: 'true' }).reason).toBe('GLOBAL_ROUTING_LIMITER_REQUIRED');
    expect(routingStatus(req, { NODE_ENV: 'production', QETTYQ_PUBLIC_ROUTING_ENABLED: 'true', QETTYQ_ROUTING_GLOBAL_LIMITER_READY: 'true', QETTYQ_ROUTING_PROVIDER: 'valhalla_demo' }).reason).toBe('PUBLIC_DEMO_POLICY_REVIEW_REQUIRED');
    expect(routingStatus(new Request('http://127.0.0.1/api/routing'), { NODE_ENV: 'development' })).toMatchObject({ available: true, provider: 'fossgis_foot', localDemo: true });
  });
  it('parses real units without replacing street metrics with straight-line estimates', () => {
    const route = parseStreetRoute(osrm(), 'fossgis_foot', 2, 0)!;
    expect(route).toMatchObject({ quality: 'street', profile: 'foot', distanceMeters: 708.5, durationSeconds: 567.2, provider: 'fossgis_foot' });
    expect(route.geometry.coordinates).toHaveLength(3);
    expect(route.attribution.text).toContain('OpenStreetMap');
  });
  it('rejects missing/negative/nonfinite metrics, wrong leg counts and invalid geometry', () => {
    const invalid = [osrm(), osrm(), osrm(), osrm(), osrm()];
    invalid[0].routes[0].duration = -1;
    invalid[1].routes[0].legs = [];
    invalid[2].routes[0].geometry.coordinates[0][0] = 180;
    invalid[3].routes[0].legs[0].distance = 1;
    invalid[4].routes[0].distance = Infinity;
    invalid.forEach(value => expect(parseStreetRoute(value, 'fossgis_foot', 2)).toBeNull());
    expect(parseStreetRoute({ code: 'NoRoute' }, 'fossgis_foot', 2)).toBeNull();
  });
  it('uses the dedicated foot endpoint, identifying headers and no car/auto profile', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(osrm()));
    const result = await createStreetRouter({ fetcher })(points, 'fossgis_foot');
    expect(result.ok).toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain('/routed-foot/route/v1/foot/');
    expect(String(url)).not.toContain('routed-car');
    expect(init).toMatchObject({ method: 'GET', redirect: 'manual', cache: 'no-store' });
    expect(new Headers(init?.headers).get('user-agent')).toContain('QETTYQ');
    expect(new Headers(init?.headers).get('referer')).toBe('https://qettyqapp.anamai.kz/');
    expect(new Headers(init?.headers).has('content-type')).toBe(false);
  });
  it('requests pedestrian Valhalla costing explicitly and ORS foot-walking only', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(osrm()));
    await createStreetRouter({ fetcher })(points, 'valhalla_demo');
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({ costing: 'pedestrian', format: 'osrm', shape_format: 'geojson' });
    const ors = { features: [{ geometry: osrm().routes[0].geometry, properties: { summary: { distance: 708.5, duration: 567.2 }, segments: [{ distance: 708.5, duration: 567.2 }] } }] };
    fetcher.mockResolvedValueOnce(json(ors));
    expect((await createStreetRouter({ fetcher })(points, 'openrouteservice', 'synthetic-key')).ok).toBe(true);
    expect(String(fetcher.mock.calls[1][0])).toContain('/foot-walking/geojson');
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get('authorization')).toBe('synthetic-key');
  });
  it('rate-limits repeated attempts and never automatically falls back to another provider', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    const request = createStreetRouter({ fetcher, now: () => 1_000 });
    expect(await request(points, 'fossgis_foot')).toEqual({ ok: false, reason: 'ROUTING_PROVIDER_UNAVAILABLE', providerHttpStatus: 503 });
    expect(await request(points, 'fossgis_foot')).toMatchObject({ ok: false, reason: 'ROUTING_RATE_LIMITED' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not send requests for missing ORS key or invalid points', async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await createStreetRouter({ fetcher })(points, 'openrouteservice')).toMatchObject({ ok: false, reason: 'ROUTING_KEY_MISSING' });
    expect(await createStreetRouter({ fetcher })([], 'fossgis_foot')).toMatchObject({ ok: false, reason: 'INVALID_POINTS' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('times out and exposes no provider body, URL, key or partial geometry', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(new Error('private provider details')))));
    expect(await createStreetRouter({ fetcher, timeoutMs: 5 })(points, 'fossgis_foot')).toEqual({ ok: false, reason: 'ROUTING_TIMEOUT' });
  });
  it('reports only safe provider HTTP status on a block, without retry or body exposure', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('private challenge body with URL and coordinates', { status: 403 }));
    const result = await createStreetRouter({ fetcher })(points, 'fossgis_foot');
    expect(result).toEqual({ ok: false, reason: 'ROUTING_PROVIDER_UNAVAILABLE', providerHttpStatus: 403 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toMatch(/private|coordinates|https/);
  });
  it('rejects a 3xx without following Location or sending a second request', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://another-provider.invalid/private' } }));
    const result = await createStreetRouter({ fetcher })(points, 'fossgis_foot');
    expect(result).toEqual({ ok: false, reason: 'ROUTING_PROVIDER_UNAVAILABLE', providerHttpStatus: 302 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.redirect).toBe('manual');
    expect(JSON.stringify(result)).not.toMatch(/another-provider|private/);
  });
});
