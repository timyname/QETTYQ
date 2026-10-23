import { createHash } from 'node:crypto';
import { expect, test, type Locator, type Page, type Response } from '@playwright/test';
import registry from '../../data/publisher-event-media.json';
import snapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';
import { resolvePublisherEventMedia } from '../../src/server/media/publisher-event-media';

/** Real reviewed JPEG and real local image handler; event/API delivery is an
 * explicit snapshot fixture, not a claim of a live listing or paid integration. */
const now = '2026-10-24T07:00:00.000Z';
const sourceUrl = 'https://sxodim.com/astana/event/mama-spektakli';
const record = registry.records.find(item => item.eventSourceUrl === sourceUrl)!;
const original = snapshot.items.find(item => item.provenance.sourceUrl === sourceUrl)!;
const poster = resolvePublisherEventMedia(sourceUrl, registry, Date.parse(now));
if (!record || !original || !poster) throw new Error('Reviewed exact-event publisher photo fixture is unavailable');

async function fixture(page: Page, brokenAsset = false) {
  const event = { ...original, media: brokenAsset ? { ...poster, src: `/api/media/events/${'0'.repeat(64)}` } : poster };
  const requests: URL[] = [];
  const mediaResponses: Response[] = [];
  page.on('request', request => requests.push(new URL(request.url())));
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api/media/events/')) mediaResponses.push(response); });
  await page.clock.setFixedTime(new Date(now));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    // This is deliberately NOT fulfilled with a test image or optimized copy.
    // The real handler verifies rights expiry, byte size and SHA before serving.
    if (url.pathname.startsWith('/api/media/events/')) return route.continue();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const respond = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/session') return respond({ session: { id: 'synthetic-publisher-photo-browser' } });
    if (url.pathname === '/api/catalog') return respond({ items: [], dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return respond({ items: [event], dataMode: 'snapshot', freshness: 'stale', fetchedAt: snapshot.fetchedAt, warnings: ['QA_SNAPSHOT_DELIVERY_NOT_LIVE'] });
    if (url.pathname === '/api/maps/config') return respond({ enabled: false, provider: 'openstreetmap' });
    if (url.pathname === '/api/routing') return respond({ available: false, provider: 'fossgis_foot', label: 'QA_OFFLINE', reason: 'QA_OFFLINE', localDemo: false });
    if (url.pathname === '/api/assistant/status') return respond({ available: false, configured: false, reason: 'QA_OFFLINE' });
    if (url.pathname === '/api/memory') return respond({ available: true, enabled: false, profile: null, messages: [], visits: [], consents: {} });
    if (url.pathname === '/api/context') return respond({ accepted: true });
    if (url.pathname === '/api/chat') return respond({ reply: 'QA snapshot-only fixture; AI and external search are disabled.', items: [], events: [event], mode: 'deterministic', dataMode: 'snapshot' });
    return route.fulfill({ status: 503, json: { error: { code: 'QA_OFFLINE_UNHANDLED_API' } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  return { event, requests, mediaResponses };
}

async function readableText(locator: Locator, fullText: string) {
  await expect(locator).toHaveText(fullText);
  const clipped = await locator.evaluate(element => ({ horizontal: element.scrollWidth > element.clientWidth + 1, vertical: element.scrollHeight > element.clientHeight + 1 }));
  expect(clipped).toEqual({ horizontal: false, vertical: false });
}

async function decodedPhoto(image: Locator) {
  await expect(image).toBeVisible();
  const expected = new URL(record.localAssetPath, image.page().url());
  const actual = new URL((await image.getAttribute('src'))!, image.page().url());
  expect(actual.href).toBe(expected.href);
  expect(actual.origin).toBe(new URL(image.page().url()).origin);
  await expect(image).toHaveCSS('object-fit', 'contain');
  await expect.poll(() => image.evaluate(element => ({ complete: (element as HTMLImageElement).complete, width: (element as HTMLImageElement).naturalWidth, height: (element as HTMLImageElement).naturalHeight }))).toEqual({ complete: true, width: record.width, height: record.height });
}

function noPublisherOptimizerOrProviderTraffic(requests: URL[]) {
  expect(requests.filter(url => url.pathname === '/_next/image' && /sxodim|%2Fapi%2Fmedia%2Fevents|\/api\/media\/events/i.test(url.search))).toEqual([]);
  expect(requests.filter(url => /(^|\.)(sxodim\.com|openai\.com|googleapis\.com)$/i.test(url.hostname))).toEqual([]);
}

for (const [width, height] of [[360, 800], [390, 844], [430, 932], [1440, 900]] as const) {
  test.describe(`reviewed publisher photo ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, isMobile: width < 800, hasTouch: width < 800, reducedMotion: 'reduce' });
    test('real JPEG decodes in feed and detail; exact source credit and uncropped image/text remain', async ({ page }) => {
      const { event, requests, mediaResponses } = await fixture(page);
      expect(event.startsAt).toBe('2026-10-29T13:00:00.000Z');
      const feed = page.getByRole('region', { name: 'Афиша Астаны', exact: true });
      const card = feed.getByRole('article');
      const label = 'Изображение из афиши · Давай Сходим';
      await decodedPhoto(card.getByRole('img', { name: label, exact: true }));
      await readableText(card.getByRole('heading', { name: event.name, exact: true }), event.name);
      await expect(card.getByRole('link', { name: 'Афиша: Давай Сходим ↗', exact: true })).toHaveAttribute('href', sourceUrl);
      await expect(card.getByRole('button', { name: 'О событии', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const served = mediaResponses.find(response => new URL(response.url()).pathname === record.localAssetPath)!;
      expect(served).toBeDefined();
      expect(served.status()).toBe(200);
      expect(served.headers()['content-type']).toBe('image/jpeg');
      expect(served.headers()['cache-control']).toContain('no-store');
      expect(createHash('sha256').update(await served.body()).digest('hex')).toBe(record.sha256);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/playwright/real-publisher-photos/feed-${width}.png` });
      await card.getByRole('button', { name: 'О событии', exact: true }).click();
      const detail = page.locator('[data-screen="event"]');
      await decodedPhoto(detail.getByRole('img', { name: label, exact: true }));
      await readableText(detail.getByRole('heading', { name: event.name, exact: true }), event.name);
      await expect(detail.getByRole('link', { name: 'Афиша: Давай Сходим ↗', exact: true })).toHaveAttribute('href', sourceUrl);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      noPublisherOptimizerOrProviderTraffic(requests);
      await page.screenshot({ path: `output/playwright/real-publisher-photos/detail-${width}.png` });
    });
  });
}

test('real handler 404 falls back to an honest placeholder without hiding event facts or source', async ({ page }) => {
  // Fault injection changes only this fixture's image identifier; no invented
  // photo is served and the unknown SHA goes through the real handler's 404.
  const { event, requests, mediaResponses } = await fixture(page, true);
  const card = page.getByRole('region', { name: 'Афиша Астаны', exact: true }).getByRole('article');
  await expect(card.getByRole('img', { name: 'Афиша пока не добавлена', exact: true })).toBeVisible();
  await readableText(card.getByRole('heading', { name: event.name, exact: true }), event.name);
  await expect(card.getByRole('link', { name: 'Афиша: Давай Сходим ↗', exact: true })).toHaveAttribute('href', sourceUrl);
  expect(mediaResponses.some(response => response.status() === 404)).toBe(true);
  await card.getByRole('button', { name: 'О событии', exact: true }).click();
  const detail = page.locator('[data-screen="event"]');
  await expect(detail.getByRole('img', { name: 'Афиша пока не добавлена', exact: true })).toBeVisible();
  await expect(detail.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  await expect(detail.getByRole('link', { name: 'Афиша: Давай Сходим ↗', exact: true })).toHaveAttribute('href', sourceUrl);
  noPublisherOptimizerOrProviderTraffic(requests);
  await page.screenshot({ path: 'output/playwright/real-publisher-photos/real-handler-404.png' });
});
