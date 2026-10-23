import { createHash } from 'node:crypto';
import { expect, test, type Locator, type Page, type Response } from '@playwright/test';
import registry from '../../data/publisher-place-media.json';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';

/** Real reviewed, branch-matched restaurant JPEGs and real gated media handler.
 * Catalogue/chat delivery is mocked snapshot data, never live recommendation. */
const ids = ['osm:node:12041597269', 'osm:node:4953253121'] as const;
const now = '2026-10-24T07:00:00.000Z';

async function fixture(page: Page, id: string) {
  const original = pilotPlaces.find(place => place.id === id);
  const record = registry.records.find(photo => photo.placeId === id);
  if (!original || !record) throw new Error('Exact reviewed restaurant/photo binding missing');
  const place = publicPlace(original);
  if (place.media.kind !== 'publisher_place_photo') throw new Error('Restaurant publisher media must resolve through the real catalogue resolver');
  const validPhoto = place.media;
  const control = { brokenAsset: false };
  const mediaResponses: Response[] = [];
  const requested: URL[] = [];
  page.on('request', request => requested.push(new URL(request.url())));
  page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api/media/places/')) mediaResponses.push(response); });
  await page.clock.setFixedTime(new Date(now));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    // Never fulfill media with fake bytes. Both approved SHA and unknown-SHA
    // error injection exercise the actual server's rights/hash gate.
    if (url.pathname.startsWith('/api/media/places/')) return route.continue();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const reply = (json: unknown) => route.fulfill({ json });
    const current = control.brokenAsset ? { ...place, media: { ...validPhoto, src: `/api/media/places/${'0'.repeat(64)}` } } : place;
    if (url.pathname === '/api/session') return reply({ session: { id: 'synthetic-real-place-photo-ui' } });
    if (url.pathname === '/api/catalog') return reply({ items: [current], dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return reply({ items: [], dataMode: 'unavailable', warnings: ['QA_OFFLINE'] });
    if (url.pathname === '/api/assistant/status') return reply({ available: false, configured: false, reason: 'QA_OFFLINE' });
    if (url.pathname === '/api/memory') return reply({ available: true, enabled: false, profile: null, messages: [], visits: [], consents: {} });
    if (url.pathname === '/api/context') return reply({ accepted: true });
    if (url.pathname === '/api/chat') return reply({ reply: 'QA snapshot catalogue fixture, not a live AI recommendation.', items: [current], events: [], mode: 'deterministic', dataMode: 'snapshot' });
    if (url.pathname === '/api/maps/config') return reply({ enabled: false, provider: 'openstreetmap' });
    if (url.pathname === '/api/routing') return reply({ available: false, provider: 'fossgis_foot', label: 'QA_OFFLINE', reason: 'QA_OFFLINE', localDemo: false });
    return route.fulfill({ status: 503, json: { error: { code: 'QA_OFFLINE_UNHANDLED_API' } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  return { place, record, photo: validPhoto, mediaResponses, requested, control };
}

async function decoded(image: Locator, photo: { src: string; width: number; height: number }) {
  await expect(image).toBeVisible();
  const base = image.page().url();
  const actual = new URL((await image.getAttribute('src'))!, base);
  expect(actual.href).toBe(new URL(photo.src, base).href);
  expect(actual.origin).toBe(new URL(base).origin);
  await expect.poll(() => image.evaluate(element => ({ complete: (element as HTMLImageElement).complete, width: (element as HTMLImageElement).naturalWidth, height: (element as HTMLImageElement).naturalHeight }))).toEqual({ complete: true, width: photo.width, height: photo.height });
}

for (const id of ids) for (const width of [390, 430]) {
  test.describe(`actual restaurant ${id} ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 932 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    test('feed and detail decode the branch-matched JPEG with honest publisher attribution', async ({ page }) => {
      const { place, photo, record, mediaResponses, requested, control } = await fixture(page, id);
      const feed = page.getByRole('main', { name: 'Персональная лента', exact: true });
      const card = feed.getByRole('article').filter({ has: page.getByRole('heading', { name: place.name, exact: true }) });
      await expect(card).toHaveAttribute('data-photo-state', 'real');
      await decoded(card.getByRole('img', { name: photo.alt, exact: true }), photo);
      await expect(card.getByRole('heading', { name: place.name, exact: true })).toBeVisible();
      const feedCredit = card.getByTestId('catalog-photo-credit');
      await expect(feedCredit).toContainText('Источник фото');
      await expect(feedCredit).not.toContainText('Автор фото');
      await expect(feedCredit.getByRole('link', { name: 'Источник фото', exact: true })).toHaveAttribute('href', record.sourcePageUrl);
      await expect(feedCredit.getByRole('link', { name: 'Условия использования', exact: true })).toHaveAttribute('href', registry.termsUrl);
      const response = mediaResponses.find(item => new URL(item.url()).pathname === photo.src)!;
      expect(response).toBeDefined();
      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toContain('no-store');
      expect(response.headers()['content-type']).toBe('image/jpeg');
      expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(record.sha256);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/playwright/real-place-photos/feed-${record.catalogName}-${width}.png` });
      await card.getByRole('button', { name: 'Подробнее', exact: true }).click();
      const detail = page.locator('[data-screen="detail"]');
      await decoded(detail.getByRole('img', { name: photo.alt, exact: true }), photo);
      await expect(detail.getByRole('heading', { name: place.name, exact: true })).toBeVisible();
      const credit = detail.getByTestId('catalog-photo-credit');
      await expect(credit).toContainText('Источник фото');
      await expect(credit).toContainText('Давай Сходим');
      await expect(credit).not.toContainText('Автор фото');
      await expect(credit.getByRole('link', { name: 'Источник фото', exact: true })).toHaveAttribute('href', record.sourcePageUrl);
      await expect(credit.getByRole('link', { name: photo.license, exact: true })).toHaveAttribute('href', registry.termsUrl);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({ path: `output/playwright/real-place-photos/detail-${record.catalogName}-${width}.png` });
      if (id === ids[1] && width === 430) {
        control.brokenAsset = true;
        await page.reload();
        // Detail is deliberately not restorable; reload returns to the feed with
        // the same real venue facts and an unknown asset SHA for fault injection.
        const failedCard = page.getByRole('main', { name: 'Персональная лента', exact: true }).getByRole('article');
        await expect(failedCard.getByRole('img', { name: /^Фото пока нет:/ })).toBeVisible();
        await expect(failedCard.getByRole('heading', { name: place.name, exact: true })).toBeVisible();
        expect(mediaResponses.some(item => item.status() === 404)).toBe(true);
        await failedCard.getByRole('button', { name: 'Подробнее', exact: true }).click();
        const failedDetail = page.locator('[data-screen="detail"]');
        await expect(failedDetail.getByRole('img', { name: /^Фото пока нет:/ })).toBeVisible();
        await expect(failedDetail.getByRole('heading', { name: place.name, exact: true })).toBeVisible();
        await expect(failedDetail.getByTestId('catalog-photo-credit').getByRole('link', { name: 'Источник фото', exact: true })).toHaveAttribute('href', record.sourcePageUrl);
        await page.screenshot({ path: 'output/playwright/real-place-photos/real-handler-404.png' });
      }
      expect(requested.filter(url => url.pathname === '/_next/image' && /sxodim|%2Fapi%2Fmedia%2Fplaces|\/api\/media\/places/i.test(url.search))).toEqual([]);
      expect(requested.filter(url => !['127.0.0.1', 'localhost'].includes(url.hostname))).toEqual([]);
    });
  });
}
