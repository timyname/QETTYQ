import { expect, test, type Page } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

test.beforeEach(async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.route('**/api/events', route => route.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
  await page.route('**/api/assistant/status', route => route.fulfill({ json: { available: false, reason: 'API_KEY_MISSING', localTestOnly: false } }));
});

async function home(page: Page) {
  await openRussianApp(page);
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб' })).toBeEnabled();
}

test('38 review: full-bleed welcome, 15 segments, compact setup and responsive geometry', async ({ page }) => {
  await home(page);
  await expect(page.getByRole('button', { name: 'Сначала посмотреть карту' })).toHaveCount(0);
  const welcome = page.locator('main');
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    await expect.poll(async () => Math.round((await welcome.boundingBox())!.height)).toBe(932);
    const image = page.getByRole('img', { name: /Иллюстрация: рука/ });
    // setViewportSize can resolve before the next mobile visualViewport layout.
    // Preserve exact full-bleed geometry, but wait for the resized frame.
    await expect.poll(async () => Math.round((await image.boundingBox())!.width)).toBe(width);
    await expect.poll(async () => Math.round((await image.boundingBox())!.height)).toBe(932);
    await page.screenshot({ path: `exports/screenshots/ui-review-38/welcome-${width}.png` });
  }
  await page.getByRole('button', { name: 'Выбрать свой вайб' }).click();
  const progress = page.getByRole('group', { name: 'Выбор интересов', exact: true });
  await expect(progress.locator('[data-state]')).toHaveCount(15);
  await expect(progress.locator('[data-state=active]')).toHaveCount(1);
  await expect(page.getByText('1/15', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Музеи, галереи и истории города.')).toBeVisible();
  await page.getByTestId('swipe-card').press('ArrowRight');
  await expect(progress.locator('[data-state=complete]')).toHaveCount(1);
  await expect(page.getByText('Живые концерты, рок и небольшие сцены.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Живая музыка', exact: true })).toBeInViewport();
  await expect.poll(async () => Math.round((await page.getByTestId('swipe-card').boundingBox())!.x)).toBe(0);
  await expect(progress.locator('[data-state=active]')).toHaveCSS('background-color', 'rgb(201, 255, 72)');
  await page.screenshot({ path: 'exports/screenshots/ui-review-38/swipe-430.png' });
  await page.getByRole('button', { name: 'Пропустить подбор интересов' }).click();
  await page.getByRole('button', { name: 'К условиям подборки' }).click();
  await expect(page.getByText('ШАГ 2 ИЗ 2', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Как провести время')).toHaveCount(0);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    await page.screenshot({ path: `exports/screenshots/ui-review-38/conditions-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});

test.describe('animated swipe', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('title remains painted and centered after consecutive animated choices', async ({ page }) => {
    await home(page);
    await page.getByRole('button', { name: 'Выбрать свой вайб' }).click();
    const card = page.getByTestId('swipe-card');
    for (const title of ['Живая музыка', 'Театр и балет', 'Танцы и новые знакомства']) {
      await card.press('ArrowRight');
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeInViewport();
      await expect.poll(async () => Math.round((await card.boundingBox())!.x)).toBe(0);
    }
  });
});

test('38 review: dock follows drag and keyboard; composer has no chips; bounded POST', async ({ page }) => {
  await home(page);
  await page.evaluate(() => {
    const memory = { version: 1, updatedAt: new Date().toISOString(), profile: { locale: 'ru', goal: 'new', minutes: 120, budget: 5000, likedTags: [] }, dialogue: Array.from({ length: 24 }, (_, index) => ({ id: `synthetic-${index}`, role: index % 2 ? 'assistant' : 'user', text: '🦄'.repeat(1500), createdAt: new Date().toISOString(), mode: index % 2 ? 'deterministic' : 'user' })) };
    localStorage.setItem('qettyq.local-memory.v1', JSON.stringify(memory));
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'QETTYQ — на главную' })).toBeEnabled();
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  const dock = page.getByRole('navigation', { name: 'Основная навигация' });
  const from = (await dock.getByRole('button', { name: 'Для тебя', exact: true }).boundingBox())!;
  const to = (await dock.getByRole('button', { name: 'Поиск', exact: true }).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await expect(dock).toHaveAttribute('data-dragging', 'true');
  await page.mouse.up();
  await expect(dock.getByRole('button', { name: 'Поиск', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Что ищем?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Кофе', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Открыть Kino.kz' })).toHaveCount(0);
  await page.getByText('О помощнике и памяти', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'AI пока недоступен' })).toBeDisabled();
  await page.getByText('О помощнике и памяти', { exact: true }).click();
  let bytes = 0;
  await page.route('**/api/chat', async route => {
    bytes = new TextEncoder().encode(route.request().postData()!).byteLength;
    expect(route.request().postDataJSON().history.length).toBeLessThanOrEqual(6);
    await route.fulfill({ json: { reply: 'SYNTHETIC TEST — ответ без провайдера', items: [], mode: 'deterministic' } });
  });
  await page.getByLabel('Сообщение помощнику').fill('Тихое место на час');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByText('SYNTHETIC TEST — ответ без провайдера')).toBeVisible();
  expect(bytes).toBeGreaterThan(0); expect(bytes).toBeLessThanOrEqual(14 * 1024);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 932 });
    const composer = (await page.getByLabel('Сообщение помощнику').boundingBox())!;
    const bottom = (await dock.boundingBox())!;
    expect(composer.y + composer.height).toBeLessThan(bottom.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `exports/screenshots/ui-review-38/chat-synthetic-${width}.png` });
  }
  await dock.getByRole('button', { name: 'Профиль', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Твой QETTYQ' })).toBeVisible();
});

test('38 review: map check and adjacent My plan, real catalogue point, foot-only modes', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  await page.getByLabel('Поиск места на карте').fill('Rafe');
  await page.getByRole('button', { name: /^Rafe · Расписание уточняйте/ }).first().click();
  await page.getByRole('button', { name: 'В план', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Добавлено в план', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Мой план · 1', exact: true })).toBeVisible();
  await expect(page.getByText('Цена неизвестна', { exact: false })).toBeVisible();
  const attribution = page.locator('[data-map-engine] a[href*="openstreetmap.org/copyright"]').first();
  await expect(attribution).toBeVisible();
  const creditBounds = (await attribution.boundingBox())!;
  const noticeBounds = (await page.getByRole('status').filter({ hasText: 'Добавлено в план.' }).boundingBox())!;
  expect(creditBounds.y + creditBounds.height).toBeLessThan(noticeBounds.y);
  await page.screenshot({ path: 'exports/screenshots/ui-review-38/map-plan-390.png' });
  await page.getByRole('button', { name: 'Мой план · 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Твой маршрут', exact: true })).toBeVisible();
  const sheet = page.getByRole('region', { name: 'План маршрута' });
  await expect(sheet.getByText('Пешком', { exact: true })).toBeVisible();
  // Unsupported modes are no longer drawn. Never allow an active unsupported mode.
  for (const mode of ['Авто', 'Такси', 'Автобус']) {
    const unsupported = sheet.getByRole('button', { name: mode, exact: true });
    if (await unsupported.count()) await expect(unsupported).toBeDisabled();
  }
  expect((await sheet.boundingBox())!.height).toBeLessThan(844 * .4);
  await expect(page.locator('[data-map-engine] a[href*="openstreetmap.org/copyright"]').first()).toBeVisible();
  await expect(page.getByText('Загружаем карту Астаны…', { exact: true })).toHaveCount(0, { timeout: 20_000 });
  await page.screenshot({ path: 'exports/screenshots/ui-review-38/route-390.png' });
});
