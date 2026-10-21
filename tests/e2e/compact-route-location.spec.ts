import { showRouteOptions } from './route-ui-helpers';
import { expect, test, type Page } from '@playwright/test';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';
import { translateText, type Language } from '../../src/client/i18n';
import { installOfflineTestGuards } from './offline-test-setup';

// UI-only checks: synthetic browser location, route estimates and empty map style.
// No street router, event ingestion, Google or AI traffic is permitted here.
test.beforeEach(async ({ page, context }) => {
  await installOfflineTestGuards(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
  await page.route('**/api/session', r => r.fulfill({ json: { sessionId: 'synthetic-ui-session' } }));
  await page.route('**/api/context', r => r.fulfill({ json: { accepted: true } }));
  await page.route('**/api/catalog?**', r => r.fulfill({ json: { items: pilotPlaces.map(publicPlace), dataMode: 'snapshot' } }));
  await page.route('**/api/events', r => r.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
  await page.route('**/api/routing', r => r.request().method() === 'GET' ? r.fulfill({ json: { available: false, provider: 'fossgis_foot', label: 'FOSSGIS / OSRM Foot', localDemo: false, reason: 'QA_OFFLINE' } }) : r.abort());
  await page.route('**/api/plans', r => {
    const body = r.request().postDataJSON();
    const stops = pilotPlaces.filter(p => body.placeIds.includes(p.id)).map(publicPlace);
    return r.fulfill({ json: { dataMode: 'synthetic_test', plan: { id: `synthetic-ui-${crypto.randomUUID()}`, stops, totalMinutes: body.context.origin ? 120 : null, travelMinutes: body.context.origin ? 45 : null, visitMinutes: 60, remainingMinutes: body.context.origin ? 600 : null, distanceKm: body.context.origin ? 2 : null, budget: { min: null, max: null }, feasibility: 'uncertain', warnings: [], legs: body.context.origin ? stops.map(() => ({ distanceKm: 2, estimatedMinutes: 45 })) : [] } } });
  });
  await page.route('https://tiles.openfreemap.org/**', r => r.request().url().endsWith('/styles/liberty') ? r.fulfill({ json: { version: 8, sources: { proof: { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · <a href="https://openfreemap.org">OpenFreeMap</a> · synthetic_test' } }, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e4eee5' } }, { id: 'proof', type: 'circle', source: 'proof' }] } }) : r.abort());
  await page.route('https://tile.openstreetmap.org/**', r => r.abort());
});

async function chooseMapPoint(page: Page) {
  const map = page.locator('.maplibregl-canvas');
  await expect(map).toBeVisible();
  await expect(page.locator('[data-map-engine="maplibre"] p[role="status"]')).toHaveCount(0);
  // The real snapshot can grow: a once-empty fixed pixel may now be a marker.
  // Pick an actual visible canvas point, never force a click through a venue.
  const point = await map.evaluate(canvas => {
    const box = canvas.getBoundingClientRect();
    for (let y = 330; y < Math.min(box.height - 220, 560); y += 18) {
      for (let x = 22; x < box.width - 70; x += 18) {
        if (document.elementFromPoint(box.left + x, box.top + y) === canvas) return { x, y };
      }
    }
    return null;
  });
  expect(point, 'a genuinely empty visible map point is available').not.toBeNull();
  await map.click({ position: point! });
}

for (const [language, native] of [['ru', 'Русский'], ['kk', 'Қазақша'], ['en', 'English']] as const) {
  test(`${language}: compact route, GPS stays in place, manual start and cancellation return to caller`, async ({ page }) => {
    const t = (text: string) => translateText(text, language as Language);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const routingRequests: string[] = [];
    page.on('request', r => { if (r.url().endsWith('/api/routing') && r.method() === 'POST') routingRequests.push(r.url()); });
    await page.goto('/');
    await page.getByRole('main', { name: 'Language selection' }).getByRole('button', { name: native, exact: true }).click();
    await page.getByRole('button', { name: t('Выбрать свой вайб'), exact: true }).click();
    await page.getByRole('button', { name: t('Пропустить подбор интересов'), exact: true }).click();
    await page.getByRole('button', { name: t('К условиям подборки'), exact: true }).click();
    await page.getByLabel(t('Свободное время'), { exact: true }).fill('720');
    await page.getByRole('button', { name: t('Выбрать старт на карте'), exact: true }).click();
    await page.getByRole('button', { name: t('Продолжить без изменения'), exact: true }).click();
    await expect(page.getByLabel(t('Свободное время'), { exact: true })).toBeVisible();
    await page.getByRole('button', { name: t('Выбрать старт на карте'), exact: true }).click();
    await chooseMapPoint(page);
    await expect(page.getByLabel(t('Свободное время'), { exact: true })).toBeVisible();
    await page.getByRole('button', { name: t('Поделиться геопозицией'), exact: true }).click();
    await expect(page.getByText(t('Точка старта получена. Точная геопозиция не сохраняется в памяти браузера.'), { exact: true })).toBeVisible();
    await expect(page.getByLabel(t('Свободное время'), { exact: true })).toBeVisible();
    await page.getByRole('button', { name: t('Показать подборку'), exact: true }).click();
    await page.getByRole('article').first().getByRole('button', { name: t('Подробнее'), exact: true }).click();
    await page.getByRole('button', { name: t('Оценить путь'), exact: true }).click();
    const route = page.getByRole('main', { name: t('Маршрут по Астане'), exact: true });
    const sheet = page.getByRole('region', { name: t('План маршрута'), exact: true });
    await expect(route).toBeVisible();
    await expect(page.getByLabel(t('Дата и время начала маршрута'), { exact: true })).toBeHidden();
    await expect(sheet).toHaveCount(0);
    const bubble = page.getByRole('button', { name: t('Развернуть план маршрута'), exact: true });
    for (const [width, height] of [[360, 800], [390, 844], [430, 932], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await expect.poll(async () => (await bubble.boundingBox())!.height).toBeLessThan(height * .4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      // visualViewport and fixed dock settle on separate resize frames.
      // Keep the exact non-overlap invariant, polling the settled pair.
      await expect.poll(async () => {
        const dock = await page.getByRole('navigation').boundingBox();
        const panel = await bubble.boundingBox();
        return Boolean(dock && panel && panel.y + panel.height <= dock.y);
      }).toBe(true);
      await expect(route.getByRole('link', { name: 'OpenFreeMap', exact: true })).toBeVisible();
      await page.screenshot({ path: `output/playwright/compact-route/${language}-collapsed-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: t('Развернуть план маршрута'), exact: true }).click(); await showRouteOptions(page);
    await expect(sheet.getByText(t('Стоимость уточняется.'), { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: t('Начать маршрут'), exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: t('Открыть в 2ГИС без расчёта'), exact: true })).toHaveAttribute('href', /2gis\.ru\/directions\/tab\/pedestrian\/points\/71\.4304,51\.1282\|/);
    await expect(page.getByLabel(t('Дата и время начала маршрута'), { exact: true })).toBeVisible();
    await page.getByLabel(t('Дата и время начала маршрута'), { exact: true }).fill('2026-11-05T18:30');
    await sheet.getByRole('button', { name: t('Моё местоположение'), exact: true }).click();
    await expect(route).toBeVisible();
    await expect(page.getByText(t('Точка старта получена. Точная геопозиция не сохраняется в памяти браузера.'), { exact: true })).toBeVisible();
    await page.getByRole('button', { name: t('Развернуть план маршрута'), exact: true }).click(); await showRouteOptions(page);
    await expect(page.getByLabel(t('Дата и время начала маршрута'), { exact: true })).toHaveValue('2026-11-05T18:30');
    await sheet.getByRole('button', { name: t('Изменить точку старта'), exact: true }).first().click();
    await page.getByRole('button', { name: t('Продолжить без изменения'), exact: true }).click();
    await expect(route).toBeVisible();
    await page.getByRole('button', { name: t('Развернуть план маршрута'), exact: true }).click(); await showRouteOptions(page);
    await sheet.getByRole('button', { name: t('Изменить точку старта'), exact: true }).first().click();
    await chooseMapPoint(page);
    await expect(route).toBeVisible();
    await page.getByRole('button', { name: t('Развернуть план маршрута'), exact: true }).click(); await showRouteOptions(page);
    await expect(page.getByLabel(t('Дата и время начала маршрута'), { exact: true })).toHaveValue('2026-11-05T18:30');
    await page.getByRole('region', { name: t('Расчёт пути по улицам'), exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: t('Открыть в 2ГИС без расчёта'), exact: true })).toBeVisible();
    await page.screenshot({ path: `output/playwright/compact-route/${language}-expanded-390.png` });
    await page.getByRole('button', { name: t('Свернуть план маршрута'), exact: true }).click();
    await page.getByRole('button', { name: t('На карту'), exact: true }).click();
    await page.getByRole('button', { name: t('Моё местоположение'), exact: true }).click();
    await expect(page.getByText(t('Точка старта получена. Точная геопозиция не сохраняется в памяти браузера.'), { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: t('Город на карте'), exact: true })).toBeVisible();
    expect(routingRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('denied location keeps the map visible and offers a manual alternative', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1, message: 'synthetic denied' } as GeolocationPositionError) } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('button', { name: 'QETTYQ — на главную', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  await page.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await expect(page.getByText('Доступ не получен. Можно выбрать старт на карте или продолжить без него.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Город на карте', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Выбрать старт на карте', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить без изменения', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Город на карте', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Выбрать старт на карте', exact: true }).click();
  await chooseMapPoint(page);
  await expect(page.getByRole('heading', { name: 'Город на карте', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toHaveCount(0);
});

test('chosen departure survives GPS/manual start refresh while each refresh clears street geometry', async ({ page, context }) => {
  let calls = 0;
  const pending: Array<() => void> = [];
  await page.route('**/api/routing', async r => {
    if (r.request().method() === 'GET') return r.fulfill({ json: { available: true, provider: 'fossgis_foot', label: 'SYNTHETIC TEST — no provider call', localDemo: true, reason: null } });
    calls++;
    const { points } = r.request().postDataJSON() as { points: Array<{ lat: number; lon: number }> };
    if (calls > 1) await new Promise<void>(resolve => pending.push(resolve));
    return r.fulfill({ json: { dataMode: 'synthetic_test', route: { quality: 'street', profile: 'foot', provider: 'fossgis_foot', fetchedAt: new Date().toISOString(), geometry: { type: 'LineString', coordinates: points.map(p => [p.lon, p.lat]) }, distanceMeters: 1000, durationSeconds: 600, legs: points.slice(1).map(() => ({ distanceMeters: 1000, durationSeconds: 600 })), attribution: { text: 'FOSSGIS / OSRM Foot · synthetic_test', url: 'https://routing.openstreetmap.de/about.html' }, warnings: [] } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByLabel('Свободное время', { exact: true }).fill('720');
  await page.getByRole('button', { name: 'Поделиться геопозицией', exact: true }).click();
  await expect(page.getByText('Старт выбран. Точка хранится только до закрытия страницы.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  const sheet = page.getByRole('region', { name: 'План маршрута', exact: true });
  const date = page.getByLabel('Дата и время начала маршрута', { exact: true });
  const geometry = page.locator('[data-map-engine][data-route-quality="street"]');
  const expand = async () => { await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click(); await showRouteOptions(page); };
  const calculate = async () => {
    await expect(geometry).toBeVisible();
  };
  await expand();
  await date.fill('2026-11-05T18:30');
  await calculate();
  await context.setGeolocation({ latitude: 51.132, longitude: 71.44 });
  await sheet.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Развернуть план маршрута', exact: true })).toBeVisible();
  await expect(geometry).toHaveCount(0);
  await expand();
  await expect(date).toHaveValue('2026-11-05T18:30');
  await expect(sheet.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' })).toBeChecked();
  await expect.poll(() => pending.length).toBe(1);
  pending.shift()!();
  await calculate();
  await sheet.getByRole('button', { name: 'Изменить точку старта', exact: true }).first().click();
  await chooseMapPoint(page);
  await expect(page.getByRole('button', { name: 'Развернуть план маршрута', exact: true })).toBeVisible();
  await expect(geometry).toHaveCount(0);
  await expand();
  await expect(date).toHaveValue('2026-11-05T18:30');
  await expect(sheet.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' })).toBeChecked();
  await expect.poll(() => pending.length).toBe(1);
  pending.shift()!();
  await calculate();
  expect(calls).toBe(3);
});
