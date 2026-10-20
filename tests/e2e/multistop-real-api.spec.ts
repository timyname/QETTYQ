import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';
import { showRouteOptions } from './route-ui-helpers';

test('three real catalog stops reorder through real local plan API, not an optimistic-only UI', async ({ page, context }) => {
  await installOfflineTestGuards(page);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
  await page.route('**/api/events', route => route.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
  await page.route('**/api/routing', route => route.fulfill({ json: { available: false, provider: 'fossgis_foot', label: 'SYNTHETIC QA disabled', reason: 'QA_DISABLED', localDemo: false } }));
  // /api/plans, /api/catalog, /api/context and /api/session stay real local HTTP.
  // Chat, live ingestion, LLM, Google and street-routing providers are mocked off.
  const requests: string[][] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/plans' && request.method() === 'POST') requests.push(request.postDataJSON().placeIds); });
  await openRussianApp(page);
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByLabel('Свободное время', { exact: true }).fill('720');
  await page.getByRole('button', { name: 'Поделиться геопозицией', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  const names: string[] = [];
  for (let index = 0; index < 3; index++) {
    const card = page.getByRole('main', { name: 'Персональная лента' }).getByRole('article').nth(index);
    names.push(await card.getByRole('heading').innerText());
    await card.getByRole('button', { name: 'Подробнее', exact: true }).click();
    await page.getByRole('button', { name: 'В мой план', exact: true }).click();
    if (index < 2) await page.getByRole('button', { name: 'Назад', exact: true }).click();
  }
  await page.getByRole('button', { name: /Открыть план · 3 мест/ }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click();
  const sheet = page.getByRole('region', { name: 'План маршрута', exact: true });
  await expect(sheet.locator('[data-stop-index]')).toHaveCount(3);
  const original = requests.at(-1)!;
  expect(new Set(original).size).toBe(3);
  await showRouteOptions(page);
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/plans' && response.request().method() === 'POST');
  await sheet.getByRole('button', { name: `Опустить ${names[0]} ниже`, exact: true }).click();
  const result = await (await response).json();
  expect(requests.at(-1)).toEqual([original[1], original[0], original[2]]);
  expect(result.plan.stops.map((stop: { id: string }) => stop.id)).toEqual(requests.at(-1));
  expect(result.plan.visitMinutes).toBe(result.plan.stops.reduce((sum: number, stop: { durationMinutes: number }) => sum + stop.durationMinutes, 0));
  expect(result.plan.totalMinutes).toBeGreaterThanOrEqual(result.plan.visitMinutes + result.plan.travelMinutes);
  const expand = page.getByRole('button', { name: 'Развернуть план маршрута', exact: true });
  if (await expand.count()) await expand.click();
  await expect(sheet.locator('[data-stop-index]').first()).toContainText(names[1]);
  await page.screenshot({ path: 'output/playwright/qa-route-refresh/real-api-three-stops-reordered.png' });
  const removeResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/plans' && response.request().method() === 'POST');
  await sheet.getByRole('button', { name: `Убрать ${names[2]} из плана`, exact: true }).click();
  const twoStops = await (await removeResponse).json();
  expect(twoStops.plan.stops.map((stop: { id: string }) => stop.id)).toEqual([original[1], original[0]]);
  expect(twoStops.plan.visitMinutes).toBe(twoStops.plan.stops.reduce((sum: number, stop: { durationMinutes: number }) => sum + stop.durationMinutes, 0));
  if (await expand.count()) await expand.click();
  await expect(sheet.locator('[data-stop-index]')).toHaveCount(2);
  const handle = sheet.getByRole('button', { name: `Удерживай и перемещай ${names[1]}`, exact: true });
  await handle.scrollIntoViewIfNeeded();
  const from = (await handle.boundingBox())!, target = (await sheet.locator('[data-stop-index="1"]').boundingBox())!;
  const dragResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/plans' && response.request().method() === 'POST');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  // Deliberate hold gesture: production requires 320 ms before drag activation.
  await page.waitForTimeout(360);
  await expect(sheet.locator('[data-stop-index="0"]')).toHaveAttribute('data-dragged', 'true');
  await page.mouse.move(target.x + 60, target.y + 10, { steps: 8 }); await page.mouse.up();
  const dragged = await (await dragResponse).json();
  expect(dragged.plan.stops.map((stop: { id: string }) => stop.id)).toEqual([original[0], original[1]]);
});
