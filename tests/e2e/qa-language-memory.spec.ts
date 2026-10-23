import { showRouteOptions } from './route-ui-helpers';
import { formatDurationMinutes } from '../../src/client/format-duration';
import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeVpsRuntime } from '../../src/server/vps/runtime';
import { POST as startSession } from '../../src/app/api/session/route';
import { GET as readMemory, DELETE as deleteMemory } from '../../src/app/api/memory/route';
import { POST as grantMemory, DELETE as revokeMemory } from '../../src/app/api/memory/consents/route';
import { PATCH as saveMemoryProfile } from '../../src/app/api/memory/profile/route';
import { POST as saveMemoryMessage } from '../../src/app/api/memory/messages/route';
import { POST as saveMemoryVisit } from '../../src/app/api/memory/visits/route';
import type { SxodimSnapshot } from '../../src/server/ingestion/sxodim-live';
import { resetSessionStoreForTests } from '../../src/server/session/store';
import { UI_TRANSLATIONS } from '../../src/client/i18n-dictionary';
import { answerPilotChat } from '../../src/server/pilot/chat';
import { localizedSearchReply } from '../../src/server/pilot/chat-language';
import type { PilotContext } from '../../src/server/pilot/contracts';
import type { MemoryState, MemoryScope, MemoryPreferences } from '../../src/server/memory/contracts';
import sourceSnapshot from '../../data/livedata/sxodim-astana-2026-10-20.json';

// Independent baseline QA. Event facts are a dated real snapshot, not a live fetch.
// Road responses below are SYNTHETIC UI fixtures, not measured streets/ETA.
// Never enables AI or contacts any routing, Google or event provider.
const stamp = '20261020-baseline';
const screens = (page: Page) => page.locator('[data-screen][data-keyboard-open]');
async function screen(page: Page, name: string) { await expect(screens(page)).toHaveAttribute('data-screen', name); }
async function chooseRussian(page: Page) {
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб' })).toBeEnabled();
}
async function capture(page: Page, width: number, name: string, language?: string) {
  await screen(page, name.startsWith('organizer-') ? 'organizer' : name === 'delete' ? 'settings' : name === 'error' ? 'conditions' : name);
  await page.waitForFunction(() => [...document.images].filter(image => { const box = image.getBoundingClientRect(); return box.width > 0 && box.height > 0 && box.top < innerHeight && box.bottom > 0; }).every(image => image.complete && image.naturalWidth > 0), undefined, { timeout: 20_000 });
  await page.screenshot({ path: `output/playwright/qa-locales-memory-${stamp}/${width}-${language ? `${language}-` : ''}${name}.png` });
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width} ${name}: document horizontal overflow`).toBe(true);
  const app = await screens(page).boundingBox();
  const viewport = page.viewportSize()!;
  expect.soft(Boolean(app && app.x >= -1 && app.y >= -1 && app.x + app.width <= viewport.width + 1 && app.y + app.height <= viewport.height + 1), `${width} ${name}: app extends outside viewport`).toBe(true);
}
async function offline(page: Page) {
  page.setDefaultTimeout(10_000);
  await page.route('**/api/events', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...sourceSnapshot, dataMode: 'snapshot', freshness: 'stale', cacheStatus: 'stale-fallback', warnings: ['QA: dated source snapshot; no live requests.'] }) }));
  await page.route('**/api/assistant/status', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: false, configured: false, reason: 'QA_NO_PAID_CALLS', localTestOnly: false, hostedWebSearch: false }) }));
  await page.route('**/api/chat', route => {
    const body = route.request().postDataJSON() as { text: string; context: PilotContext; language?: 'ru' | 'kk' | 'en' };
    const result = { ...answerPilotChat(body.text, body.context), events: [] };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...result, reply: localizedSearchReply(body.language ?? 'ru', result), mode: 'deterministic', citations: [], reason: 'QA_OFFLINE_CATALOG_FIXTURE', dataMode: 'snapshot' }) });
  });
  await page.route('**/api/memory', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: true, enabled: false, storageMode: 'sqlite_opt_in', historyTrust: 'untrusted_personal_context', profile: null, messages: [], visits: [], expiresAt: null, consents: { profile: null, dialogue: null, ai_transfer: null, visits: null }, ...(route.request().method() === 'DELETE' ? { deleted: true } : {}) }) }));
  await page.route('**/api/routing', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ available: true, provider: 'fossgis_foot', label: 'SYNTHETIC QA route — not real streets', reason: null, localDemo: true }) });
    const body = route.request().postDataJSON() as { points: Array<{ lat: number; lon: number }> };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ route: { quality: 'street', profile: 'foot', provider: 'fossgis_foot', fetchedAt: '2026-10-20T10:00:00Z', geometry: { type: 'LineString', coordinates: body.points.map(p => [p.lon, p.lat]) }, distanceMeters: 1700, durationSeconds: 1200, legs: body.points.slice(1).map(() => ({ distanceMeters: 1700 / (body.points.length - 1), durationSeconds: 1200 / (body.points.length - 1) })), attribution: { text: 'SYNTHETIC QA geometry — not real route', url: 'https://routing.openstreetmap.de/about.html' }, warnings: ['Synthetic UI fixture only.'] } }) });
  });
  await page.route('https://api.openai.com/**', route => route.abort());
  await page.route('https://maps.googleapis.com/**', route => route.abort());
}
async function toConditions(page: Page) {
  await page.getByRole('button', { name: 'Выбрать свой вайб' }).click();
  await screen(page, 'swipe');
  await page.getByTestId('swipe-card').press('ArrowRight');
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/2 из 15/);
  await page.getByRole('button', { name: 'Отменить выбор', exact: true }).click();
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/1 из 15/);
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await screen(page, 'conditions');
}
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('button', { name, exact: true });

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }]) {
  test.describe(`independent baseline ${viewport.width}`, () => {
    test.use({ viewport, isMobile: viewport.width < 800, hasTouch: viewport.width < 800, reducedMotion: 'reduce' });
    test('all main screens, safe route modes, memory, delete and error', async ({ page, context }) => {
      test.setTimeout(120_000);
      await offline(page);
      const exceptions: string[] = [];
      const paidAI: unknown[] = [];
      page.on('pageerror', error => exceptions.push(error.message));
      page.on('request', request => { if (request.url().endsWith('/api/chat') && request.method() === 'POST' && request.postDataJSON().useAI) paidAI.push(request.postDataJSON()); });
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
      await page.goto('/');
      await chooseRussian(page);
      await capture(page, viewport.width, 'welcome');
      await page.getByRole('button', { name: 'Выбрать свой вайб' }).click();
      await capture(page, viewport.width, 'swipe');
      // Back and full re-entry exercise visible navigation, not localStorage injection.
      await page.getByRole('button', { name: 'Вернуться', exact: true }).click();
      await toConditions(page);
      await page.getByLabel('Свободное время', { exact: true }).fill('720');
      await page.getByRole('group', { name: 'Быстрый выбор бюджета на человека' }).getByRole('button', { name: /Без ограничений/ }).click();
      await page.getByRole('button', { name: 'Поделиться геопозицией' }).click();
      await expect(page.getByText('Старт выбран. Точка хранится только до закрытия страницы.', { exact: true })).toBeVisible();
      await capture(page, viewport.width, 'conditions');
      await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
      await screen(page, 'feed');
      await expect(page.getByRole('article').first()).toBeVisible();
      await capture(page, viewport.width, 'feed');
      const place = page.getByRole('article').first();
      await place.getByRole('button', { name: 'Сохранить', exact: true }).click();
      await place.getByRole('button', { name: 'Подробнее', exact: true }).click();
      await capture(page, viewport.width, 'detail');
      await expect(page.getByText(/Расписание, язык и наличие мест не подтверждены/)).toBeVisible();
      await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
      await screen(page, 'plan');
      const sheet = page.getByRole('region', { name: 'План маршрута' });
      await page.getByRole('button', { name: 'Развернуть план маршрута' }).click(); await showRouteOptions(page);
      for (const name of ['Авто', 'Такси', 'Автобус']) {
        const unsupported = sheet.getByRole('button', { name, exact: true });
        if (await unsupported.count()) await expect(unsupported).toBeDisabled();
      }
      await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toBeVisible();
      await sheet.getByRole('button', { name: 'Убрать дорожный расчёт', exact: true }).click();
      await expect(sheet.getByText(/На карте — точки плана, не линия дороги/)).toBeVisible();
      await expect(sheet.getByText('Запас времени 1 ч 48 мин', { exact: true })).toBeVisible();
      await capture(page, viewport.width, 'plan');
      await sheet.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' }).check();
      await sheet.getByRole('button', { name: 'Проложить маршрут', exact: true }).click();
      await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toBeVisible();
      await page.screenshot({ path: `output/playwright/qa-locales-memory-${stamp}/${viewport.width}-plan-street-SYNTHETIC.png` });
      const actionBox = await page.getByRole('link', { name: 'Начать маршрут', exact: true }).boundingBox();
      const dockBox = await page.getByRole('navigation', { name: 'Основная навигация' }).boundingBox();
      expect.soft(Boolean(actionBox && dockBox && actionBox.y + actionBox.height <= dockBox.y), `${viewport.width}: route action overlaps dock`).toBe(true);
      await sheet.getByRole('button', { name: 'Убрать дорожный расчёт', exact: true }).click();
      await expect(sheet.getByText(/На карте — точки плана, не линия дороги/)).toBeVisible();
      await expect(sheet.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' })).toBeChecked();
      await page.getByRole('button', { name: 'Свернуть план маршрута', exact: true }).click();
      await page.getByRole('button', { name: 'На карту', exact: true }).click();
      await expect(page.locator('.maplibregl-canvas, .leaflet-container').first()).toBeVisible({ timeout: 20_000 });
      // Keep required attribution visible; no hiding CSS or removed credits in tests.
      // Style fetch has an 8s timeout before the documented Leaflet fallback.
      // Require the same visible mandatory credit after readiness, not an empty loading control.
      await expect(page.locator('.maplibregl-ctrl-attrib:visible, .leaflet-control-attribution:visible').first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText('Загружаем карту Астаны…', { exact: true })).toHaveCount(0, { timeout: 20_000 });
      await capture(page, viewport.width, 'map');
      await nav(page, 'Для тебя').click();
      await page.getByRole('button', { name: 'О событии', exact: true }).first().click();
      await capture(page, viewport.width, 'event');
      await expect(page.getByRole('link', { name: /Афиша: Давай Сходим/ })).toBeVisible();
      await expect(page.getByText(/Язык не указан/)).toBeVisible();
      await page.getByRole('button', { name: 'Сохранить событие', exact: true }).click();
      await page.getByRole('button', { name: 'Назад', exact: true }).click();
      await nav(page, 'Поиск').click();
      await page.getByRole('textbox', { name: 'Сообщение помощнику' }).fill('Кофе на 90 минут');
      await page.getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
      await expect(page.getByRole('log', { name: 'Диалог с помощником' }).getByText('QETTYQ · поиск по каталогу').first()).toBeVisible();
      await capture(page, viewport.width, 'chat');
      await nav(page, 'Профиль').click();
      await expect(nav(page, 'Профиль')).toHaveAttribute('aria-current', 'page');
      await expect.poll(async () => page.getByRole('navigation', { name: 'Основная навигация' }).evaluate(element => {
        const active = element.querySelector('[aria-current=page]')?.getBoundingClientRect();
        const glass = element.querySelector(':scope>span')?.getBoundingClientRect();
        return active && glass ? Math.abs(active.x + active.width / 2 - glass.x - glass.width / 2) : 999;
      }), { message: 'Dock highlight should align with active profile tab' }).toBeLessThan(8);
      await capture(page, viewport.width, 'profile');
      await page.getByRole('button', { name: /Сохранённые места/ }).click();
      await capture(page, viewport.width, 'saved');
      await expect(page.getByText('Без фото', { exact: true }).first()).toBeVisible();
      await nav(page, 'Профиль').click();
      await page.getByRole('button', { name: 'Моё событие', exact: true }).click();
      await capture(page, viewport.width, 'organizer-cabinet');
      await page.getByRole('button', { name: 'Условия публикации', exact: true }).click();
      await capture(page, viewport.width, 'organizer-eligibility');
      await page.getByRole('button', { name: 'К моим черновикам', exact: true }).click();
      await page.getByRole('button', { name: 'Создать событие', exact: true }).click();
      await page.getByLabel(/Название события/).fill('SYNTHETIC QA — не публиковать');
      await page.getByLabel('Категория', { exact: true }).selectOption('community');
      await page.getByLabel('Организатор', { exact: true }).fill('Synthetic local QA');
      await capture(page, viewport.width, 'organizer-basic');
      await page.getByRole('button', { name: 'Дальше', exact: true }).click();
      await page.getByLabel('Дата', { exact: true }).fill('2026-10-25');
      await page.getByLabel('Начало', { exact: true }).fill('18:00');
      await page.getByLabel('Или длительность', { exact: true }).fill('60');
      await page.getByLabel('Место проведения', { exact: true }).fill('Synthetic venue — not real');
      await capture(page, viewport.width, 'organizer-schedule');
      await page.getByRole('button', { name: 'Дальше', exact: true }).click();
      await page.getByRole('button', { name: 'Бесплатно', exact: true }).click();
      await page.getByRole('button', { name: 'Русский', exact: true }).click();
      await page.getByLabel('Ссылка', { exact: true }).fill('https://example.com');
      await capture(page, viewport.width, 'organizer-details');
      await page.getByRole('button', { name: 'Дальше', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Проверьте перед сохранением', exact: true })).toBeVisible();
      await capture(page, viewport.width, 'organizer-preview');
      await expect(page.getByRole('button', { name: 'Отправить на проверку', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Мои события', exact: true })).toBeVisible();
      await nav(page, 'Профиль').click();
      await page.getByRole('button', { name: 'Настройки и память', exact: true }).click();
      await capture(page, viewport.width, 'settings');
      await page.getByLabel('Язык интерфейса', { exact: true }).selectOption('kk');
      await expect(page.locator('html')).toHaveAttribute('lang', 'kk');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', 'kk');
      // Device language may change labels, not persisted dialogue.
      await page.locator('nav').getByRole('button', { name: 'Профиль', exact: true }).click();
      await page.getByRole('button', { name: 'Баптаулар мен жады', exact: true }).click();
      await expect(page.locator('#locale')).toHaveValue('kk');
      await page.locator('#locale').selectOption('ru');
      await nav(page, 'Поиск').click();
      await expect(page.getByRole('log').getByText('Кофе на 90 минут', { exact: true })).toBeVisible();
      await nav(page, 'Профиль').click();
      await page.getByRole('button', { name: 'Настройки и память', exact: true }).click();
      await page.getByRole('button', { name: 'Удалить мои данные', exact: true }).click();
      await capture(page, viewport.width, 'delete');
      await page.getByRole('button', { name: 'Оставить данные', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Удалить мои данные', exact: true }).click();
      await page.getByRole('button', { name: 'Да, удалить данные', exact: true }).click();
      await expect(page.getByRole('main', { name: 'Language selection' })).toBeVisible();
      expect(await page.evaluate(() => ['qettyq.language.v1', 'qettyq.local-memory.v1', 'qettyq.saved.v2', 'qettyq.organizer.v2', 'qettyq.onboarding.v2'].filter(key => localStorage.getItem(key) !== null))).toEqual([]);
      await chooseRussian(page);
      await page.route('**/api/chat', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'QA_SYNTHETIC_FAILURE' } }) }));
      await toConditions(page);
      await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Сервис не ответил' })).toBeVisible();
      await capture(page, viewport.width, 'error');
      await page.getByRole('button', { name: 'Закрыть ошибку', exact: true }).click();
      expect(paidAI).toEqual([]);
      expect.soft(exceptions, `${viewport.width}: uncaught browser exceptions`).toEqual([]);
    });
  });
}

test('route invalidation: adding a stop and shortening time cannot retain an earlier street result', async ({ page, context }) => {
  test.setTimeout(90_000);
  await offline(page);
  let holdRouting = false;
  const pending: Array<() => void> = [];
  await page.route('**/api/routing', async route => {
    if (route.request().method() === 'POST' && holdRouting) await new Promise<void>(resolve => pending.push(resolve));
    await route.fallback();
  });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
  await page.goto('/');
  await chooseRussian(page);
  await toConditions(page);
  await page.getByLabel('Свободное время', { exact: true }).fill('720');
  await page.getByRole('group', { name: 'Быстрый выбор бюджета на человека' }).getByRole('button', { name: /Без ограничений/ }).click();
  await page.getByRole('button', { name: 'Поделиться геопозицией' }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'В мой план', exact: true }).click();
  await page.getByRole('button', { name: /Открыть план · 1 мест/ }).click();
  const sheet = page.getByRole('region', { name: 'План маршрута' });
  await page.getByRole('button', { name: 'Развернуть план маршрута' }).click(); await showRouteOptions(page);
  await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toBeVisible();
  await page.getByRole('button', { name: 'Свернуть план маршрута', exact: true }).click();
  await page.getByRole('button', { name: 'На карту', exact: true }).click();
  await nav(page, 'Для тебя').click();
  await page.getByRole('article').nth(1).getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'В мой план', exact: true }).click();
  holdRouting = true;
  await page.getByRole('button', { name: /Открыть план · 2 мест/ }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута' }).click(); await showRouteOptions(page);
  await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toHaveCount(0);
  await expect(sheet.getByRole('checkbox', { name: 'Дорожный расчёт выбранных точек' })).toBeChecked();
  await expect(sheet.locator('#route-details > ol > li')).toHaveCount(3);
  await expect.poll(() => pending.length).toBe(1);
  pending.shift()!();
  await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Изменить условия', exact: true }).click();
  await page.getByLabel('Свободное время', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await nav(page, 'Карта').click();
  await page.getByRole('button', { name: /Мой план · 2/ }).click();
  await expect(sheet).toBeVisible(); await showRouteOptions(page);
  await expect(sheet.getByText(/Этот план превышает выбранные ограничения/)).toBeVisible();
  await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toHaveCount(0);
  await expect.poll(() => pending.length).toBe(1);
  pending.shift()!();
  await expect(sheet.getByText(/Источник: SYNTHETIC QA/)).toBeVisible();
  await page.screenshot({ path: `output/playwright/qa-locales-memory-${stamp}/390-plan-after-time-edit.png` });
});

for (const language of ['kk', 'en'] as const) for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }]) {
  test.describe(`localized full flow ${language} ${viewport.width}`, () => {
    test.use({ viewport, isMobile: viewport.width < 800, hasTouch: viewport.width < 800, reducedMotion: 'reduce' });
    test('all main screens and organizer; original source/user text and delete gate', async ({ page, context }) => {
      test.setTimeout(90_000);
      await offline(page);
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 51.1282, longitude: 71.4304 });
      const L = (text: string) => UI_TRANSLATIONS[text]?.[language === 'kk' ? 0 : 1] ?? text;
      const button = (text: string) => page.getByRole('button', { name: L(text), exact: true });
      const tab = (text: string) => page.locator('nav').getByRole('button', { name: L(text), exact: true });
      const snap = (name: string) => capture(page, viewport.width, name, language);
      await page.goto('/');
      await page.getByRole('button', { name: language === 'kk' ? 'Қазақша' : 'English', exact: true }).click();
      await expect(button('Выбрать свой вайб')).toBeEnabled();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await snap('welcome');
      await button('Выбрать свой вайб').click();
      await snap('swipe');
      await page.getByTestId('swipe-card').press('ArrowLeft');
      await button('Отменить выбор').click();
      await button('Пропустить подбор интересов').click();
      await button('К условиям подборки').click();
      await page.getByLabel(L('Свободное время'), { exact: true }).fill('720');
      await page.getByRole('group', { name: L('Быстрый выбор бюджета на человека') }).getByRole('button', { name: L('Без ограничений'), exact: true }).click();
      await button('Поделиться геопозицией').click();
      await expect(page.getByText(L('Старт выбран. Точка хранится только до закрытия страницы.'), { exact: true })).toBeVisible();
      await snap('conditions');
      await button('Показать подборку').click();
      await expect(page.getByRole('article').first()).toBeVisible();
      await snap('feed');
      // Freeze the chosen identity, not an index that Playwright would resolve
      // again after a transient notice/HMR or catalogue replacement.
      const originalPlace = await page.getByRole('article').first().getByRole('heading').innerText();
      const place = page.locator('[data-screen="feed"] > main').getByRole('article').filter({ has: page.getByRole('heading', { name: originalPlace, exact: true }) });
      await expect(place).toHaveCount(1);
      await expect(button('Закрыть уведомление')).toHaveCount(0);
      await place.getByRole('button', { name: L('Сохранить'), exact: true }).click();
      await expect(place.getByRole('button', { name: L('Убрать из сохранённых'), exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(place.getByRole('heading', { name: originalPlace, exact: true })).toHaveText(originalPlace);
      await place.getByRole('button', { name: L('Подробнее'), exact: true }).click();
      await expect(page.getByRole('heading', { name: originalPlace, exact: true })).toBeVisible();
      await snap('detail');
      await button('Оценить путь').click();
      await button('Развернуть план маршрута').click(); await showRouteOptions(page);
      const routeSheet = page.getByRole('region', { name: L('План маршрута'), exact: true });
      await expect(routeSheet.getByText(`${L('Запас времени')} ${formatDurationMinutes(108, language)}`, { exact: true })).toBeVisible();
      if (language === 'kk') {
        await expect(routeSheet).toContainText('қазан');
        await expect(routeSheet).not.toContainText(/\bM\d{1,2}\b/u);
      }
      await snap('plan');
      await expect(page.locator('.maplibregl-ctrl-attrib, .leaflet-control-attribution').first()).toBeVisible({ timeout: 20_000 });
      await button('Свернуть план маршрута').click();
      await button('На карту').click();
      await expect(page.locator('.maplibregl-canvas, .leaflet-container').first()).toBeVisible({ timeout: 20_000 });
      await snap('map');
      await tab('Для тебя').click();
      await button('О событии').first().click();
      const originalEvent = await page.getByRole('heading', { level: 1 }).innerText();
      expect(sourceSnapshot.items.some(event => event.name === originalEvent)).toBe(true);
      await snap('event');
      await button('Назад').click();
      await tab('Поиск').click();
      await expect(page.getByText(L('Поиск может использовать OpenAI и Google: им передаётся запрос, но не точная геопозиция. История хранится на устройстве; серверная память включается отдельно.'), { exact: true })).toHaveCount(0);
      const userText = 'QA: кофе, K-pop и «Балет» — таңдау';
      await page.getByRole('textbox', { name: L('Сообщение помощнику') }).fill(userText);
      const chatRequest = page.waitForRequest(request => request.url().endsWith('/api/chat') && request.method() === 'POST');
      await button('Отправить сообщение').click();
      const payload = (await chatRequest).postDataJSON();
      expect(payload.language).toBe(language);
      expect(payload.googleConsent).toBe(true);
      expect(payload.useAI).toBe(false);
      await expect(page.getByRole('log').getByText(userText, { exact: true })).toBeVisible();
      await expect(page.getByRole('log').getByText(L('QETTYQ · поиск по каталогу'), { exact: true }).first()).toBeVisible();
      await snap('chat');
      await tab('Профиль').click();
      await snap('profile');
      await page.getByRole('button', { name: new RegExp(L('Сохранённые места')) }).click();
      await snap('saved');
      await expect(page.getByText(L('Без фото'), { exact: true }).first()).toBeVisible();
      await tab('Профиль').click();
      await button('Моё событие').click();
      await snap('organizer-cabinet');
      await button('Условия публикации').click();
      await snap('organizer-eligibility');
      await button('К моим черновикам').click();
      await button('Создать событие').click();
      await page.getByLabel(new RegExp(L('Название события'))).fill('SYNTHETIC QA — не публиковать');
      await page.getByLabel(L('Категория'), { exact: true }).selectOption('community');
      await page.getByLabel(L('Организатор'), { exact: true }).fill('Synthetic local QA');
      await snap('organizer-basic');
      await button('Дальше').click();
      await page.getByLabel(L('Дата'), { exact: true }).fill('2026-10-25');
      await page.getByLabel(L('Начало'), { exact: true }).fill('18:00');
      await page.getByLabel(L('Или длительность'), { exact: true }).fill('60');
      await page.getByLabel(L('Место проведения'), { exact: true }).fill('Synthetic venue — not real');
      await snap('organizer-schedule');
      await button('Дальше').click();
      await button('Бесплатно').click();
      await page.getByRole('group', { name: L('Язык'), exact: true }).getByRole('button', { name: L('Не указан'), exact: true }).click();
      await page.getByLabel(L('Ссылка'), { exact: true }).fill('https://example.com');
      await snap('organizer-details');
      await button('Дальше').click();
      await snap('organizer-preview');
      await button('Сохранить черновик').click();
      await tab('Профиль').click();
      await button('Настройки и память').click();
      await snap('settings');
      await expect(page.locator('#locale')).toHaveValue(language);
      await button('Удалить мои данные').click();
      await snap('delete');
      await button('Да, удалить данные').click();
      await expect(page.getByRole('main', { name: 'Language selection' })).toBeVisible();
      expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('qettyq.')))).toEqual([]);
    });
  });
}

for (const language of ['ru', 'kk', 'en'] as const) test(`memory UI consent and restore ${language}: revoke retains device language; delete resets language gate`, async ({ page }) => {
  await offline(page);
  const L = (text: string) => language === 'ru' ? text : UI_TRANSLATIONS[text]?.[language === 'kk' ? 0 : 1] ?? text;
  const button = (text: string) => page.getByRole('button', { name: L(text), exact: true });
  const tab = (text: string) => page.locator('nav').getByRole('button', { name: L(text), exact: true });
  const state: MemoryState = { available: true, enabled: false, storageMode: 'sqlite_opt_in', historyTrust: 'untrusted_personal_context', consents: { profile: null, dialogue: null, ai_transfer: null, visits: null }, profile: null, messages: [], visits: [], expiresAt: null };
  const profileWrites: MemoryPreferences[] = [];
  const originalUser = 'QA ORIGINAL: Сәлем, кофе и jazz';
  const originalAssistant = 'Original assistant: Hello!';
  await page.route('**/api/memory', route => {
    if (route.request().method() === 'DELETE') {
      Object.assign(state, { enabled: false, profile: null, messages: [], visits: [], expiresAt: null, consents: { profile: null, dialogue: null, ai_transfer: null, visits: null } });
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...state, ...(route.request().method() === 'DELETE' ? { deleted: true } : {}) }) });
  });
  await page.route('**/api/memory/profile', route => {
    state.profile = route.request().postDataJSON() as MemoryPreferences;
    profileWrites.push(state.profile);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
  });
  await page.route('**/api/memory/consents', route => {
    const body = route.request().postDataJSON() as { scope: MemoryScope; retention?: string };
    const active = route.request().method() === 'POST';
    state.consents[body.scope] = active ? { active: true, expiresAt: '2026-10-22T00:00:00Z' } : null;
    state.enabled = Object.values(state.consents).some(Boolean);
    if (body.scope === 'profile' && !active) state.profile = null;
    if (body.scope === 'dialogue') state.messages = active ? [
      { id: 'qa-restored-user', role: 'user', mode: 'user', text: originalUser, createdAtMs: Date.parse('2026-10-20T12:00:00Z') },
      { id: 'qa-restored-assistant', role: 'assistant', mode: 'deterministic', text: originalAssistant, createdAtMs: Date.parse('2026-10-20T12:00:01Z') },
    ] : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: { ru: 'Русский', kk: 'Қазақша', en: 'English' }[language], exact: true }).click();
  await expect(button('Выбрать свой вайб')).toBeEnabled();
  await button('Выбрать свой вайб').click();
  await button('Пропустить подбор интересов').click();
  await button('К условиям подборки').click();
  await button('Показать подборку').click();
  await screen(page, 'feed');
  await tab('Профиль').click();
  await button('Настройки и память').click();
  const section = page.getByRole('region', { name: L('Серверная память'), exact: true });
  const preference = section.getByRole('button', { name: L('Предпочтения'), exact: true });
  const dialogue = section.getByRole('button', { name: L('Диалог'), exact: true });
  await expect(preference).toHaveAttribute('aria-pressed', 'false');
  await expect(dialogue).toHaveAttribute('aria-pressed', 'false');
  await preference.click();
  await expect(preference).toHaveAttribute('aria-pressed', 'true');
  expect(profileWrites).toHaveLength(1);
  expect(profileWrites[0].locale).toBe(language);
  expect(profileWrites[0]).not.toHaveProperty('origin');
  await dialogue.click();
  await expect(dialogue).toHaveAttribute('aria-pressed', 'true');
  await tab('Поиск').click();
  await expect(page.getByRole('log').getByText(originalUser, { exact: true })).toBeVisible();
  await expect(page.getByRole('log').getByText(originalAssistant, { exact: true })).toBeVisible();
  await page.reload();
  await tab('Поиск').click();
  await expect(page.getByRole('log').getByText(originalUser, { exact: true })).toBeVisible();
  await tab('Профиль').click();
  await button('Настройки и память').click();
  await dialogue.click();
  await expect(dialogue).toHaveAttribute('aria-pressed', 'false');
  await expect(preference).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('qettyq.language.v1'))).toBe(language);
  await button('Удалить мои данные').click();
  await button('Да, удалить данные').click();
  await expect(page.getByRole('main', { name: 'Language selection' })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('qettyq.')))).toEqual([]);
  expect(state.enabled).toBe(false);
});

test('real loopback HTTP + VPS SQLite memory: opt-in, cookie isolation, restore cap, revoke and delete', async ({ playwright }) => {
  const directory = mkdtempSync(join(tmpdir(), 'qettyq-qa-memory-http-'));
  const runtimeOptions = { env: { NODE_ENV: 'test', QETTYQ_DATABASE_PATH: join(directory, 'memory.sqlite') },
    // Explicit offline source fixture. Do not inherit .env, AI or routing credentials.
    loadEvents: async () => sourceSnapshot as SxodimSnapshot };
  let runtime = initializeVpsRuntime(runtimeOptions);
  const handlers: Record<string, (request: Request) => Promise<Response>> = {
    'POST /api/session': startSession,
    'GET /api/memory': readMemory, 'DELETE /api/memory': deleteMemory,
    'POST /api/memory/consents': grantMemory, 'DELETE /api/memory/consents': revokeMemory,
    'PATCH /api/memory/profile': saveMemoryProfile,
    'POST /api/memory/messages': saveMemoryMessage, 'POST /api/memory/visits': saveMemoryVisit,
  };
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const method = incoming.method ?? 'GET';
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('QA_HTTP_SERVER_NOT_READY');
      const url = `http://127.0.0.1:${address.port}${incoming.url}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      const request = new Request(url, { method, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }) });
      const handler = handlers[`${method} ${new URL(url).pathname}`];
      const response = handler ? await handler(request) : new Response('{}', { status: 404 });
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => { if (key !== 'set-cookie') outgoing.setHeader(key, value); });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader('set-cookie', cookies);
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch { outgoing.statusCode = 500; outgoing.end('{"error":"QA_HTTP_BRIDGE_FAILED"}'); }
  });
  let browserClient: Awaited<ReturnType<typeof playwright.request.newContext>> | undefined;
  let stranger: Awaited<ReturnType<typeof playwright.request.newContext>> | undefined;
  try {
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('QA_HTTP_SERVER_NOT_READY');
    const origin = `http://127.0.0.1:${address.port}`;
    browserClient = await playwright.request.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
    stranger = await playwright.request.newContext({ baseURL: origin, extraHTTPHeaders: { origin } });
    expect((await browserClient.post('/api/session')).status()).toBe(201);
    const anonymous = await browserClient.get('/api/memory');
    expect(anonymous.status()).toBe(200);
    expect(await anonymous.json()).toMatchObject({ available: true, enabled: false, profile: null, messages: [], visits: [] });
    expect(anonymous.headers()['set-cookie']).toBeUndefined();
    const profile = { likedTags: ['rock', 'culture'], locale: 'kk', goal: 'new', minutes: 120, budget: 5000 };
    expect((await browserClient.patch('/api/memory/profile', { data: profile })).status()).toBe(409);
    const grant = await browserClient.post('/api/memory/consents', { data: { scope: 'profile', retention: 'session_24h' } });
    expect(grant.status()).toBe(200);
    expect(grant.headers()['set-cookie']).toContain('HttpOnly');
    expect((await browserClient.patch('/api/memory/profile', { data: profile })).status()).toBe(200);
    expect((await browserClient.post('/api/memory/messages', { data: { id: 'before-opt-in', role: 'user', mode: 'user', text: 'Не сохранять' } })).status()).toBe(403);
    expect((await browserClient.post('/api/memory/consents', { data: { scope: 'dialogue', retention: 'session_24h' } })).status()).toBe(200);
    for (let index = 0; index < 28; index++) expect((await browserClient.post('/api/memory/messages', { data: { id: `qa-${index}`, role: 'user', mode: 'user', text: `QA message ${index}` } })).status()).toBe(200);
    // Close and reopen the actual HTTP listener + runtime/database, not an in-RAM mock.
    await new Promise<void>(resolve => server.close(() => resolve()));
    runtime.close(); resetSessionStoreForTests();
    runtime = initializeVpsRuntime(runtimeOptions);
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(address.port, '127.0.0.1', resolve); });
    const restored = await playwright.request.newContext({ baseURL: origin, extraHTTPHeaders: { origin }, storageState: await browserClient.storageState() });
    try {
      expect((await restored.get('/api/memory')).status()).toBe(401);
      expect((await restored.post('/api/session')).status()).toBe(201);
      const state = await (await restored.get('/api/memory')).json();
      expect(state.profile).toEqual(profile);
      expect(state.messages).toHaveLength(24);
      expect(state.messages[0].text).toBe('QA message 4');
      expect(state.messages.at(-1).text).toBe('QA message 27');
      expect(state.historyTrust).toBe('untrusted_personal_context');
      // Continue the original browser with its newly issued guest session cookie.
      await browserClient.dispose();
      browserClient = await playwright.request.newContext({ baseURL: origin, extraHTTPHeaders: { origin }, storageState: await restored.storageState() });
    } finally { await restored.dispose(); }
    expect((await stranger.post('/api/session')).status()).toBe(201);
    expect(await (await stranger.get('/api/memory')).json()).toMatchObject({ enabled: false, profile: null, messages: [] });
    const strangerCookies = (await stranger.storageState()).cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    const spoofed = await stranger.get('/api/memory', { headers: { cookie: `${strangerCookies}; qettyq_memory=${'x'.repeat(43)}` } });
    expect(await spoofed.json()).toMatchObject({ enabled: false, profile: null, messages: [] });
    const crossSite = await browserClient.delete('/api/memory', { headers: { origin: 'https://evil.example' } });
    expect(crossSite.status()).toBe(403);
    expect((await (await browserClient.get('/api/memory')).json()).messages).toHaveLength(24);
    const revoked = await browserClient.delete('/api/memory/consents', { data: { scope: 'dialogue' } });
    expect(revoked.status()).toBe(200);
    expect(await revoked.json()).toMatchObject({ enabled: true, profile, messages: [], consents: { dialogue: null } });
    const removed = await browserClient.delete('/api/memory');
    expect(removed.status()).toBe(200);
    expect(await removed.json()).toMatchObject({ deleted: true, enabled: false, profile: null, messages: [], visits: [] });
    expect(removed.headers()['set-cookie']).toContain('Max-Age=0');
    expect((await browserClient.storageState()).cookies.find(cookie => cookie.name === 'qettyq_memory')).toBeUndefined();
    expect((await (await browserClient.get('/api/memory')).json()).enabled).toBe(false);
  } finally {
    await browserClient?.dispose(); await stranger?.dispose();
    await new Promise<void>(resolve => server.close(() => resolve()));
    runtime.close();
    // Only this test-owned mkdtemp directory is removed; no existing app data.
    rmSync(directory, { recursive: true });
  }
});
