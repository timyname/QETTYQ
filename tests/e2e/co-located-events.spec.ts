import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

const NOW = '2026-10-24T10:00:00+05:00';
// Synthetic occurrence fixtures at the same coordinate. No real schedule,
// admission, source permission or road routing is asserted by this UI test.
const first = {
  id: 'synthetic-colocated-kinusaiga', name: 'SYNTHETIC TEST · Kinusaiga', cityId: 'astana', category: 'Мастер-класс',
  venueName: 'SYNTHETIC shared venue', address: 'SYNTHETIC same address', lat: 51.1558078, lon: 71.4281891,
  startsAt: '2026-10-25T14:00:00+05:00', endsAt: null, timeZone: 'Asia/Almaty', durationMinutes: null,
  contentLanguage: 'und', freshness: 'fresh', priceFromKzt: null, price: { kind: 'unknown', minMinor: null, currency: null, basis: 'unknown' },
  status: 'scheduled', availability: 'unknown', image: null, bookingUrl: null, contactUrl: 'https://example.invalid/synthetic-first',
  requiredCredit: { text: 'Давай Сходим', url: 'https://example.invalid/synthetic-first' }, fetchedAt: NOW, warnings: ['SYNTHETIC_TEST'],
  provenance: { sourceId: 'synthetic_test', sourceUrl: 'https://example.invalid/synthetic-first', parserVersion: 'synthetic_test', scheduleQuality: 'observed', priceQuality: 'unknown' },
};
const second = { ...first, id: 'synthetic-colocated-healing', name: 'SYNTHETIC TEST · Healing', startsAt: '2026-10-25T18:00:00+05:00' };

test('same-coordinate event picker preserves the selected occurrence and ordered plan IDs without moving coordinates', async ({ page }) => {
  await installOfflineTestGuards(page); await page.clock.setFixedTime(new Date(NOW));
  // Keep the real map engine/projection, but avoid public tile-network timing in
  // this offline occurrence-selection and popup-layout regression.
  await page.route('https://tiles.openfreemap.org/styles/liberty', route => route.fulfill({ json: {
    version: 8, sources: {}, layers: [{ id: 'synthetic-background', type: 'background', paint: { 'background-color': '#f4f6f2' } }],
  } }));
  await page.route('**/api/catalog?**', route => route.fulfill({ json: { items: [], dataMode: 'synthetic_test' } }));
  await page.route('**/api/events', route => route.fulfill({ json: { items: [first, second], freshness: 'fresh', dataMode: 'snapshot', fetchedAt: NOW } }));
  await page.route('**/api/maps/config', route => route.fulfill({ json: { provider: 'osm', browserKey: null } }));
  await page.route('**/api/routing', route => route.fulfill({ json: { available: false, reason: 'SYNTHETIC_TEST_NO_PROVIDER' } }));
  const requests: string[][] = [];
  await page.route('**/api/plans', route => {
    const ids = route.request().postDataJSON().placeIds as string[]; requests.push(ids);
    const stops = ids.map(id => {
      const event = [first, second].find(event => event.id === id)!;
      return { ...event, durationState: 'unknown', eventStartsAt: event.startsAt, price: null };
    });
    return route.fulfill({ json: { plan: { id: 'synthetic-colocated-plan', stops, totalMinutes: null, visitMinutes: null,
      travelMinutes: null, remainingMinutes: null, distanceKm: null, budget: { min: null, max: null }, feasibility: 'uncertain', warnings: [], legs: [] } } });
  });
  await openRussianApp(page); await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await page.getByRole('region', { name: 'Афиша Астаны' }).getByRole('article').first().getByRole('button', { name: 'О событии', exact: true }).click();
  await expect(page.getByRole('heading', { name: first.name, exact: true })).toBeVisible();
  for (const [event, time] of [[first, '14:00'], [second, '18:00']] as const) {
    await page.getByRole('button', { name: 'Показать на карте', exact: true }).click();
    await expect(page.locator('[data-screen="map"]').getByRole('button', { name: 'События', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const cluster = page.getByRole('button', { name: 'Мест: 2. Выбрать', exact: true });
    await expect(cluster).toHaveCount(1); await cluster.click();
    for (const occurrence of [first, second]) await expect(page.getByRole('button', { name: new RegExp(occurrence.name) })).toBeVisible();
    // MapLibre applies the popup's projected transform on a render frame. Mere
    // visibility before that frame can capture an unpositioned top-left popup.
    await expect.poll(async () => {
      const popup = await page.locator('.maplibregl-popup').boundingBox();
      const marker = await cluster.boundingBox();
      const header = await page.getByRole('banner').boundingBox();
      const navigation = await page.getByRole('navigation', { name: 'Основная навигация' }).boundingBox();
      if (!popup || !marker || !header || !navigation) return false;
      return popup.y > header.y + header.height && popup.y + popup.height < navigation.y
        && Math.abs(popup.x + popup.width / 2 - (marker.x + marker.width / 2)) < 2
        && Math.abs(popup.y + popup.height - (marker.y + marker.height / 2)) < 2;
    }).toBe(true);
    if (event.id === first.id) await page.screenshot({ path: 'output/playwright/co-located-events/occurrence-picker.png' });
    const choice = page.getByRole('button', { name: new RegExp(event.name) });
    await expect(choice).toHaveCount(1); await expect(choice).toContainText(time); await choice.click();
    await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'В мой план', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1); expect(requests[0]).toEqual([first.id, second.id]);
  expect(first.lat).toBe(second.lat); expect(first.lon).toBe(second.lon);
});
