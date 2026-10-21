import { showRouteOptions } from './route-ui-helpers';
import { expect, test, type Page } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

// Events are explicitly unavailable in these UI tests. Real vector-map browser
// smoke is recorded separately; this file accepts the documented Leaflet fallback.
test.use({ timezoneId: 'America/New_York' });
test.beforeEach(async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.route('**/api/routing', route => route.fulfill({ json: { available: false, provider: 'fossgis_foot', label: 'SYNTHETIC disabled', reason: 'QA_DISABLED', localDemo: false } }));
  await page.route('**/api/events', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null }) }));
});

async function conditions(page: Page) {
  await openRussianApp(page);
  await page.getByRole('button', { name: 'Выбрать свой вайб' }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toBeVisible();
}

test('бюджет: пресеты, 0 отдельно от null, своя сумма и отказ значения выше лимита', async ({ page }) => {
  await conditions(page);
  const group = page.getByRole('group', { name: 'Быстрый выбор бюджета на человека' });
  const input = page.getByLabel('Бюджет на человека, ₸', { exact: true });
  const strict = page.getByRole('checkbox', { name: 'Не предлагать варианты с неизвестной ценой' });
  await group.getByRole('button', { name: 'Только бесплатные варианты, 0 ₸', exact: true }).click();
  await expect(input).toHaveValue('0');
  await expect(strict).toBeChecked();
  await expect(page.getByText('Покажем только подтверждённо бесплатные варианты.', { exact: true })).toBeVisible();
  await group.getByRole('button', { name: /Без ограничений/ }).click();
  await expect(input).toHaveValue('');
  await expect(strict).not.toBeChecked();
  await expect(group.getByRole('button', { name: /Без ограничений/ })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: /Бюджет 3.000 ₸ на человека/ }).click();
  await expect(input).toHaveValue('3000');
  await input.fill('12345');
  await expect(input).toHaveValue('12345');
  await input.fill('1000001');
  await expect(page.getByRole('alert').filter({ hasText: 'Введите целую сумму от 0 до 1 000 000 ₸.' })).toBeVisible();
  await expect(input).toHaveValue('12345');
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    await group.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `exports/screenshots/v6/budget-${width}.png` });
  }
  await group.getByRole('button', { name: /Без ограничений/ }).click();
  const request = page.waitForRequest(r => r.url().endsWith('/api/chat') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Показать подборку' }).click();
  expect((await request).postDataJSON().context).toMatchObject({ budget: null, strictBudget: false });
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
});

test('маршрут: время Астаны независимо от timezone устройства, внутренний скролл, CTA и полноэкранная карта', async ({ page, context }) => {
  // Synthetic test origin: browser permission override, never the person's location.
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
  await page.clock.setFixedTime(new Date('2026-10-20T05:00:00Z'));
  await conditions(page);
  await page.getByLabel('Свободное время', { exact: true }).fill('720');
  await page.getByRole('button', { name: 'Поделиться геопозицией' }).click();
  await expect(page.getByText('Старт выбран. Точка хранится только до закрытия страницы.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку' }).click();
  const card = page.getByRole('article').first();
  await card.getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  const plan = page.getByRole('main', { name: 'Маршрут по Астане' });
  const sheet = page.getByRole('region', { name: 'План маршрута' });
  await expect(plan).toBeVisible();
  await page.getByRole('button', { name: 'Развернуть план маршрута' }).click(); await showRouteOptions(page);
  const departure = page.getByLabel('Дата и время начала маршрута', { exact: true });
  await expect(departure).toHaveValue('2026-10-20T10:00');
  await departure.fill('2026-10-23T18:30');
  await expect(departure).toHaveValue('2026-10-23T18:30');
  await expect(sheet.getByText('Мой план · 23 октября', { exact: true })).toBeVisible();
  await expect(sheet.getByText('18:30 · начало', { exact: true })).toBeVisible();
  await expect(sheet.locator('#route-details > ol > li')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Начать маршрут', exact: true })).toHaveCount(0);
  const cta = page.getByRole('link', { name: 'Открыть в 2ГИС без расчёта', exact: true });
  await expect(cta).toHaveAttribute('href', /points\/71\.4304,51\.1282\|/);
  await expect(cta).toHaveAttribute('href', /\/directions\/tab\/pedestrian\//);
  await expect(page.getByRole('button', { name: 'Свернуть план маршрута' })).toBeVisible();
  const note = sheet.getByText('На карте — точки плана, не линия дороги. Время пешком оценено по прямой; точный путь уточнит навигация. Посещения — проектная оценка, не бронь.', { exact: true });
  await note.scrollIntoViewIfNeeded();
  await expect(note).toBeVisible();
  await expect(cta).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    // Browser viewport changes and the fixed dock can settle on different frames.
    // Keep the non-overlap assertion, but wait for the resized layout to settle.
    await expect.poll(async () => {
      const dock = await page.getByRole('navigation', { name: 'Основная навигация' }).boundingBox();
      const action = await cta.boundingBox();
      return Boolean(dock && action && action.y + action.height <= dock.y);
    }).toBe(true);
    await page.screenshot({ path: `exports/screenshots/v6/route-${width}.png` });
  }
  await page.getByRole('button', { name: 'Свернуть план маршрута', exact: true }).click();
  await page.getByRole('button', { name: 'На карту', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Город на карте' })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas, [data-map-engine="fallbackleaflet"] .leaflet-container')).toBeVisible();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    const bounds = await page.locator('[data-map-engine]').boundingBox();
    expect(Math.round(bounds!.width)).toBe(width);
    expect(Math.round(bounds!.height)).toBeGreaterThanOrEqual(930);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `exports/screenshots/v6/map-${width}.png` });
  }
});
