import { expect, test, type Page } from '@playwright/test';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';

/** All data and geometry are synthetic fixtures. No provider, paid or otherwise, is contacted. */
async function fixture(page: Page, mode: 'ready' | 'unavailable' | 'error', unknownDuration = false) {
  let calls = 0;
  const places = pilotPlaces.slice(0, 3).map(publicPlace);
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const body = request.postData() ? request.postDataJSON() : null;
    const respond = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/maps/config') return respond({ enabled: false, provider: 'openstreetmap' });
    if (url.pathname === '/api/session') return respond({ session: { id: 'synthetic-route-qa' } });
    if (url.pathname === '/api/catalog') return respond({ items: places, dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return respond({ items: [], dataMode: 'unavailable' });
    if (url.pathname === '/api/assistant/status') return respond({ available: false, configured: false, reason: 'QA_OFFLINE' });
    if (url.pathname === '/api/memory') return respond({ available: true, enabled: false, profile: null, messages: [], visits: [], consents: {} });
    if (url.pathname === '/api/context') return respond({ context: body });
    if (url.pathname === '/api/chat') return respond({ reply: 'SYNTHETIC QA', items: places, events: [], mode: 'deterministic', dataMode: 'synthetic_test', context: body?.context });
    if (url.pathname === '/api/routing') {
      if (request.method() === 'GET') return respond({ available: mode !== 'unavailable', provider: 'fossgis_foot', label: 'SYNTHETIC', reason: null, localDemo: true });
      calls++;
      if (mode === 'error') return route.fulfill({ status: 503, json: { route: null, error: 'ROUTING_TIMEOUT' } });
      const points = body.points as Array<{ lat: number; lon: number }>;
      return respond({ dataMode: 'synthetic_test', route: { quality: 'street', profile: 'foot', provider: 'fossgis_foot', fetchedAt: '2026-10-21T00:00:00Z', geometry: { type: 'LineString', coordinates: points.map(p => [p.lon, p.lat]) }, distanceMeters: 1200, durationSeconds: 1200, legs: points.slice(1).map(() => ({ distanceMeters: 1200, durationSeconds: 1200 })), attribution: { text: 'SYNTHETIC walking route', url: 'https://routing.openstreetmap.de/about.html' }, warnings: [] } });
    }
    if (url.pathname === '/api/plans') return respond({ plan: { id: 'synthetic-route-plan', stops: places.filter(p => body?.placeIds?.includes(p.id)).map(p => ({ ...p, durationMinutes: unknownDuration ? null : 55, durationState: unknownDuration ? 'unknown' : 'estimated' })), totalMinutes: body.context.origin && !unknownDuration ? 202 : null, travelMinutes: body.context.origin ? 147 : null, remainingMinutes: body.context.origin ? 518 : null, distanceKm: body.context.origin ? 9.1 : null, visitMinutes: unknownDuration ? null : 55, budget: { min: null, max: null }, feasibility: 'uncertain', legs: body.context.origin ? [{ estimatedMinutes: 147, distanceKm: 9.1 }] : [] } });
    return route.fulfill({ status: 503, json: { error: { code: 'QA_OFFLINE_UNHANDLED_API' } } });
  });
  return () => calls;
}

async function openPlan(page: Page, withOrigin = true) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  if (withOrigin) await page.getByRole('button', { name: 'Поделиться геопозицией', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click();
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
});

test('build explicitly, then start; hours appear and compact map return restores all places', async ({ page }) => {
  const calls = await fixture(page, 'ready');
  await openPlan(page);
  await expect(page.getByRole('heading', { name: 'Примерно 3 ч 22 мин', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveCount(0);
  expect(calls()).toBe(0);
  await page.getByRole('button', { name: 'Проложить маршрут', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveAttribute('href', /2gis\.ru\/directions\/tab\/pedestrian/);
  await expect(page.getByRole('heading', { name: 'Примерно 1 ч 15 мин', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/route-start-flow/calculated-synthetic.png' });
  expect(calls()).toBe(1);
  await page.getByRole('button', { name: 'Свернуть план маршрута', exact: true }).click();
  const mapReturn = page.getByRole('button', { name: 'На карту', exact: true });
  const box = await mapReturn.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(56);
  await mapReturn.click();
  await expect(page.getByRole('heading', { name: 'Город на карте', exact: true })).toBeVisible();
  expect(calls()).toBe(1);
});

for (const mode of ['unavailable', 'error'] as const) test(`${mode}: no fake street route, explicit external alternative, no automatic retries`, async ({ page }) => {
  const calls = await fixture(page, mode);
  await openPlan(page);
  if (mode === 'error') await page.getByRole('button', { name: 'Проложить маршрут', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Открыть в 2ГИС без расчёта', exact: true })).toBeVisible();
  await expect(page.locator('[data-route-quality="street"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Свернуть план маршрута', exact: true }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click();
  expect(calls()).toBe(mode === 'error' ? 1 : 0);
});

test('unknown origin asks for a start and never silently calls routing', async ({ page }) => {
  const calls = await fixture(page, 'ready');
  await openPlan(page, false);
  await expect(page.getByRole('heading', { name: 'Нужна точка старта', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'План маршрута', exact: true }).getByRole('button', { name: 'Выбрать точку старта', exact: true }).last()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveCount(0);
  expect(calls()).toBe(0);
});

test('successful street calculation never invents an unknown visit duration', async ({ page }) => {
  const calls = await fixture(page, 'ready', true);
  await openPlan(page);
  await page.getByRole('button', { name: 'Проложить маршрут', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Время нужно уточнить', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'План маршрута', exact: true }).getByText(/Длительность уточняется/).first()).toBeVisible();
  expect(calls()).toBe(1);
});
