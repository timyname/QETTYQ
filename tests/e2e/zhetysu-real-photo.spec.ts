import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import registry from '../../data/place-media.json';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';
const record = registry.records.find(row => row.placeId === 'osm:way:69232075')!;
for (const width of [390, 430]) test.describe(`reviewed Zhetysu Commons photo ${width}`, () => {
  test.use({ viewport: { width, height: 932 } });
  test('real local JPEG decodes with photographer, source and license; no image substitution', async ({ page }) => {
    await installOfflineTestGuards(page);
    await page.route('**/api/events', route => route.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable' } }));
    // /api/catalog and local asset stay real HTTP. External event/AI/Google
    // providers are disabled, not represented as a successful live integration.
    await openRussianApp(page);
    await page.goto(`/#/place/${encodeURIComponent(record.placeId)}`);
    const image = page.getByRole('img', { name: record.alt, exact: true });
    await expect(image).toBeVisible();
    const src = new URL((await image.getAttribute('src'))!, page.url());
    // Licensed Commons images may use the existing local Next image optimizer.
    expect(src.pathname === record.src || src.pathname === '/_next/image' && src.searchParams.get('url') === record.src).toBe(true);
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const size = await image.evaluate(node => ({ width: (node as HTMLImageElement).naturalWidth, height: (node as HTMLImageElement).naturalHeight }));
    // Responsive srcset density can floor the browser's logical intrinsic
    // height by one pixel. Verify that bound, not a scale-dependent ratio epsilon.
    expect(Math.abs(size.height - size.width * record.height / record.width)).toBeLessThanOrEqual(1);
    const photo = await page.request.get(record.src);
    expect(createHash('sha256').update(await photo.body()).digest('hex')).toBe(record.sha256);
    const credit = page.getByTestId('catalog-photo-credit');
    await expect(credit).toContainText(record.author); await expect(credit).toContainText(record.license);
    await expect(credit.getByRole('link', { name: 'Источник фото', exact: true })).toHaveAttribute('href', record.sourceUrl);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: `output/playwright/zhetysu-photo-${width}.png` });
  });
});
