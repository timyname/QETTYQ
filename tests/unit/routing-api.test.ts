import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST, handleRouting } from '../../src/app/api/routing/route';
import { POST as openSession } from '../../src/app/api/session/route';
import { resetSessionStoreForTests } from '../../src/server/session/store';
import { requestStreetRoute } from '../../src/server/pilot/street-routing';

vi.mock('../../src/server/pilot/street-routing', async original => ({ ...await original<typeof import('../../src/server/pilot/street-routing')>(), requestStreetRoute: vi.fn() }));
const points = [{ lat: 51.1282, lon: 71.4304 }, { lat: 51.133, lon: 71.428 }];
function req(body: unknown, cookie = '', host = 'http://127.0.0.1:3000') { return new Request(`${host}/api/routing`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
async function session() { return (await openSession(new Request('http://127.0.0.1:3000/api/session', { method: 'POST' }))).headers.get('set-cookie')!.split(';')[0]; }
beforeEach(() => { resetSessionStoreForTests(); vi.clearAllMocks(); vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('QETTYQ_ROUTING_PROVIDER', 'fossgis_foot'); vi.stubEnv('QETTYQ_PUBLIC_ROUTING_ENABLED', ''); });
afterEach(() => vi.unstubAllEnvs());

describe('routing API with mocked routing adapter, no provider traffic', () => {
  it('exposes safe status without keys or location', async () => {
    const response = await GET(new Request('http://127.0.0.1/api/routing'));
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toMatchObject({ available: true, provider: 'fossgis_foot' });
    expect(requestStreetRoute).not.toHaveBeenCalled();
  });
  it('requires a valid local session', async () => {
    expect((await POST(req({ points, consent: true, provider: 'fossgis_foot' }))).status).toBe(401);
    expect(requestStreetRoute).not.toHaveBeenCalled();
  });
  it.each([false, undefined, 'true'])('never sends points without literal true consent: %s', async consent => {
    const response = await POST(req({ points, consent, provider: 'fossgis_foot' }, await session()));
    expect(response.status).toBe(400); expect(requestStreetRoute).not.toHaveBeenCalled();
  });
  it('binds consent to the actual provider and validates Astana scope', async () => {
    const cookie = await session();
    expect((await POST(req({ points, consent: true, provider: 'openrouteservice' }, cookie))).status).toBe(400);
    expect((await POST(req({ points: [{ lat: 43, lon: 76 }, points[1]], consent: true, provider: 'fossgis_foot' }, cookie))).status).toBe(400);
    expect(requestStreetRoute).not.toHaveBeenCalled();
  });
  it('blocks cross-site mutation before any provider call', async () => {
    const request = req({ points, consent: true, provider: 'fossgis_foot' }, await session());
    request.headers.set('origin', 'https://evil.example');
    expect((await POST(request)).status).toBe(403); expect(requestStreetRoute).not.toHaveBeenCalled();
  });
  it('a public flag without a real injected limiter cannot enable routing', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('QETTYQ_PUBLIC_ROUTING_ENABLED', 'true'); vi.stubEnv('QETTYQ_ROUTING_GLOBAL_LIMITER_READY', 'true');
    const result = await GET(new Request('https://qettyq.example/api/routing'));
    expect(await result.json()).toMatchObject({ available: false, reason: 'GLOBAL_ROUTING_LIMITER_REQUIRED' });
    expect(requestStreetRoute).not.toHaveBeenCalled();
  });
  it('reserves before provider traffic and fails closed when denied or unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = await session(), body = { points, consent: true, provider: 'fossgis_foot' };
    const reserve = vi.fn().mockResolvedValue(false);
    expect((await handleRouting(req(body, cookie, 'https://qettyq.example'), { publicEnabled: true, reserve })).status).toBe(429);
    expect(reserve).toHaveBeenCalledWith(expect.any(String)); expect(requestStreetRoute).not.toHaveBeenCalled();
    reserve.mockRejectedValueOnce(new Error('private D1 details'));
    const denied = await handleRouting(req(body, cookie, 'https://qettyq.example'), { publicEnabled: true, reserve });
    expect(denied.status).toBe(503); expect(JSON.stringify(await denied.json())).not.toContain('private');
  });
  it('reports provider errors without fabricated geometry and invokes no second provider', async () => {
    vi.mocked(requestStreetRoute).mockResolvedValueOnce({ ok: false, reason: 'ROUTING_TIMEOUT' });
    const response = await POST(req({ points, consent: true, provider: 'fossgis_foot' }, await session()));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ route: null, error: 'ROUTING_TIMEOUT', providerHttpStatus: null });
    expect(requestStreetRoute).toHaveBeenCalledTimes(1);
  });
  it('passes a safe numeric provider rejection status without location/body details', async () => {
    vi.mocked(requestStreetRoute).mockResolvedValueOnce({ ok: false, reason: 'ROUTING_PROVIDER_UNAVAILABLE', providerHttpStatus: 403 });
    const response = await POST(req({ points, consent: true, provider: 'fossgis_foot' }, await session()));
    expect(await response.json()).toEqual({ route: null, error: 'ROUTING_PROVIDER_UNAVAILABLE', providerHttpStatus: 403 });
  });
});
