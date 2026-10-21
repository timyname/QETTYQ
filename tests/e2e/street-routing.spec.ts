import { showRouteOptions } from './route-ui-helpers';
import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

// Explicitly synthetic street geometry for UI wiring, not proof of a real road.
// The one real FOSSGIS adapter smoke is documented separately.
test.beforeEach(async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.route('**/api/events', r => r.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
  await page.route('**/api/routing', async r => {
    if (r.request().method() === 'GET') await r.fulfill({ json: { available: true, provider: 'fossgis_foot', label: 'FOSSGIS / OSRM Foot', localDemo: true, reason: null } });
    else await r.fallback();
  });
});
async function routeScreen(page: Page, context: BrowserContext) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
  await openRussianApp(page);
  await page.getByRole('button', { name: 'Выбрать свой вайб' }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByLabel('Свободное время', { exact: true }).fill('720');
  await page.getByRole('button', { name: 'Поделиться геопозицией' }).click();
  await expect(page.getByText('Старт выбран. Точка хранится только до закрытия страницы.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку' }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута' }).click(); await showRouteOptions(page);
  await page.getByRole('region', { name: 'Расчёт пути по улицам' }).scrollIntoViewIfNeeded();
}

test('улицы: явное согласие, одна 401-сессия, метрики fixture-ответа и очистка линии', async ({ page, context }) => {
  let calls = 0;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/routing', async r => {
    if (r.request().method() !== 'POST') return r.fallback();
    calls++;
    const payload = r.request().postDataJSON();
    expect(payload).toMatchObject({ consent: true, provider: 'fossgis_foot' });
    if (calls === 1) return r.fulfill({ status: 401, json: { error: 'SESSION_REQUIRED' } });
    const coordinates = payload.points.map((p: { lat: number; lon: number }) => [p.lon, p.lat]);
    await r.fulfill({ json: { dataMode: 'synthetic_test', route: { quality: 'street', profile: 'foot', provider: 'fossgis_foot', fetchedAt: '2026-10-20T00:00:00Z', geometry: { type: 'LineString', coordinates }, distanceMeters: 960, durationSeconds: 720, legs: [{ distanceMeters: 960, durationSeconds: 720 }], attribution: { text: 'FOSSGIS / OSRM Foot · synthetic_test', url: 'https://routing.openstreetmap.de/about.html' }, warnings: [] } } });
  });
  await routeScreen(page, context);
  await expect(page.getByText(/Источник: FOSSGIS/)).toBeVisible();
  expect(calls).toBe(2); // One automatic calculation, with one pre-provider auth renewal.
  await page.getByRole('button', { name: 'Убрать дорожный расчёт', exact: true }).click();
  const button = page.getByRole('button', { name: 'Проложить маршрут', exact: true });
  await expect(button).toBeEnabled(); expect(calls).toBe(2);
  const consent = page.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' });
  await expect(consent).toBeChecked(); await consent.uncheck(); await expect(button).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' }).check();
  await button.click();
  await expect(page.getByText('1,0 км по улицам', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('≈12 мин по улицам', { exact: true })).toBeVisible();
  await expect(page.locator('[data-map-engine][data-route-quality="street"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.maplibregl-canvas:visible, .leaflet-container:visible').first()).toBeVisible({ timeout: 20_000 });
  expect(calls).toBe(3);
  await expect(page.getByRole('link', { name: 'Исправить карту', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Свернуть план маршрута' }).click();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const action = await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).boundingBox();
    const dock = await page.getByRole('navigation', { name: 'Основная навигация' }).boundingBox();
    expect(action!.y + action!.height).toBeLessThanOrEqual(dock!.y);
    await page.screenshot({ path: `exports/screenshots/routing-synthetic/foot-${width}.png` });
  }
  await page.getByRole('button', { name: 'Развернуть план маршрута' }).click(); await showRouteOptions(page);
  await page.getByRole('button', { name: 'Убрать дорожный расчёт' }).click();
  await expect(button).toBeEnabled();
  await expect(page.locator('[data-route-quality="street"]')).toHaveCount(0);
  const dock = page.getByRole('navigation', { name: 'Основная навигация' });
  await dock.getByRole('button', { name: 'Профиль', exact: true }).click();
  await page.setViewportSize({ width: 430, height: 932 });
  await dock.getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Город на карте' })).toBeVisible();
  await dock.getByRole('button', { name: 'Для тебя', exact: true }).click();
  await page.setViewportSize({ width: 360, height: 844 });
  expect(errors.filter(e => /getBoundingClientRect|MapCanvas|resize/i.test(e))).toEqual([]);
  expect(calls).toBe(3);
});

test('отказ провайдера не рисует линию и не повторяет запрос автоматически', async ({ page, context }) => {
  let calls = 0;
  await page.route('**/api/routing', async r => {
    if (r.request().method() !== 'POST') return r.fallback();
    calls++; await r.fulfill({ status: 503, json: { route: null, error: 'ROUTING_TIMEOUT' } });
  });
  await routeScreen(page, context);
  await expect(page.getByRole('status').filter({ hasText: 'Путь по улицам сейчас недоступен.' })).toBeVisible();
  await expect(page.locator('[data-route-quality="street"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Открыть в 2ГИС без расчёта', exact: true })).toHaveAttribute('href', /2gis\.ru\/directions\/tab\/pedestrian/);
  expect(calls).toBe(1);
});
