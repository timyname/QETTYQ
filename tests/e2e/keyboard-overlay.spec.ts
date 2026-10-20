import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true });

async function openChat(page: Page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const json = url.pathname === '/api/catalog' ? { items: [], dataMode: 'snapshot' }
      : url.pathname === '/api/events' ? { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null }
      : url.pathname === '/api/assistant/status' ? { available: false, reason: 'SYNTHETIC_QA' }
      : url.pathname.startsWith('/api/memory') ? { enabled: false, available: true, consents: {}, messages: [] }
      : { session: { id: 'synthetic-keyboard-only' } };
    return route.fulfill({ json });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await expect(page.locator('[data-screen]')).toHaveAttribute('data-screen', 'feed');
  await page.getByRole('navigation').getByRole('button', { name: 'Поиск', exact: true }).click();
  await expect(page.getByLabel('Сообщение помощнику', { exact: true })).toBeVisible();
}

for (const resizedInnerHeight of [false, true]) {
  test(`composer follows offset viewport and restores after keyboard (${resizedInnerHeight ? 'WKWebView resized layout' : 'Safari panned layout'})`, async ({ page }) => {
    await openChat(page);
    const input = page.getByLabel('Сообщение помощнику', { exact: true });
    await input.focus();
    // SYNTHETIC only: physical Safari/WKWebView must still be checked on device.
    await page.evaluate(resizeInner => {
      Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 510 });
      Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 64 });
      if (resizeInner) Object.defineProperty(window, 'innerHeight', { configurable: true, value: 510 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
      window.visualViewport!.dispatchEvent(new Event('scroll'));
    }, resizedInnerHeight);
    await expect(page.locator('[data-screen]')).toHaveAttribute('data-keyboard-open', 'true');
    await expect.poll(async () => (await input.boundingBox())!.y + (await input.boundingBox())!.height).toBeLessThanOrEqual(574);
    expect((await input.boundingBox())!.y).toBeGreaterThan(64);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await page.screenshot({ path: `output/playwright/keyboard-overlay/${resizedInnerHeight ? 'wkwebview' : 'safari'}-offset.png` });
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 932 });
      Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 0 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 932 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('[data-screen]')).toHaveAttribute('data-keyboard-open', 'false');
    await expect(page.getByRole('navigation')).toBeVisible();
    expect((await page.locator('[data-screen]').boundingBox())!.y).toBe(0);
  });
}

test('city toast overlays feed without moving content, dismisses and fades automatically', async ({ page }) => {
  await openChat(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Для тебя', exact: true }).click();
  const heading = page.getByRole('heading', { name: 'Места под твои условия', exact: true });
  const before = await heading.boundingBox();
  await page.getByRole('button', { name: 'Астана', exact: true }).click();
  const close = page.getByRole('button', { name: 'Закрыть уведомление', exact: true });
  await expect(close).toBeVisible();
  await expect(close.locator('..')).toHaveCSS('opacity', '1');
  expect((await heading.boundingBox())!.y).toBe(before!.y);
  const headerStyle = await page.locator('header').evaluate(element => ({ background: getComputedStyle(element).backgroundColor, blur: getComputedStyle(element).backdropFilter }));
  expect(headerStyle).toEqual({ background: 'rgba(0, 0, 0, 0)', blur: 'none' });
  await page.screenshot({ path: 'output/playwright/keyboard-overlay/city-toast.png' });
  await expect(close).toHaveCount(0, { timeout: 3500 });
  await page.getByRole('button', { name: 'Астана', exact: true }).click();
  await close.click();
  await expect(close).toHaveCount(0);
  expect((await heading.boundingBox())!.y).toBe(before!.y);
});
