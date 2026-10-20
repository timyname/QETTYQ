import { expect, test } from '@playwright/test';

// Synthetic browser fixture only. No real event, availability, price or provider
// integration is asserted by this test. Real-source smoke is a separate check.
const NOW = '2026-10-20T10:00:00+05:00';
const today = {
  id: 'synthetic_test:today', name: 'SYNTHETIC TEST — событие сегодня', cityId: 'astana',
  category: 'театр', venueName: 'SYNTHETIC TEST — площадка', address: 'Тестовый адрес, не для посещения',
  lat: null, lon: null, startsAt: '2026-10-20T18:00:00+05:00', endsAt: null,
  timeZone: 'Asia/Almaty', durationMinutes: null, contentLanguage: 'kk',
  priceFromKzt: null, price: { kind: 'unknown', minMinor: null, currency: null, basis: 'unknown' },
  status: 'scheduled', availability: 'unknown', image: null,
  bookingUrl: 'https://example.invalid/synthetic-test/registration',
  contactUrl: 'https://example.invalid/synthetic-test/today',
  requiredCredit: { text: 'Давай Сходим', url: 'https://example.invalid/synthetic-test/today' },
  fetchedAt: NOW, warnings: ['COORDINATES_UNKNOWN', 'DURATION_UNKNOWN', 'PRICE_UNKNOWN'],
  provenance: { sourceId: 'synthetic_test', sourceUrl: 'https://example.invalid/synthetic-test/today', parserVersion: 'e2e-fixture-v1', scheduleQuality: 'synthetic_test', priceQuality: 'unknown' },
};
const tomorrow = {
  ...today, id: 'synthetic_test:tomorrow', name: 'SYNTHETIC TEST — событие завтра',
  startsAt: '2026-10-21T18:00:00+05:00',
};

test('synthetic_test: афиша фильтрует сегодня, сохраняет событие и показывает честные детали с обязательным credit', async ({ page }) => {
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/events', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      items: [today, tomorrow], dataMode: 'snapshot', freshness: 'fresh',
      fetchedAt: NOW, expiresAt: '2026-10-20T11:00:00+05:00', isSyntheticTest: true,
    }),
  }));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб' })).toBeEnabled();
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  const feed = page.getByRole('region', { name: 'Афиша Астаны' });
  await expect(feed).toBeVisible();
  await expect(feed.getByRole('article')).toHaveCount(2);
  await feed.getByRole('button', { name: 'Сегодня', exact: true }).click();
  await expect(feed.getByRole('button', { name: 'Сегодня', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(feed.getByRole('article')).toHaveCount(1);
  await expect(feed.getByRole('heading', { name: today.name, exact: true })).toBeVisible();
  await expect(feed.getByRole('heading', { name: tomorrow.name, exact: true })).toHaveCount(0);
  await expect(feed.getByText('Стоимость уточняйте', { exact: true })).toBeVisible();
  await expect(feed.getByText('Иллюстрация категории, не фото события', { exact: true })).toBeVisible();
  await expect(feed.getByRole('link', { name: 'Афиша: Давай Сходим ↗' })).toHaveAttribute('href', today.requiredCredit.url);

  await feed.getByRole('button', { name: 'Сохранить событие', exact: true }).click();
  await expect(feed.getByRole('button', { name: 'Убрать событие из сохранённых', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('qettyq.saved.v2') ?? '[]'))).toContain(today.id);
  await feed.getByRole('button', { name: 'О событии', exact: true }).click();
  await expect(page.getByRole('heading', { name: today.name, exact: true })).toBeVisible();
  await expect(page.getByText('Қазақша', { exact: true })).toBeVisible();
  await expect(page.getByText('Продолжительность и время окончания не указаны.', { exact: true })).toBeVisible();
  await expect(page.getByText('Координаты не предоставлены источником. Точку на карте и время пути не подставляем наугад.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Построить внешний маршрут', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Подробности и запись', exact: true })).toHaveAttribute('href', today.bookingUrl);
  await expect(page.getByRole('link', { name: 'Афиша: Давай Сходим ↗' })).toHaveAttribute('href', today.requiredCredit.url);
  await expect(page.getByRole('button', { name: 'Событие сохранено', exact: true })).toHaveAttribute('aria-pressed', 'true');

  const profile = page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('button', { name: 'Профиль', exact: true });
  await profile.click();
  await page.getByRole('button', { name: /Сохранённые места/ }).click();
  await expect(page.getByRole('heading', { name: 'Сохранённое', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(today.name) })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб' })).toBeEnabled();
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  await profile.click();
  await page.getByRole('button', { name: /Сохранённые места/ }).click();
  await expect(page.getByRole('button', { name: new RegExp(today.name) })).toBeVisible();
});
