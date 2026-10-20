import { expect, test } from '@playwright/test';

const languages = [
  { code: 'ru', choice: 'Русский', welcome: 'Выбрать свой вайб', skip: 'Пропустить подбор интересов', conditions: 'К условиям подборки', time: 'Свободное время', show: 'Показать подборку', details: 'Подробнее', profile: 'Профиль', settings: 'Настройки и память', selector: 'Язык интерфейса', memory: 'Серверная память', retention: 'Срок хранения серверной памяти', preferences: 'Предпочтения', dialogue: 'Диалог', remove: 'Удалить мои данные', confirm: 'Да, удалить данные' },
  { code: 'kk', choice: 'Қазақша', welcome: 'Өз көңіл күйіңді таңда', skip: 'Қызығушылықтарды таңдауды өткізу', conditions: 'Іріктеу шарттарына', time: 'Бос уақыт', show: 'Іріктеуді көрсету', details: 'Толығырақ', profile: 'Профиль', settings: 'Баптаулар мен жады', selector: 'Интерфейс тілі', memory: 'Сервер жады', retention: 'Сервер жадын сақтау мерзімі', preferences: 'Талғам', dialogue: 'Диалог', remove: 'Деректерімді өшіру', confirm: 'Иә, деректерді өшіру' },
  { code: 'en', choice: 'English', welcome: 'Find your vibe', skip: 'Skip interest selection', conditions: 'Set your conditions', time: 'Free time', show: 'Show matches', details: 'Details', profile: 'Profile', settings: 'Settings and memory', selector: 'Interface language', memory: 'Server memory', retention: 'Server memory retention', preferences: 'Preferences', dialogue: 'Conversation', remove: 'Delete my data', confirm: 'Yes, delete data' },
] as const;

for (const language of languages) test(`${language.code}: first-run language, all main setup, source titles, settings and explicit memory`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/events', route => route.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
  await page.route('**/api/assistant/status', route => route.fulfill({ json: { available: false, reason: 'API_KEY_MISSING', localTestOnly: false } }));
  // Synthetic consent state only: this test proves UI/API wiring, not SQLite persistence.
  const state = { available: true, enabled: false, storageMode: 'sqlite_opt_in', consents: { profile: null, dialogue: null, ai_transfer: null, visits: null } as Record<string, null | { active: boolean; expiresAt: string }>, profile: null as unknown, messages: [], visits: [], expiresAt: null, historyTrust: 'untrusted_personal_context' };
  const mutations: Array<{ url: string; body: Record<string, unknown> }> = [];
  await page.route('**/api/memory**', async route => {
    const request = route.request();
    if (request.method() !== 'GET') {
      const body = request.postDataJSON() ?? {};
      mutations.push({ url: request.url(), body });
      if (request.url().endsWith('/consents')) { const scope = body.scope as string; state.consents[scope] = request.method() === 'DELETE' ? null : { active: true, expiresAt: '2026-11-21T00:00:00Z' }; state.enabled = Object.values(state.consents).some(Boolean); }
      else if (request.url().endsWith('/profile')) state.profile = body;
      else if (request.method() === 'DELETE') { state.enabled = false; state.profile = null; for (const scope of Object.keys(state.consents)) state.consents[scope] = null; }
    }
    await route.fulfill({ json: state });
  });
  await page.goto('/');
  const gate = page.getByRole('main', { name: 'Language selection' });
  await expect(gate.getByRole('button')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /QETTYQ/ })).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  for (const width of [360, 390, 430]) { await page.setViewportSize({ width, height: 932 }); await page.screenshot({ path: `output/playwright/i18n/language-${language.code}-${width}.png` }); }
  await gate.getByRole('button', { name: language.choice, exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', language.code);
  await expect(page.getByRole('button', { name: language.welcome, exact: true })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('qettyq.language.v1'))).toBe(language.code);
  await page.reload();
  await expect(page.getByRole('button', { name: language.welcome, exact: true })).toBeEnabled();
  await page.getByRole('button', { name: language.welcome, exact: true }).click();
  await page.getByTestId('swipe-card').press('ArrowRight');
  await page.getByRole('button', { name: language.skip, exact: true }).click();
  await page.getByRole('button', { name: language.conditions, exact: true }).click();
  await page.getByLabel(language.time, { exact: true }).fill('720');
  await page.getByRole('button', { name: language.show, exact: true }).click();
  const card = page.getByRole('article').first();
  const originalTitle = await card.getByRole('heading').innerText();
  await card.getByRole('button', { name: language.details, exact: true }).click();
  await expect(page.getByRole('heading', { name: originalTitle, exact: true })).toBeVisible();
  await page.screenshot({ path: `output/playwright/i18n/${language.code}-detail.png` });
  await page.getByRole('navigation').getByRole('button', { name: language.profile, exact: true }).click();
  await page.getByRole('button', { name: language.settings, exact: true }).click();
  await expect(page.getByLabel(language.selector)).toHaveValue(language.code);
  const memory = page.getByRole('region', { name: language.memory, exact: true });
  await expect(memory.getByRole('button', { name: language.preferences, exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(mutations).toHaveLength(0);
  await page.getByLabel(language.retention, { exact: true }).selectOption('persistent_30d');
  await memory.getByRole('button', { name: language.preferences, exact: true }).click();
  await expect(memory.getByRole('button', { name: language.preferences, exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(mutations[0].body).toEqual({ scope: 'profile', retention: 'persistent_30d' });
  expect(mutations[1].body).toMatchObject({ locale: language.code });
  expect(mutations[1].body).not.toHaveProperty('origin');
  expect(mutations[1].body).not.toHaveProperty('address');
  await memory.getByRole('button', { name: language.preferences, exact: true }).click();
  await expect(memory.getByRole('button', { name: language.preferences, exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('qettyq.language.v1'))).toBe(language.code);
  for (const width of [360, 390, 430]) { await page.setViewportSize({ width, height: 932 }); await page.screenshot({ path: `output/playwright/i18n/${language.code}-settings-${width}.png` }); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); }
  await memory.getByRole('button', { name: language.remove, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: language.confirm, exact: true }).click();
  await expect(gate).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('qettyq.language.v1'))).toBeNull();
  expect(errors).toEqual([]);
});

test('Google: disclosed defaults, explicit settings opt-out/enable, English shell, original names and credit, no OSM/photo/plan', async ({ page }) => {
  await page.route('**/api/events', route => route.fulfill({ json: { items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null } }));
  await page.route('**/api/assistant/status', route => route.fulfill({ json: { available: false, reason: 'API_KEY_MISSING', localTestOnly: false } }));
  const requests: Array<Record<string, unknown>> = [];
  await page.route('**/api/chat', async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    await route.fulfill({ json: { reply: 'SYNTHETIC TEST — no provider request', mode: 'deterministic', items: [], events: [], googlePlaces: { status: body.googleConsent ? 'live' : 'consent_required', reason: null, items: body.googleConsent ? [{ id: 'synthetic-google', name: 'Кофе', address: 'SYNTHETIC TEST — address, not a real venue', googleMapsUrl: 'https://www.google.com/maps/?cid=123', openingHoursText: ['Пн–Пт 10:00–22:00'], cuisineOrDishConfirmed: false, thirdPartyAttributions: [{ name: 'SYNTHETIC TEST — original credit', url: 'https://example.invalid/credit' }, { name: 'SYNTHETIC TEST — plain credit', url: 'javascript:alert(1)' }] }] : [], attribution: { text: 'Google Maps', url: 'https://maps.google.com' } } } });
  });
  await page.goto('/');
  await page.getByRole('main', { name: 'Language selection' }).getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Find your vibe' })).toBeEnabled();
  await page.getByRole('button', { name: 'QETTYQ — home' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Search', exact: true }).click();
  const disclosure = page.getByText('Search may use OpenAI and Google: they receive your query, not your precise location. History stays on this device; server memory is enabled separately.', { exact: true });
  await expect(disclosure).toBeVisible();
  await disclosure.locator('..').getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('region', { name: 'Assistant settings', exact: true });
  const google = settings.getByRole('checkbox', { name: 'Google places and photos', exact: true });
  await expect(google).toBeChecked(); await google.uncheck();
  await settings.getByRole('button', { name: 'Back to the conversation', exact: true }).click();
  await page.getByLabel('Message the assistant').fill('Кофе');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Google search requires separate consent.')).toBeVisible();
  expect(requests[0]).toMatchObject({ language: 'en', googleConsent: false, useAI: false });
  await page.locator('[data-screen] > header').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(google).not.toBeChecked(); await google.check();
  await settings.getByRole('button', { name: 'Back to the conversation', exact: true }).click();
  await page.getByLabel('Message the assistant').fill('Кофе');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const results = page.getByRole('region', { name: 'Google Maps results' });
  await expect(results.getByRole('heading', { name: 'Кофе', exact: true })).toBeVisible();
  expect(requests[1]).toMatchObject({ language: 'en', googleConsent: true, useAI: false });
  expect(requests[1]).not.toHaveProperty('latitude');
  await expect(results.getByRole('link', { name: 'Google Maps', exact: true })).toBeVisible();
  await expect(results.getByRole('link', { name: 'SYNTHETIC TEST — original credit', exact: true })).toHaveAttribute('href', 'https://example.invalid/credit');
  await expect(results.getByRole('link', { name: 'SYNTHETIC TEST — plain credit', exact: true })).toHaveCount(0);
  await expect(results.getByText('SYNTHETIC TEST — plain credit', { exact: true })).toBeVisible();
  await expect(results.getByRole('img')).toHaveCount(0);
  await expect(results.getByRole('button')).toHaveCount(0);
  await expect(results.locator('[data-map-engine]')).toHaveCount(0);
  await page.screenshot({ path: 'output/playwright/i18n/google-synthetic.png' });
});
