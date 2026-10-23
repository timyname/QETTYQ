import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

test.beforeEach(async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.route('**/api/events', route => route.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
});

test('public tabs support browser Back/Forward and reload', async ({ page }) => {
  await openRussianApp(page);
  await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await expect(page).toHaveURL(/#\/feed$/);
  await page.getByRole('navigation').getByRole('button', { name: 'Поиск', exact: true }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await page.getByRole('navigation').getByRole('button', { name: 'Профиль', exact: true }).click();
  await expect(page).toHaveURL(/#\/profile$/);
  await page.goBack();
  await expect(page.getByLabel('Сообщение помощнику')).toBeVisible();
  await expect(page).toHaveURL(/#\/chat$/);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Твой QETTYQ', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Твой QETTYQ', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/profile$/);
});

test('public place ID restores after language gate and reload, without private URL data', async ({ page }) => {
  const result = await page.request.get('/api/catalog?cityId=astana');
  const { items } = await result.json();
  const known = items[0] as { id: string; name: string };
  const hash = `#/place/${encodeURIComponent(known.id)}`;
  await page.goto(`/${hash}`);
  await expect(page.getByRole('main', { name: 'Language selection' })).toBeVisible();
  await expect(page).toHaveURL(url => url.hash === hash);
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('heading', { name: known.name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(url => url.hash === hash && url.search === '');
  await page.reload();
  await expect(page.getByRole('heading', { name: known.name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(url => url.hash === hash && url.search === '');
});

test('malformed and unknown public links fall back honestly instead of empty detail', async ({ page }) => {
  await openRussianApp(page);
  for (const hash of ['#/place/unknown-public-id', '#/event/unknown-public-id', '#/map?lat=51.123456&budget=5000']) {
    await page.goto(`/${hash}`);
    await expect(page).toHaveURL(/#\/feed$/);
    await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
    await expect(page.getByText('Эта ссылка больше не доступна. Посмотри актуальные места и события в подборке.', { exact: true })).toBeVisible();
    expect(page.url()).not.toMatch(/lat|budget|unknown-public-id/);
  }
});

test('fresh onboarding still uses the original steps and public hashes only', async ({ page }) => {
  await openRussianApp(page);
  await expect(page).toHaveURL(/#\/welcome$/);
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await expect(page).toHaveURL(/#\/swipe$/);
  await page.getByRole('button', { name: 'Интересно', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await expect(page).toHaveURL(/#\/conditions$/);
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await expect(page).toHaveURL(/#\/feed$/);
  expect(page.url()).not.toMatch(/budget|minutes|culture|museum|51\./);
});

test('public event waits for the existing feed and survives reload', async ({ page }) => {
  // Synthetic browser fixture only; this does not assert real event availability.
  const event = {
    id: 'synthetic_test:public-link', name: 'SYNTHETIC TEST — public event link', cityId: 'astana',
    category: 'театр', venueName: 'SYNTHETIC TEST', address: null, lat: null, lon: null,
    startsAt: '2030-10-24T18:00:00+05:00', endsAt: null, timeZone: 'Asia/Almaty',
    durationMinutes: null, contentLanguage: 'ru', priceFromKzt: null,
    price: { kind: 'unknown', minMinor: null, currency: null, basis: 'unknown' },
    status: 'scheduled', availability: 'unknown', image: null,
    bookingUrl: 'https://example.invalid/synthetic', contactUrl: 'https://example.invalid/synthetic',
    requiredCredit: { text: 'SYNTHETIC TEST source', url: 'https://example.invalid/synthetic' },
    fetchedAt: '2026-10-24T00:00:00Z', warnings: ['SYNTHETIC_TEST'],
  };
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/events', async route => {
    await wait;
    await route.fulfill({ json: { items: [event], dataMode: 'snapshot', freshness: 'fresh', fetchedAt: null } });
  });
  const hash = `#/event/${encodeURIComponent(event.id)}`;
  await page.goto(`/${hash}`);
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('button', { name: 'QETTYQ — на главную', exact: true })).toBeEnabled();
  await expect(page).toHaveURL(url => url.hash === hash);
  await expect(page.getByText('Эта ссылка больше не доступна.', { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: event.name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(url => url.hash === hash && url.search === '');
  let releaseSecond!: () => void;
  const secondWait = new Promise<void>(resolve => { releaseSecond = resolve; });
  await page.route('**/api/events', async route => {
    await secondWait;
    await route.fulfill({ json: { items: [event], dataMode: 'snapshot', freshness: 'fresh', fetchedAt: null } });
  });
  await page.reload();
  const home = page.getByRole('button', { name: 'QETTYQ — на главную', exact: true });
  await expect(home).toBeEnabled();
  await home.click();
  await expect(page).toHaveURL(/#\/feed$/);
  releaseSecond();
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('heading', { level: 1, name: event.name, exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/feed$/);
});
