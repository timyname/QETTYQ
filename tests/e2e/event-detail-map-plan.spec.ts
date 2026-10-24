import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

const NOW = '2026-10-24T10:00:00+05:00';
// Explicitly synthetic browser fixtures; this tests wiring, not live availability,
// address proof, street-route geometry, provider integration or a real entrance.
const event = {
  id: 'synthetic-event-map-route', name: 'SYNTHETIC TEST · address-linked event', cityId: 'astana',
  category: 'Театр', venueName: 'SYNTHETIC TEST venue', address: 'SYNTHETIC TEST address',
  lat: 51.1905938, lon: 71.4057965, startsAt: '2026-10-25T18:00:00+05:00', endsAt: null,
  timeZone: 'Asia/Almaty', durationMinutes: null, contentLanguage: 'und', freshness: 'fresh',
  priceFromKzt: null, price: { kind: 'unknown', minMinor: null, currency: null, basis: 'unknown' },
  status: 'scheduled', availability: 'unknown', image: null, bookingUrl: null,
  contactUrl: 'https://example.invalid/synthetic-event', requiredCredit: { text: 'Давай Сходим', url: 'https://example.invalid/synthetic-event' },
  fetchedAt: NOW, warnings: ['SYNTHETIC_TEST'], provenance: { sourceId: 'synthetic_test', sourceUrl: 'https://example.invalid/synthetic-event',
    parserVersion: 'synthetic_test', scheduleQuality: 'observed', priceQuality: 'unknown' },
};
const places = [1, 2].map(index => ({ id: `synthetic-venue-${index}`, name: `SYNTHETIC TEST venue ${index}`, category: 'museum',
  lat: 51.12 + index * 0.01, lon: 71.44, address: null, tags: ['culture'], price: null, durationMinutes: 30,
  sourceUrl: 'https://example.invalid/synthetic-venue', retrievedAt: NOW, media: { kind: 'none', src: null } }));

test('synthetic detail → event-filtered map → marker → detail retains two ordered venues when adding/evaluating the event', async ({ page }) => {
  await installOfflineTestGuards(page); await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/catalog?**', route => route.fulfill({ json: { items: places, dataMode: 'synthetic_test' } }));
  await page.route('**/api/chat', route => route.fulfill({ json: { items: places, events: [], mode: 'deterministic', reply: 'SYNTHETIC TEST' } }));
  await page.route('**/api/events', route => route.fulfill({ json: { items: [event], freshness: 'fresh', dataMode: 'snapshot', fetchedAt: NOW } }));
  await page.route('**/api/maps/config', route => route.fulfill({ json: { provider: 'osm', browserKey: null } }));
  await page.route('**/api/routing', route => route.fulfill({ json: { available: false, reason: 'SYNTHETIC_TEST_NO_PROVIDER' } }));
  const requests: string[][] = [];
  await page.route('**/api/plans', route => {
    const ids = route.request().postDataJSON().placeIds as string[]; requests.push(ids);
    const stops = ids.map(id => id === event.id ? { ...event, durationState: 'unknown', price: null, eventStartsAt: event.startsAt }
      : places.find(place => place.id === id));
    return route.fulfill({ json: { plan: { id: 'synthetic-event-multistop', stops, totalMinutes: null, visitMinutes: null,
      travelMinutes: null, remainingMinutes: null, distanceKm: null, budget: { min: null, max: null }, feasibility: 'uncertain', warnings: [], legs: [] } } });
  });
  await openRussianApp(page);
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  for (let index = 0; index < 2; index++) {
    const card = page.getByRole('main', { name: 'Персональная лента' }).getByRole('article').nth(index);
    await card.getByRole('button', { name: 'Подробнее', exact: true }).click();
    await page.getByRole('button', { name: 'В мой план', exact: true }).click();
    await page.getByRole('button', { name: 'Назад', exact: true }).click();
  }
  await page.getByRole('region', { name: 'Афиша Астаны' }).getByRole('button', { name: 'О событии', exact: true }).click();
  await page.getByRole('button', { name: 'Показать на карте', exact: true }).click();
  await expect(page.locator('[data-screen="map"]')).toBeVisible();
  await expect(page.locator('[data-screen="map"]').getByRole('button', { name: 'События', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const marker = page.getByRole('button', { name: new RegExp(event.name) });
  await expect(marker).toHaveCount(1);
  await expect(marker).toBeVisible({ timeout: 20000 }); await marker.click();
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'В мой план', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual([places[0].id, places[1].id, event.id]);
  await page.screenshot({ path: 'output/playwright/event-map-plan/ordered-event-plan.png' });
});

test('stale geocoded event keeps source links but disables map/plan actions with an honest reason', async ({ page }) => {
  await installOfflineTestGuards(page); await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/events', route => route.fulfill({ json: { items: [{ ...event, freshness: 'stale' }], freshness: 'stale', dataMode: 'snapshot', fetchedAt: NOW } }));
  let plans = 0; await page.route('**/api/plans', route => { plans++; return route.abort(); });
  await openRussianApp(page); await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await page.getByRole('region', { name: 'Афиша Астаны' }).getByRole('button', { name: 'О событии', exact: true }).click();
  for (const label of ['Показать на карте', 'В мой план', 'Оценить путь']) await expect(page.getByRole('button', { name: label, exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Данные события устарели');
  await expect(page.getByRole('link', { name: 'Подробности и запись', exact: true })).toHaveAttribute('href', event.contactUrl);
  expect(plans).toBe(0);
});
