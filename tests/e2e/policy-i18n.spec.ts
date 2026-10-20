import { expect, test } from '@playwright/test';

test('policy pages are directly accessible and localised without the app language gate', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Память и приватность', exact: true })).toBeVisible();
  await expect(page.getByRole('main', { name: 'Language selection' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '← Вернуться в QETTYQ' }).first()).toHaveAttribute('href', '/');
  await page.getByLabel('Язык интерфейса').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Location is your choice' })).toBeVisible();
  await expect(page.getByText(/FOSSGIS \/ OSRM Foot receives the selected points/)).toBeVisible();
  await expect(page.getByText(/not universal anonymisation/)).toBeVisible();
  await expect(page.getByText(/Backup archives may retain copies for up to 7 days/)).toBeVisible();
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `output/playwright/i18n/policy-privacy-en-${width}.png`, fullPage: true });
  }
  await page.goto('/sources');
  await expect(page.getByLabel('Interface language')).toHaveValue('en');
  await expect(page.getByRole('heading', { name: 'Where the data comes from' })).toBeVisible();
  await expect(page.getByText(/code limits, not the actual number/)).toBeVisible();
  await expect(page.getByText('Google place search requires separate consent and available quota. Availability depends on Google API settings.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Google Maps terms', exact: true })).toHaveAttribute('href', 'https://maps.google.com/help/terms_maps/');
  await expect(page.getByRole('link', { name: 'Google privacy policy', exact: true })).toHaveAttribute('href', 'https://policies.google.com/privacy');
  await expect(page.getByRole('link', { name: 'Давай Сходим · sxodim.com/astana' })).toHaveAttribute('href', 'https://sxodim.com/astana');
  await page.getByLabel('Interface language').selectOption('kk');
  await expect(page.getByRole('heading', { name: 'Деректер қайдан алынады' })).toBeVisible();
  await expect(page.getByRole('link', { name: '© OpenStreetMap contributors · ODbL 1.0' })).toBeVisible();
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 932 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `output/playwright/i18n/policy-sources-kk-${width}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => localStorage.getItem('qettyq.language.v1'))).toBe('kk');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
