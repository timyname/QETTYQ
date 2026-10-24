import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';
import { showRouteOptions } from './route-ui-helpers';

// Synthetic browser fixture only. No real event, availability, price or provider
// integration is asserted by this test. Real-source smoke is a separate check.
const NOW = '2026-10-20T10:00:00+05:00';
const today = {
  id: 'synthetic_test:today', name: 'SYNTHETIC TEST — событие сегодня', cityId: 'astana',
  category: 'театр', venueName: 'SYNTHETIC TEST — площадка', address: 'Тестовый адрес, не для посещения',
  lat: null, lon: null, startsAt: '2026-10-20T18:00:00+05:00', endsAt: null,
  timeZone: 'Asia/Almaty', durationMinutes: null, contentLanguage: 'kk',
  priceFromKzt: null, price: { kind: 'unknown', minMinor: null, currency: null, basis: 'unknown' },
  status: 'scheduled', availability: 'unknown', image: null,
  bookingUrl: 'https://example.invalid/synthetic-test/registration',
  contactUrl: 'https://example.invalid/synthetic-test/today',
  requiredCredit: { text: 'Давай Сходим', url: 'https://example.invalid/synthetic-test/today' },
  fetchedAt: NOW, warnings: ['COORDINATES_UNKNOWN', 'DURATION_UNKNOWN', 'PRICE_UNKNOWN'],
  provenance: { sourceId: 'synthetic_test', sourceUrl: 'https://example.invalid/synthetic-test/today', parserVersion: 'e2e-fixture-v1', scheduleQuality: 'synthetic_test', priceQuality: 'unknown' },
};
const tomorrow = {
  ...today, id: 'synthetic_test:tomorrow', name: 'SYNTHETIC TEST — событие завтра',
  startsAt: '2026-10-21T18:00:00+05:00',
};

test('synthetic_test: афиша фильтрует сегодня, сохраняет событие и показывает честные детали с обязательным credit', async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/events', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      items: [today, tomorrow], dataMode: 'snapshot', freshness: 'fresh',
      fetchedAt: NOW, expiresAt: '2026-10-20T11:00:00+05:00', isSyntheticTest: true,
    }),
  }));

  await openRussianApp(page);
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб' })).toBeEnabled();
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  const feed = page.getByRole('region', { name: 'Афиша Астаны' });
  await expect(feed).toBeVisible();
  await expect(feed.getByRole('article')).toHaveCount(2);
  const segments = feed.getByRole('group', { name: 'События', exact: true });
  await expect(segments.getByRole('button')).toHaveCount(2);
  await segments.getByRole('button', { name: 'События: 2 из 2' }).click();
  await expect(segments.getByRole('button', { name: 'События: 2 из 2' })).toHaveAttribute('aria-current', 'step');
  await feed.getByRole('button', { name: 'Сегодня', exact: true }).click();
  await expect(feed.getByRole('button', { name: 'Сегодня', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(feed.getByRole('article')).toHaveCount(1);
  await expect(feed.getByRole('heading', { name: today.name, exact: true })).toBeVisible();
  await expect(feed.getByRole('heading', { name: tomorrow.name, exact: true })).toHaveCount(0);
  await expect(feed.getByText('Стоимость уточняйте', { exact: true })).toBeVisible();
  await expect(feed.getByRole('img', { name: 'Афиша пока не добавлена', exact: true })).toBeVisible();
  await expect(feed.locator('img[src*="event-"]')).toHaveCount(0);
  await expect(feed.getByRole('link', { name: 'Афиша: Давай Сходим ↗' })).toHaveAttribute('href', today.requiredCredit.url);

  await feed.getByRole('button', { name: 'Сохранить событие', exact: true }).click();
  await expect(feed.getByRole('button', { name: 'Убрать событие из сохранённых', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('qettyq.saved.v2') ?? '[]'))).toContain(today.id);
  await feed.getByRole('button', { name: 'О событии', exact: true }).click();
  await expect(page.getByRole('heading', { name: today.name, exact: true })).toBeVisible();
  await expect(page.getByText('Қазақша', { exact: true })).toBeVisible();
  await expect(page.getByText('Продолжительность и время окончания не указаны.', { exact: true })).toBeVisible();
  await expect(page.getByText('Координаты не предоставлены источником. Точку на карте и время пути не подставляем наугад.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Построить внешний маршрут', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Подробности и запись', exact: true })).toHaveAttribute('href', today.bookingUrl);
  await expect(page.getByRole('link', { name: 'Афиша: Давай Сходим ↗' })).toHaveAttribute('href', today.requiredCredit.url);
  await expect(page.getByRole('button', { name: 'Событие сохранено', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole('button', { name: 'Назад', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: today.name, exact: true })).toBeInViewport();
    await page.screenshot({ path: `exports/screenshots/ui-review-38/event-synthetic-${width}.png` });
  }

  const profile = page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('button', { name: 'Профиль', exact: true });
  await profile.click();
  await page.getByRole('button', { name: /Сохранённые места/ }).click();
  await expect(page.getByRole('heading', { name: 'Сохранённое', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(today.name) })).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-screen="saved"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сохранённое', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(today.name) })).toBeVisible();
});

test('synthetic geocoded event is selectable on the map and routable without invented duration or generated photo', async ({ page, context }) => {
  await installOfflineTestGuards(page);
  await page.clock.setFixedTime(new Date(NOW));
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.13, longitude: 71.44 });
  const event = { ...today, lat: 51.1282, lon: 71.4304, freshness: 'fresh' };
  // Isolate the event marker instead of asserting that a 749-POI cluster is an
  // individual marker before zoom. Clustering is separately tested by MapCanvas.
  await page.route('**/api/catalog?**', route => route.fulfill({ json: { items: [], dataMode: 'synthetic_test' } }));
  await page.route('**/api/events', route => route.fulfill({ json: { items: [event], dataMode: 'snapshot', freshness: 'fresh', fetchedAt: NOW } }));
  await page.route('**/api/plans', route => {
    expect(route.request().postDataJSON().placeIds).toEqual([event.id]);
    return route.fulfill({ json: { plan: { id: 'synthetic-event-unknown-duration', stops: [{ ...event, durationState: 'unknown', price: null }], totalMinutes: null, travelMinutes: null, visitMinutes: null, remainingMinutes: null, distanceKm: null, budget: { min: null, max: null }, feasibility: 'uncertain', warnings: ['DURATION_UNKNOWN'], legs: [] } } });
  });
  await page.route('**/api/routing', route => route.fulfill({ json: { available: false, provider: 'fossgis_foot', label: 'SYNTHETIC disabled', reason: 'QA_DISABLED', localDemo: false } }));
  await openRussianApp(page);
  await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  const marker = page.getByRole('button', { name: new RegExp('SYNTHETIC TEST — событие сегодня') }).first();
  await expect(marker).toBeVisible({ timeout: 20_000 });
  await marker.click();
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  await expect(page.getByText('Продолжительность и время окончания не указаны.', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Афиша пока не добавлена', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click();
  const sheet = page.getByRole('region', { name: 'План маршрута', exact: true });
  await expect(sheet).toContainText('Длительность уточняется');
  await expect(sheet).not.toContainText(/посещение [≈]?0 мин/);
  await expect(sheet.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveCount(0);
  await showRouteOptions(page);
  await sheet.getByRole('button', { name: 'Моё местоположение', exact: true }).click();
  // The fixture intentionally retains this plan ID; refreshing its origin keeps
  // the same expanded component, rather than creating a new collapsed plan.
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Открыть в 2ГИС без расчёта', exact: true })).toHaveAttribute('href', /2gis\.ru\/directions\/tab\/pedestrian\/points\/71\.44,51\.13\|71\.4304,51\.1282/);
  await page.screenshot({ path: 'output/playwright/qa-route-refresh/event-unknown-duration.png' });
});
