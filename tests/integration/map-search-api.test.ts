import { expect, it } from 'vitest';
import { POST as openSession } from '../../src/app/api/session/route';
import { DELETE as deleteSession } from '../../src/app/api/session/data/route';
import { POST as search } from '../../src/app/api/maps/search/route';
it('requires a session, rejects cross-site calls, returns no-store snapshot without storing search text', async () => {
  const request = (body: unknown, token?: string, cross = false) => new Request('https://qettyq.test/api/maps/search', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'x-qettyq-session': token } : {}), ...(cross ? { origin: 'https://untrusted.test' } : {}) }, body: JSON.stringify(body) });
  expect((await search(request({ query: 'Арарат' }))).status).toBe(401);
  const opened = await openSession(new Request('https://qettyq.test/api/session', { method: 'POST' }));
  const token = opened.headers.get('x-qettyq-session')!;
  try {
    expect((await search(request({ query: 'Арарат' }, token, true))).status).toBe(403);
    expect((await search(request({ query: 'a' }, token))).status).toBe(400);
    const response = await search(request({ query: 'Арарат' }, token));
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
    const body = await response.json(); expect(body).toMatchObject({ dataMode: 'snapshot', searchStored: false, provider: 'osm_local' });
    expect(body.items[0].title).toBe('Арарат');
  } finally { await deleteSession(new Request('https://qettyq.test/api/session/data', { method: 'DELETE', headers: { 'x-qettyq-session': token } })); }
});
