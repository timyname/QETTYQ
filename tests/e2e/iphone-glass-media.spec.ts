import { showRouteOptions } from './route-ui-helpers';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';
import { answerPilotChat } from '../../src/server/pilot/chat';
import { pilotContextSchema } from '../../src/server/pilot/contracts';
import { localizedSearchReply } from '../../src/server/pilot/chat-language';

/** Shared PilotApp UI. PORT=4176 targets actual mobile/main.tsx via private Vite;
 * PORT=3037 targets Next.js. Both are browser fixtures, NOT a physical
 * iPhone/Safari run or live provider test (reuseExistingServer).
 * All /api requests are intercepted BEFORE navigation: no production proxy,
 * paid AI/Google/photo/routing request or live ingestion can escape. */
test.use({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
const SAFE = { top: 58, bottom: 62 };
const catalogue = pilotPlaces.map(publicPlace);
const imageDirectory = 'output/playwright/iphone-glass-media';

async function installFixtures(page: Page, options: { googlePhoto?: boolean; streetRoute?: boolean; aiAvailable?: boolean } = {}) {
  const submitted: Array<{ path: string; method: string; value: Record<string, unknown> | null }> = [];
  await page.addInitScript(({ top, bottom, allowQaLocation }) => {
    const apply = () => {
      document.documentElement.style.setProperty('--qettyq-safe-area-top', `${top}px`);
      document.documentElement.style.setProperty('--qettyq-safe-area-bottom', `${bottom}px`);
      document.documentElement.dataset.qaSafeArea = 'synthetic-iphone-430x932';
    };
    if (document.documentElement) apply(); else document.addEventListener('DOMContentLoaded', apply, { once: true });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition(success: (position: { coords: { latitude: number; longitude: number; accuracy: number } }) => void, failure: (error: { code: number; message: string }) => void) {
      if (allowQaLocation) success({ coords: { latitude: 51.1282, longitude: 71.4304, accuracy: 20 } });
      else failure({ code: 1, message: 'SYNTHETIC QA permission denied' });
    } } });
  }, { ...SAFE, allowQaLocation: Boolean(options.streetRoute) });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (options.googlePhoto && url.href === 'https://lh3.googleusercontent.com/synthetic-qa-photo') return route.fulfill({
      contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
    });
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const value = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    submitted.push({ path: url.pathname, method: request.method(), value });
    const respond = (json: unknown, status = 200) => route.fulfill({ status, json });
    if (url.pathname === '/api/session') return respond({ session: { id: 'synthetic-offline-browser-session' } });
    if (url.pathname === '/api/catalog') return respond({ items: catalogue, dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return respond({ items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null, warnings: ['SYNTHETIC QA: live event provider disabled'] });
    if (url.pathname === '/api/assistant/status') return respond({ available: Boolean(options.aiAvailable), configured: Boolean(options.aiAvailable), reason: options.aiAvailable ? null : 'QA_PROVIDERS_DISABLED', localTestOnly: false });
    if (url.pathname === '/api/context') return respond({ context: value });
    if (url.pathname === '/api/chat') {
      const context = pilotContextSchema.parse(value?.context ?? {}), result = answerPilotChat(String(value?.text ?? ''), context);
      return respond({ ...result, reply: localizedSearchReply((value?.language ?? 'ru') as 'ru' | 'kk' | 'en', { ...result, events: [] }),
        events: [], mode: 'deterministic', citations: [], dataMode: 'snapshot', reason: 'QA_OFFLINE_CATALOG_FIXTURE',
        ...(options.googlePhoto && value?.googleConsent === true ? { googlePlaces: { status: 'live', reason: null,
          attribution: { text: 'Google Maps', url: 'https://maps.google.com' }, items: [{ id: 'synthetic-qa-google-place',
            name: 'SYNTHETIC QA café', address: 'SYNTHETIC QA address — not a real venue', googleMapsUrl: 'https://www.google.com/maps/place/synthetic-qa',
            openingHoursText: [], cuisineOrDishConfirmed: false, photo: { uri: 'https://lh3.googleusercontent.com/synthetic-qa-photo',
              sourceUrl: 'https://www.google.com/maps/place/synthetic-qa', authors: [{ name: 'SYNTHETIC QA photo author', url: 'https://www.google.com/maps/contrib/synthetic-qa' }] } }] } } : {}) });
    }
    if (url.pathname === '/api/plans') {
      const ids = Array.isArray(value?.placeIds) ? value.placeIds : [], stops = catalogue.filter(place => ids.includes(place.id));
      return respond({ plan: { id: 'synthetic-qa-plan', stops, totalMinutes: null, travelMinutes: null, remainingMinutes: null, distanceKm: null,
        visitMinutes: stops.reduce((sum, place) => sum + place.durationMinutes, 0), budget: { min: null, max: null },
        warnings: ['SYNTHETIC QA: no provider road geometry or ETA'], feasibility: 'uncertain', routeQuality: 'unavailable' } });
    }
    if (url.pathname === '/api/routing') {
      if (options.streetRoute && request.method() === 'POST') {
        const points = value?.points as Array<{ lat: number; lon: number }>;
        return respond({ dataMode: 'synthetic_test', route: { quality: 'street', profile: 'foot', provider: 'fossgis_foot',
          fetchedAt: '2026-10-21T00:00:00Z', geometry: { type: 'LineString', coordinates: points.map(point => [point.lon, point.lat]) },
          distanceMeters: 960, durationSeconds: 720, legs: points.slice(1).map(() => ({ distanceMeters: 960, durationSeconds: 720 })),
          attribution: { text: 'FOSSGIS / OSRM Foot · synthetic_test', url: 'https://routing.openstreetmap.de/about.html' }, warnings: [] } });
      }
      return respond({ available: Boolean(options.streetRoute), provider: 'fossgis_foot', label: 'SYNTHETIC QA FOSSGIS', reason: options.streetRoute ? null : 'QA_DISABLED', localDemo: Boolean(options.streetRoute) });
    }
    if (url.pathname.startsWith('/api/memory')) return respond({ available: true, enabled: false, profile: null, messages: [], visits: [], expiresAt: null,
      consents: { profile: null, dialogue: null, ai_transfer: null, visits: null }, ...(request.method() === 'DELETE' ? { deleted: true } : {}) });
    if (url.pathname === '/api/session/data') return respond({ deleted: true });
    // A new media/provider path must be explicitly mocked after its contract is
    // confirmed; until then fail closed, never route to the live Vite proxy.
    return respond({ error: { code: 'QA_OFFLINE_UNHANDLED_API' } }, 503);
  });
  return submitted;
}

async function openRussian(page: Page) {
  await page.goto('/');
  await page.getByRole('main', { name: 'Language selection' }).getByRole('button', { name: 'Русский', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Выбрать свой вайб', exact: true })).toBeEnabled();
}
async function conditions(page: Page) {
  await openRussian(page);
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toBeVisible();
}
async function feed(page: Page) {
  await conditions(page);
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
}
async function tapTarget(locator: Locator, minimum = 44) {
  const box = await locator.boundingBox(); expect(box).not.toBeNull();
  expect(box!.width, `${await locator.getAttribute('aria-label')} width`).toBeGreaterThanOrEqual(minimum);
  expect(box!.height, `${await locator.getAttribute('aria-label')} height`).toBeGreaterThanOrEqual(minimum);
}
async function viewportFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const app = page.locator('[data-screen]');
  // visualViewport resize arrives asynchronously after Playwright changes the
  // layout viewport. Wait for that frame, without tolerating an oversized app.
  await expect.poll(async () => { const box = await app.boundingBox(); return box ? box.y + box.height : Infinity; }).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
  expect((await app.boundingBox())!.y).toBeGreaterThanOrEqual(-1);
}
async function dockIsSafe(page: Page) {
  const dock = page.getByRole('navigation', { name: 'Основная навигация' });
  await expect(dock).toBeVisible(); const box = await dock.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height - SAFE.bottom + 1);
  for (const name of ['Для тебя', 'Поиск', 'Карта', 'Профиль']) await tapTarget(dock.getByRole('button', { name, exact: true }));
  const highlight = await dock.locator('[class*="dockHighlight"]').boundingBox();
  expect(highlight!.height).toBeGreaterThanOrEqual(44);
}

test('shared PilotApp: full 15-swipe path, synthetic safe-area and undo', async ({ page }) => {
  const requests = await installFixtures(page);
  await openRussian(page);
  await page.screenshot({ path: `${imageDirectory}/welcome-430.png` });
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  const back = page.getByRole('button', { name: 'Вернуться', exact: true });
  expect((await back.boundingBox())!.y).toBeGreaterThanOrEqual(SAFE.top);
  const card = page.getByTestId('swipe-card');
  expect(Math.round((await card.boundingBox())!.width)).toBe(430);
  await card.press('ArrowRight');
  await expect(card).toHaveAccessibleName(/, 2 из 15/);
  await page.getByRole('button', { name: 'Отменить выбор', exact: true }).click();
  await expect(card).toHaveAccessibleName(/, 1 из 15/);
  for (let index = 0; index < 15; index++) await card.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
  await viewportFits(page); await dockIsSafe(page);
  await page.screenshot({ path: `${imageDirectory}/feed-430.png` });
  expect(requests.some(entry => entry.path === '/api/chat')).toBe(true);
  expect(requests.some(entry => entry.value?.useAI === true || entry.value?.googleConsent === true || entry.path === '/api/routing' && entry.value !== null)).toBe(false);
});

test('GPS denial and manual-start cancel return to original conditions without invented origin', async ({ page }) => {
  const requests = await installFixtures(page); await conditions(page);
  await page.getByRole('button', { name: 'Поделиться геопозицией', exact: true }).click();
  await expect(page.getByText(/Доступ не получен/)).toBeVisible();
  await page.getByRole('button', { name: 'Выбрать старт на карте', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Выбери точку старта', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить без изменения', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
  const discovery = requests.find(entry => entry.path === '/api/chat');
  expect(discovery).toBeDefined();
  expect((discovery?.value?.context as { origin: unknown }).origin).toBeNull();
});

test('dock navigation, detail/plan back, chat composition and settings remain tappable above Home Indicator', async ({ page }) => {
  await installFixtures(page); await feed(page);
  const dock = page.getByRole('navigation', { name: 'Основная навигация' });
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Маршрут по Астане', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'На карту', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Город на карте', exact: true })).toBeVisible();
  await dock.getByRole('button', { name: 'Поиск', exact: true }).click();
  const composer = page.getByLabel('Сообщение помощнику', { exact: true });
  await composer.fill('SYNTHETIC QA: тихое место');
  const send = page.getByRole('button', { name: 'Отправить сообщение', exact: true }); await tapTarget(send);
  const inputBounds = await composer.boundingBox(), dockBounds = await dock.boundingBox();
  expect(inputBounds!.y + inputBounds!.height).toBeLessThanOrEqual(dockBounds!.y + 1);
  await send.click(); await expect(page.getByRole('log')).toContainText('SYNTHETIC QA: тихое место');
  await expect(page.getByRole('status').filter({ hasText: 'Проверяем каталог и ограничения' })).toHaveCount(0);
  await page.screenshot({ path: `${imageDirectory}/chat-430.png` });
  await dock.getByRole('button', { name: 'Профиль', exact: true }).click();
  await page.getByRole('button', { name: 'Настройки и память', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'QETTYQ — на главную', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible();
  await dockIsSafe(page);
});

test('safe-area is applied once; primary header, filter and slider targets meet 44px', async ({ page }) => {
  await installFixtures(page); await feed(page);
  const header = page.locator('[data-screen] > header'), bounds = await header.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(SAFE.top);
  expect(bounds!.y).toBeLessThanOrEqual(SAFE.top + 2);
  await tapTarget(header.getByRole('button', { name: 'Астана', exact: true }));
  await tapTarget(page.getByRole('group', { name: 'Места', exact: true }).getByRole('button').nth(1));
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  for (const name of ['Все места', 'Прогулки', 'Кофе', 'Театры']) await tapTarget(page.getByRole('button', { name, exact: true }));
});

test('large-text fixture and landscape keep the app navigable with internal scroll and reduced motion', async ({ page }) => {
  await installFixtures(page); await feed(page);
  await page.addStyleTag({ content: 'html { font-size: 125% !important; } [data-screen] p,[data-screen] label,[data-screen] button,[data-screen] input { font-size: 18px !important; }' });
  await viewportFits(page); await dockIsSafe(page);
  await page.screenshot({ path: `${imageDirectory}/large-text-430.png` });
  await page.setViewportSize({ width: 932, height: 430 });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--qettyq-safe-area-top', '0px');
    document.documentElement.style.setProperty('--qettyq-safe-area-bottom', '21px');
    document.documentElement.style.setProperty('--qettyq-safe-area-left', '59px');
    document.documentElement.style.setProperty('--qettyq-safe-area-right', '59px');
  });
  await viewportFits(page);
  const dock = page.getByRole('navigation'); await expect(dock).toBeVisible();
  await dock.getByRole('button', { name: 'Профиль', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Твой QETTYQ', exact: true })).toBeVisible();
  const settings = page.getByRole('button', { name: 'Настройки и память', exact: true });
  await settings.scrollIntoViewIfNeeded(); await settings.click();
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.screenshot({ path: `${imageDirectory}/landscape-large-text.png` });
});

test('provider explanations live in settings, not chat; photo attribution/error fallback and opt-out remain correct', async ({ page }) => {
  const requests = await installFixtures(page, { googlePhoto: true, aiAvailable: true }); await feed(page);
  await expect(page.getByTestId('google-place-photo')).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Поиск', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Что придумаем?', exact: true })).toBeVisible();
  const disclosure = page.getByText('Поиск может использовать OpenAI и Google: им передаётся запрос, но не точная геопозиция. История хранится на устройстве; серверная память включается отдельно.', { exact: true });
  await expect(disclosure).toHaveCount(0);
  expect(requests.some(entry => entry.value?.googleConsent === true || entry.value?.useAI === true)).toBe(false);
  await page.getByLabel('Сообщение помощнику', { exact: true }).fill('SYNTHETIC QA café');
  await page.getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
  const results = page.getByRole('region', { name: 'Результаты Google Maps' });
  await expect(results).toBeVisible();
  const photo = page.getByTestId('google-place-photo'); await photo.scrollIntoViewIfNeeded();
  const headerAfterPhotoScroll = await page.locator('[data-screen] > header').boundingBox();
  expect(headerAfterPhotoScroll!.y).toBeGreaterThanOrEqual(SAFE.top);
  await expect(photo.getByRole('link', { name: 'SYNTHETIC QA photo author', exact: true })).toHaveAttribute('href', 'https://www.google.com/maps/contrib/synthetic-qa');
  await expect(photo.getByRole('link', { name: 'Фото в Google Maps', exact: true })).toHaveAttribute('href', 'https://www.google.com/maps/place/synthetic-qa');
  await page.screenshot({ path: `${imageDirectory}/google-photo-mocked-430.png` });
  await photo.getByRole('img').dispatchEvent('error'); await expect(photo).toHaveCount(0);
  await expect(results.getByRole('heading', { name: 'SYNTHETIC QA café', exact: true })).toBeVisible();
  await expect(results.getByRole('link', { name: 'Открыть в Google Maps', exact: true })).toHaveAttribute('href', 'https://www.google.com/maps/place/synthetic-qa');
  await expect(disclosure).toHaveCount(0);
  await page.locator('[data-screen] > header').getByRole('button', { name: 'Настройки', exact: true }).click();
  const settings = page.getByRole('region', { name: 'Настройки помощника', exact: true });
  await expect(settings).toContainText('OpenAI получает запрос');
  await expect(settings).toContainText('Google получает поисковый запрос');
  await expect(settings.getByRole('checkbox', { name: 'Умный ответ OpenAI', exact: true })).toBeChecked();
  const google = settings.getByRole('checkbox', { name: 'Поиск заведений и фото Google', exact: true });
  await expect(google).toBeChecked(); await google.uncheck();
  await settings.getByRole('button', { name: 'Вернуться к разговору', exact: true }).click(); await expect(results).toHaveCount(0);
  expect(requests.filter(entry => entry.path === '/api/chat' && entry.value?.googleConsent === true)).toHaveLength(1);
  expect(requests.filter(entry => entry.path.startsWith('/api/memory') && entry.method !== 'GET')).toHaveLength(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(page.getByTestId('google-place-photo')).toHaveCount(0);
  await expect(page.getByText('SYNTHETIC QA café', { exact: true })).toHaveCount(0);
});

test('route collapsed/expanded portrait and landscape preserve reachable scroll details and primary navigation', async ({ page }) => {
  await installFixtures(page, { streetRoute: true }); await conditions(page);
  await page.getByRole('button', { name: 'Поделиться геопозицией', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  const plan = page.getByRole('region', { name: 'План маршрута', exact: true });
  const start = plan.getByRole('link', { name: 'Начать маршрут', exact: true });
  const bubble = page.getByRole('button', { name: 'Развернуть план маршрута', exact: true });
  await expect(plan).toHaveCount(0); await tapTarget(bubble);
  await page.screenshot({ path: `${imageDirectory}/route-collapsed-430.png` });
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click(); await showRouteOptions(page);
  await expect(start).toHaveAttribute('href', /2gis\.ru\/directions\/tab\/pedestrian\/points\/71\.4304,51\.1282\|/);
  const external = plan.getByText('Выбранные точки передаются провайдеру только при расчёте или открытии навигации.', { exact: false });
  await external.scrollIntoViewIfNeeded(); await expect(external).toBeVisible();
  await expect(start).toBeVisible();
  await page.screenshot({ path: `${imageDirectory}/route-expanded-430.png` });
  await page.setViewportSize({ width: 932, height: 430 });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--qettyq-safe-area-top', '0px');
    document.documentElement.style.setProperty('--qettyq-safe-area-bottom', '21px');
    document.documentElement.style.setProperty('--qettyq-safe-area-left', '59px');
    document.documentElement.style.setProperty('--qettyq-safe-area-right', '59px');
  });
  await viewportFits(page); await external.scrollIntoViewIfNeeded(); await expect(external).toBeVisible();
  const mapCredit = page.locator('.maplibregl-ctrl-attrib a[href*="openstreetmap.org/copyright"], .leaflet-control-attribution a[href*="openstreetmap.org/copyright"]').first();
  await expect(mapCredit).toBeVisible();
  expect(await mapCredit.evaluate(element => {
    const box = element.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top === element || element.contains(top);
  }), 'landscape copyright link must remain above the map and outside the expanded sheet').toBe(true);
  const copyright = await mapCredit.boundingBox(), expandedSheet = await plan.boundingBox();
  expect(copyright!.x + copyright!.width).toBeLessThanOrEqual(expandedSheet!.x);
  await expect(start).toBeVisible(); await tapTarget(start);
  const button = await start.boundingBox(), dock = await page.getByRole('navigation').boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(dock!.y);
  await page.screenshot({ path: `${imageDirectory}/route-expanded-landscape.png` });
  await plan.getByRole('button', { name: 'Свернуть план маршрута', exact: true }).click();
  await expect(plan).toHaveCount(0);
  await expect(bubble).toBeVisible(); await tapTarget(bubble);
  expect((await bubble.boundingBox())!.y + (await bubble.boundingBox())!.height).toBeLessThanOrEqual(dock!.y);
  await page.screenshot({ path: `${imageDirectory}/route-collapsed-landscape.png` });
});

test('visible enabled controls across initial flow and settings have at least 44px touch geometry', async ({ page }) => {
  await installFixtures(page); await openRussian(page);
  const failures: string[] = [];
  async function audit(screen: string) {
    failures.push(...await page.locator('[data-screen] button').evaluateAll((buttons, label) => buttons.flatMap(button => {
      const box = button.getBoundingClientRect(), style = getComputedStyle(button);
      if (!(button instanceof HTMLButtonElement) || button.disabled || style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || box.height === 0
        || box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth) return [];
      // Swipe exposes keyboard/screen-reader alternatives, deliberately clipped
      // rather than visible touch buttons. Do not count those as tap targets.
      if (style.clipPath === 'inset(50%)' || style.clip === 'rect(0px, 0px, 0px, 0px)') return [];
      return box.width < 44 || box.height < 44 ? [`${label}: ${button.getAttribute('aria-label') ?? button.textContent?.trim()} (${box.width}×${box.height})`] : [];
    }), screen));
  }
  await audit('welcome');
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click(); await audit('swipe');
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click(); await audit('conditions');
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Для тебя', exact: true })).toBeVisible(); await audit('feed');
  const dock = page.getByRole('navigation');
  await dock.getByRole('button', { name: 'Поиск', exact: true }).click(); await audit('chat');
  await dock.getByRole('button', { name: 'Профиль', exact: true }).click(); await audit('profile');
  await page.getByRole('button', { name: 'Настройки и память', exact: true }).click(); await audit('settings');
  expect(failures).toEqual([]);
});

test('feed scrolls beneath stable glass header/dock while city and final controls remain readable and tappable', async ({ page }) => {
  await installFixtures(page); await feed(page);
  const header = page.locator('[data-screen] > header'), scroller = page.getByRole('main', { name: 'Персональная лента' });
  const dock = page.getByRole('navigation'), before = await header.boundingBox(), dockBefore = await dock.boundingBox();
  const scrollerBounds = await scroller.boundingBox();
  expect(scrollerBounds!.y).toBe(0);
  expect(scrollerBounds!.y + scrollerBounds!.height).toBe(932);
  const city = header.getByRole('button', { name: 'Астана', exact: true });
  const glass = await header.evaluate(element => getComputedStyle(element).backdropFilter);
  expect(glass).toBe('none');
  expect(await city.evaluate(element => getComputedStyle(element).backdropFilter)).toContain('blur(');
  const cityFill = await city.evaluate(element => getComputedStyle(element).getPropertyValue('-webkit-text-fill-color'));
  expect(cityFill).not.toMatch(/rgba?\(255,\s*255,\s*255/u);
  const [red, green, blue] = cityFill.match(/[\d.]+/gu)!.map(Number);
  expect(red).toBeLessThan(100); expect(blue).toBeLessThanOrEqual(green);
  await scroller.evaluate(element => { element.scrollTop = 240; });
  expect(await scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect((await header.boundingBox())!.y).toBe(before!.y);
  expect((await dock.boundingBox())!.y).toBe(dockBefore!.y);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const logo = header.getByRole('button', { name: 'QETTYQ — на главную', exact: true });
  expect(await logo.evaluate(element => {
    const box = element.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top === element || element.contains(top);
  })).toBe(true);
  await page.screenshot({ path: `${imageDirectory}/feed-under-glass-scroll-430.png` });
  const refresh = scroller.getByRole('button', { name: 'Обновить афишу', exact: true });
  await refresh.scrollIntoViewIfNeeded();
  // Browser scrollIntoView only knows viewport edges, not fixed transparent
  // chrome. The user's final scroll must still reveal the last control.
  await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
  const refreshBox = await refresh.boundingBox();
  expect(refreshBox!.y + refreshBox!.height).toBeLessThanOrEqual(dockBefore!.y);
  await refresh.click(); await viewportFits(page);
  await scroller.evaluate(element => { element.scrollTop = 0; });
  await scroller.getByRole('article').first().getByRole('button', { name: 'Сохранить', exact: true }).click();
  const banner = page.getByRole('status').filter({ hasText: 'Сохранено для будущих планов' });
  await expect(banner).toBeVisible();
  const bannerBounds = await banner.boundingBox(), headerBounds = await header.boundingBox();
  expect(bannerBounds!.y).toBeGreaterThanOrEqual(headerBounds!.y + headerBounds!.height);
  expect(await banner.evaluate(element => {
    const box = element.getBoundingClientRect(), top = document.elementFromPoint(box.x + 24, box.y + box.height / 2);
    return top === element || element.contains(top);
  })).toBe(true);
  await page.screenshot({ path: `${imageDirectory}/feed-glass-banner-430.png` });
  await banner.getByRole('button', { name: 'Закрыть уведомление', exact: true }).click();
  await expect(banner).toHaveCount(0);
});

test('native-inset expanded route keeps mandatory routing credit exposed after explicitly consented synthetic route', async ({ page }) => {
  const requests = await installFixtures(page, { streetRoute: true }); await conditions(page);
  await page.getByRole('button', { name: 'Поделиться геопозицией', exact: true }).click();
  await expect(page.getByText('Старт выбран. Точка хранится только до закрытия страницы.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click(); await showRouteOptions(page);
  const credit = page.getByRole('link', { name: 'FOSSGIS / OSRM Foot · synthetic_test', exact: true });
  await expect(credit).toBeVisible();
  expect(await credit.evaluate(element => {
    const box = element.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top === element || element.contains(top);
  }), 'mandatory route credit must not sit underneath expanded sheet').toBe(true);
  expect(requests.filter(entry => entry.path === '/api/routing' && entry.value !== null)).toHaveLength(1);
  await page.screenshot({ path: `${imageDirectory}/route-street-credit-native-fixture.png` });
});

test('first-send settings opt-out persists without enabling server memory and two-turn dating history reaches the bounded request', async ({ page }) => {
  const requests = await installFixtures(page, { aiAvailable: true }); await feed(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Поиск', exact: true }).click();
  await page.locator('[data-screen] > header').getByRole('button', { name: 'Настройки', exact: true }).click();
  const settings = page.getByRole('region', { name: 'Настройки помощника', exact: true });
  const ai = settings.getByRole('checkbox', { name: 'Умный ответ OpenAI', exact: true }), google = settings.getByRole('checkbox', { name: 'Поиск заведений и фото Google', exact: true });
  await expect(ai).toBeChecked(); await expect(google).toBeChecked(); await ai.uncheck(); await google.uncheck();
  for (const name of ['Предпочтения', 'Диалог', 'Память для AI', 'Подтверждённые посещения']) {
    await expect(page.getByRole('region', { name: 'Серверная память', exact: true }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
  }
  await settings.getByRole('button', { name: 'Вернуться к разговору', exact: true }).click();
  const input = page.getByLabel('Сообщение помощнику', { exact: true });
  for (const text of ['Идея для свидания', 'В пятницу вечером, вдвоём. Без алкоголя.']) {
    await input.fill(text); await page.getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
    await expect(page.getByRole('log')).toContainText(text);
    await expect(page.getByRole('status').filter({ hasText: 'Проверяем каталог и ограничения' })).toHaveCount(0);
  }
  const turns = requests.filter(entry => entry.path === '/api/chat' && ['Идея для свидания', 'В пятницу вечером, вдвоём. Без алкоголя.'].includes(String(entry.value?.text)));
  expect(turns).toHaveLength(2);
  for (const turn of turns) expect(turn.value).toMatchObject({ useAI: false, googleConsent: false });
  expect(turns[1].value?.history).toEqual(expect.arrayContaining([{ role: 'user', text: 'Идея для свидания' }, expect.objectContaining({ role: 'assistant' })]));
  expect(new TextEncoder().encode(JSON.stringify(turns[1].value)).byteLength).toBeLessThanOrEqual(14 * 1024);
  expect(requests.filter(entry => entry.path.startsWith('/api/memory') && entry.method !== 'GET')).toHaveLength(0);
  await page.reload(); await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Профиль', exact: true }).click();
  await page.getByRole('button', { name: 'Настройки и память', exact: true }).click();
  await expect(ai).not.toBeChecked(); await expect(google).not.toBeChecked();
  await settings.getByRole('button', { name: 'Вернуться к разговору', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('В пятницу вечером, вдвоём. Без алкоголя.');
});

test('chat composer and navigation share one glass panel; synthetic visualViewport keyboard shrink keeps input in the visible viewport', async ({ page }) => {
  await installFixtures(page); await feed(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Поиск', exact: true }).click();
  const footer = page.locator('[data-screen] > [class*="chatDockPanel"]'), input = page.getByLabel('Сообщение помощнику', { exact: true });
  await expect(footer.getByRole('navigation')).toBeVisible();
  expect(await footer.evaluate(element => getComputedStyle(element).backdropFilter)).toContain('blur(');
  const inputBox = await input.boundingBox(), navBox = await footer.getByRole('navigation').boundingBox();
  expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  expect(navBox!.y - inputBox!.y - inputBox!.height).toBeLessThanOrEqual(12);
  await page.screenshot({ path: `${imageDirectory}/chat-joined-dock-first-send-430.png` });
  // Synthetic browser event, NOT proof of an actual WKWebView keyboard.
  await input.focus();
  await page.evaluate(() => {
    if (!window.visualViewport) throw new Error('visualViewport fixture unavailable');
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 560 });
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await expect(page.locator('[data-screen]')).toHaveAttribute('data-keyboard-open', 'true');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  // React's visualViewport update can precede the browser's resized layout
  // frame. Keep the same strict boundary and wait for actual geometry, not
  // merely the data attribute or hidden nav.
  await expect.poll(async () => { const box = await input.boundingBox(); return box ? box.y + box.height : Infinity; },
    { message: 'input must stay above synthetic keyboard boundary560 after viewport layout' }).toBeLessThanOrEqual(560);
  const keyboardInput = await input.boundingBox();
  expect(keyboardInput!.y + keyboardInput!.height, 'input must stay above synthetic keyboard boundary560').toBeLessThanOrEqual(560);
  await input.fill('SYNTHETIC QA keyboard text'); await expect(input).toHaveValue('SYNTHETIC QA keyboard text');
  await page.screenshot({ path: `${imageDirectory}/chat-synthetic-keyboard-560.png` });
});
