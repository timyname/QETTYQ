import { expect, test, type Page } from '@playwright/test';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';

/** Synthetic/offline web geometry checks. Not a physical iOS keyboard test. */
async function fixture(page: Page) {
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/maps/config') return reply({ enabled: false, provider: 'openstreetmap' });
    if (url.pathname === '/api/session') return reply({ session: { id: 'synthetic-safe-area' } });
    if (url.pathname === '/api/catalog') return reply({ items: pilotPlaces.slice(0, 3).map(publicPlace), dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return reply({ items: [], dataMode: 'unavailable', warnings: [] });
    if (url.pathname === '/api/assistant/status') return reply({ available: false, configured: false, reason: 'QA_OFFLINE' });
    if (url.pathname === '/api/memory') return reply({ available: true, enabled: false, profile: null, messages: [], visits: [], consents: {} });
    if (url.pathname === '/api/context') return reply({ context: request.postDataJSON() });
    if (url.pathname === '/api/chat') return reply({ reply: 'Синтетический ответ для проверки геометрии оболочки.', items: pilotPlaces.slice(0, 3).map(publicPlace), events: [], mode: 'deterministic', dataMode: 'synthetic_test' });
    return route.fulfill({ status: 503, json: { error: { code: 'QA_OFFLINE_UNHANDLED_API' } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--qettyq-safe-area-top', '59px');
    document.documentElement.style.setProperty('--qettyq-safe-area-bottom', '34px');
  });
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
}

test('feed and map scenes extend under the safe area, floating header remains transparent', async ({ page }) => {
  await fixture(page);
  const shell = page.locator('[data-screen]');
  await expect(shell).toHaveAttribute('data-screen', 'feed');
  const header = page.locator('header');
  await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(header).toHaveCSS('background-image', 'none');
  await expect(header).toHaveCSS('backdrop-filter', 'none');
  expect((await header.boundingBox())!.y).toBe(59);
  expect((await page.getByRole('main').boundingBox())!.y).toBe(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(shell).toHaveAttribute('data-screen', 'map');
  const viewport = page.locator('[class*="mapViewport"]').first();
  expect((await viewport.boundingBox())!.y).toBe(0);
  expect((await viewport.boundingBox())!.height).toBe(844);
  const input = page.getByRole('searchbox', { name: 'Поиск места на карте' });
  expect(await input.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('chat scrolls behind islands while its final content clears the measured composer', async ({ page }) => {
  await fixture(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Поиск', exact: true }).click();
  const shell = page.locator('[data-screen=chat]');
  await expect(shell).toBeVisible();
  const messages = page.getByRole('log', { name: 'Диалог с помощником' });
  const bounds = (await messages.boundingBox())!;
  expect(bounds.y).toBe(0);
  expect(bounds.height).toBe(844);
  await expect(page.getByRole('main')).toHaveCSS('margin-bottom', '0px');
  await expect(page.locator('header')).toHaveCSS('background-image', 'none');
  const gap = await messages.evaluate(element => {
    const root = element.closest('[data-screen]')!;
    return { padding: parseFloat(getComputedStyle(element).paddingBottom), measured: parseFloat((root as HTMLElement).style.getPropertyValue('--qettyq-chat-footer-height')) };
  });
  expect(gap.measured).toBeGreaterThan(100);
  expect(gap.padding).toBeGreaterThanOrEqual(gap.measured + 34);
  await page.screenshot({ path: 'output/playwright/safe-area-shell/chat-full-bleed.png' });
});

test('map keyboard CSS hides the navigation island without cropping the map', async ({ page }) => {
  await fixture(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  // CSS contract only: real keyboard detection is independently driven by visualViewport.
  await page.locator('[data-screen=map]').evaluate(element => element.setAttribute('data-map-keyboard-open', 'true'));
  await expect(page.getByRole('navigation')).toBeHidden();
  expect((await page.locator('[class*="mapViewport"]').first().boundingBox())!.y).toBe(0);
});

test('missing-photo cards keep readable facts and actions without a portrait-sized empty hero', async ({ page }) => {
  await fixture(page);
  const cards = page.locator('article[class*="feedCard"]');
  await expect(cards.first()).toBeVisible();
  // Verify the explicit CSS contract independently of provider metadata coverage.
  await cards.evaluateAll(elements => elements.forEach(element => element.setAttribute('data-photo-state', 'none')));
  const card = cards.first();
  await expect(card.locator('[class*="picture"]').first()).toHaveCSS('height', '80px');
  expect((await card.boundingBox())!.height).toBeLessThan(360);
  await expect(card.getByRole('button', { name: /Подробнее/ })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/safe-area-shell/compact-no-photo.png' });
});
