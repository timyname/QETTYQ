import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

// Deliberately extreme synthetic artwork, not real events or media provenance.
const fixture = (index: number) => ({
  id: `synthetic_test:media-${index}`, name: index === 1 ? `SYNTHETIC_${'ДлинноеНазвание'.repeat(12)}` : `SYNTHETIC TEST ${index}`,
  cityId: 'astana', category: 'театр', venueName: 'SYNTHETIC TEST', address: null,
  lat: null, lon: null, startsAt: '2030-10-24T18:00:00+05:00', endsAt: null,
  timeZone: 'Asia/Almaty', durationMinutes: null, contentLanguage: 'ru',
  priceFromKzt: null, price: { kind: 'unknown', minMinor: null, currency: null, basis: 'unknown' },
  status: 'scheduled', availability: 'unknown', image: null,
  media: index < 3 ? { kind: 'publisher_poster', src: `/api/media/events/${String(index).repeat(64)}` } : { kind: 'none' },
  bookingUrl: 'https://example.invalid/synthetic', contactUrl: 'https://example.invalid/synthetic',
  requiredCredit: { text: 'SYNTHETIC TEST source', url: 'https://example.invalid/synthetic' },
  fetchedAt: '2026-10-24T00:00:00Z', warnings: ['SYNTHETIC_TEST'],
});

for (const width of [360, 390, 430]) test(`synthetic mixed poster rail stays one viewport at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 932 });
  await installOfflineTestGuards(page);
  await page.route('**/api/events', route => route.fulfill({ json: { items: [0, 1, 2, 3].map(fixture), dataMode: 'snapshot', freshness: 'fresh', fetchedAt: null } }));
  await page.route('**/api/media/events/*', async route => {
    const index = Number(new URL(route.request().url()).pathname.split('/').pop()![0]);
    if (index === 2) return route.fulfill({ status: 404 });
    const [w, h] = index === 0 ? [4000, 100] : [100, 4000];
    await route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${index ? '#ab643f' : '#467d70'}"/></svg>` });
  });
  await openRussianApp(page);
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  const feed = page.getByRole('region', { name: 'Афиша Астаны' });
  const cards = feed.getByRole('article');
  await expect(cards).toHaveCount(4);
  const rail = cards.first().locator('..');
  const railWidth = (await rail.boundingBox())!.width;
  const frames = [];
  const heights = [];
  for (let index = 0; index < 4; index++) {
    await feed.getByRole('button', { name: `События: ${index + 1} из 4`, exact: true }).click();
    await expect.poll(async () => Math.abs((await cards.nth(index).boundingBox())!.x - (await rail.boundingBox())!.x)).toBeLessThan(1);
    const card = (await cards.nth(index).boundingBox())!;
    const frame = (await cards.nth(index).locator(':scope > div').first().boundingBox())!;
    expect(Math.abs(card.width - railWidth)).toBeLessThan(1);
    expect(Math.abs(frame.width / frame.height - 1.6)).toBeLessThan(.01);
    frames.push(frame.height);
    heights.push(card.height);
    await expect(cards.nth(index).getByRole('link', { name: /Афиша:/ })).toBeVisible();
    await expect(cards.nth(index).getByRole('button', { name: 'О событии', exact: true })).toBeVisible();
    if (index < 2) {
      const image = cards.nth(index).locator('img');
      await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(index === 0 ? 4000 : 100);
      await expect(image).toHaveCSS('object-fit', 'contain');
    } else {
      await expect(cards.nth(index).getByRole('img', { name: 'Афиша пока не добавлена', exact: true })).toBeVisible();
    }
    await feed.evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `output/playwright/afisha-media-sizing-${width}-${index}.png` });
  }
  expect(Math.max(...frames) - Math.min(...frames)).toBeLessThan(1);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
