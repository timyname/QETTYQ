import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleChat } from '../../src/app/api/chat/route';
import { createSession, resetSessionStoreForTests } from '../../src/server/session/store';
import type { HostedRuntime } from '../../src/server/pilot/host-runtime';

let session: string, getEvents: ReturnType<typeof vi.fn<HostedRuntime['events']['get']>>;
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-24T12:00:00Z'));
  resetSessionStoreForTests(); session = createSession().id;
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('SYNTHETIC_TEST_NETWORK_FORBIDDEN'); }));
  getEvents = vi.fn<HostedRuntime['events']['get']>(async () => ({ dataMode: 'unavailable', freshness: 'unavailable',
    cacheStatus: 'miss', fetchedAt: null, expiresAt: null, source: null, coverage: null, items: [], warnings: ['SYNTHETIC_TEST'] }));
});
afterEach(() => { resetSessionStoreForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function chat(text: string) {
  const response = await handleChat(new Request('https://qettyq.example/api/chat', { method: 'POST',
    headers: { origin: 'https://qettyq.example', 'content-type': 'application/json', 'x-qettyq-session': session },
    body: JSON.stringify({ text, useAI: false, googleConsent: false }) }), undefined, { get: getEvents });
  expect(response.status).toBe(200); expect(fetch).not.toHaveBeenCalled(); return response.json();
}
describe('explicit place/meal intent owns dispatch, not a date or excluded event word', () => {
  it.each([
    ['Завтра музей, без концертов', 'activity'], ['Музей завтра, бюджет 5000', 'activity'],
    ['Прогулка завтра, без стендапа', 'walk'], ['Кофе завтра на 90 минут', 'food'],
    ['Coffee tomorrow, no concerts', 'food'], ['Park tomorrow, no ballet', 'walk'],
  ])('keeps %s in the place catalogue', async (text, goal) => {
    const body = await chat(text);
    expect(body.proposedContext.goal).toBe(goal); expect(body.eventsMeta).toBeNull(); expect(body.events).toEqual([]);
    expect(body.items.length, JSON.stringify({ reason: body.reason, reply: body.reply, context: body.proposedContext })).toBeGreaterThan(0); expect(getEvents).not.toHaveBeenCalled();
  });
  it('still consults the event source for a positive explicit event request', async () => {
    const body = await chat('Концерт завтра');
    expect(getEvents).toHaveBeenCalledOnce(); expect(body.eventsMeta).toMatchObject({ dataMode: 'unavailable' });
    expect(body.items).toEqual([]); expect(body.events).toEqual([]);
  });
});
