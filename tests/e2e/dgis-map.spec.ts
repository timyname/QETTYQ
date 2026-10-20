import { expect, test, type Page } from '@playwright/test';
import { pilotPlaces, publicPlace } from '../../src/server/pilot/catalog';

/** Synthetic MapGL adapter checks, not real 2GIS tiles, quota or credentials. */
const key = 'SYNTHETIC_PUBLIC_MAPGL_KEY_NOT_REAL';
const places = pilotPlaces.slice(0, 3).map(publicPlace);
test.use({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });

async function fixture(page: Page, mode: 'ready' | 'style-error' | 'sdk-error' = 'ready') {
  const submitted: Array<{ path: string; value: Record<string, unknown> | null }> = [];
  await page.addInitScript(({ mode }) => {
    if (mode === 'sdk-error') return;
    const state = { maps: [] as unknown[], lines: [] as unknown[], zoom: [] as number[], destroyed: 0 };
    const scope = window as unknown as { mapgl: unknown; dgisQa: typeof state & { click?: (point: number[]) => void; lose?: () => void; error?: (kind: string) => void } };
    scope.dgisQa = state;
    class Map {
      host: HTMLElement; canvas: HTMLCanvasElement; zoom: number; credit: HTMLAnchorElement;
      handlers: Record<string, Array<(event?: unknown) => void>> = {};
      constructor(host: HTMLElement, options: { zoom: number }) {
        this.host = host; this.zoom = options.zoom; this.canvas = document.createElement('canvas'); host.append(this.canvas);
        const credit = document.createElement('a'); credit.href = 'https://2gis.kz'; credit.textContent = '© 2ГИС · SYNTHETIC SDK'; credit.dataset.qaDgisCredit = 'true'; host.append(credit);
        this.credit = credit;
        state.maps.push(options);
        scope.dgisQa.click = point => this.handlers.click?.forEach(fn => fn({ lngLat: point }));
        scope.dgisQa.lose = () => this.canvas.dispatchEvent(new Event('webglcontextlost'));
        scope.dgisQa.error = kind => this.handlers.error?.forEach(fn => fn({ type: kind, message: 'SYNTHETIC provider error https://tiles.example/?key=SYNTHETIC_PRIVATE_PAYLOAD' }));
        setTimeout(() => this.handlers[mode === 'style-error' ? 'styleloaderror' : 'styleload']?.forEach(fn => fn()), 20);
      }
      on(type: string, fn: (event?: unknown) => void) { (this.handlers[type] ??= []).push(fn); return this; }
      project(point: number[]) { return [80 + (point[0] - 71.3) * 1200, 300 + (point[1] - 51.1) * 1200]; }
      unproject(point: number[]) { return [71.3 + (point[0] - 80) / 1200, 51.1 + (point[1] - 300) / 1200]; }
      fitBounds() { return this; }
      getZoom() { return this.zoom; }
      setZoom(zoom: number) { this.zoom = zoom; state.zoom.push(zoom); return this; }
      setRotation() { return this; } setPitch() { return this; }
      setControlsLayoutPadding(padding: { top: number; left: number }) {
        Object.assign(this.credit.style, { position: 'absolute', top: `${padding.top}px`, left: `${padding.left}px`, height: '19px', fontSize: '10px' });
      } getCanvas() { return this.canvas; }
      destroy() { state.destroyed++; this.host.replaceChildren(); }
    }
    class HtmlMarker {
      element: HTMLElement;
      constructor(map: Map, options: { html: HTMLElement; coordinates: number[] }) {
        this.element = options.html;
        const pixel = map.project(options.coordinates);
        Object.assign(this.element.style, { position: 'absolute', left: `${Math.max(20, Math.min(350, pixel[0]))}px`, top: `${Math.max(240, Math.min(550, pixel[1]))}px` });
        map.host.append(this.element);
      }
      destroy() { this.element.remove(); }
    }
    class Polyline { constructor(_map: Map, options: unknown) { state.lines.push(options); } destroy() {} }
    scope.mapgl = { Map, HtmlMarker, Polyline };
  }, { mode });
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const value = req.postData() ? req.postDataJSON() as Record<string, unknown> : null;
    submitted.push({ path: url.pathname, value });
    const respond = (json: unknown) => route.fulfill({ json });
    if (url.pathname === '/api/maps/config') return respond({ enabled: true, provider: '2gis', browserKey: key });
    if (url.pathname === '/api/session') return respond({ session: { id: 'synthetic-dgis-qa' } });
    if (url.pathname === '/api/catalog') return respond({ items: places, dataMode: 'snapshot' });
    if (url.pathname === '/api/events') return respond({ items: [], dataMode: 'unavailable', warnings: [] });
    if (url.pathname === '/api/assistant/status') return respond({ available: false, configured: false, reason: 'QA_OFFLINE' });
    if (url.pathname === '/api/memory') return respond({ available: true, enabled: false, profile: null, messages: [], visits: [], consents: {} });
    if (url.pathname === '/api/context') return respond({ context: value });
    if (url.pathname === '/api/chat') return respond({ reply: 'SYNTHETIC QA', items: places, events: [], mode: 'deterministic', dataMode: 'snapshot', context: value?.context });
    if (url.pathname === '/api/routing') {
      if (req.method() === 'GET') return respond({ available: true, provider: 'fossgis_foot', label: 'SYNTHETIC', reason: null, localDemo: true });
      const points = value?.points as Array<{ lat: number; lon: number }>;
      return respond({ dataMode: 'synthetic_test', route: { quality: 'street', profile: 'foot', provider: 'fossgis_foot', fetchedAt: '2026-10-21T00:00:00Z', geometry: { type: 'LineString', coordinates: points.map(p => [p.lon, p.lat]) }, distanceMeters: 500, durationSeconds: 400, legs: [{ distanceMeters: 500, durationSeconds: 400 }], attribution: { text: 'SYNTHETIC walking route', url: 'https://routing.openstreetmap.de/about.html' }, warnings: [] } });
    }
    if (url.pathname === '/api/plans') return respond({ plan: { id: 'synthetic-plan', stops: places.filter(p => (value?.placeIds as string[])?.includes(p.id)), totalMinutes: null, travelMinutes: null, remainingMinutes: null, distanceKm: null, visitMinutes: 30, budget: { min: null, max: null }, warnings: [], feasibility: 'uncertain', routeQuality: 'unavailable' } });
    return route.fulfill({ status: 503, json: { error: { code: 'QA_OFFLINE_UNHANDLED_API' } } });
  });
  return submitted;
}

async function conditions(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
}
async function map(page: Page) {
  await conditions(page);
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Карта', exact: true }).click();
}

test('approved MapGL mounts real adapter, keeps SDK credit and key out of visible UI', async ({ page }) => {
  await fixture(page); await map(page);
  await expect(page.locator('[data-map-engine="2gis"]')).toBeVisible();
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveAttribute('data-map-ready', 'true');
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveAttribute('data-map-theme', 'qettyq-overlays');
  await expect(page.locator('[data-qa-dgis-credit]')).toBeVisible();
  const creditBox = await page.locator('[data-qa-dgis-credit]').boundingBox();
  const toolbarBox = await page.getByRole('heading', { name: 'Город на карте', exact: true }).locator('..').boundingBox();
  const headerBox = await page.locator('header').boundingBox();
  expect(creditBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
  expect(creditBox!.y + creditBox!.height).toBeLessThanOrEqual(toolbarBox!.y);
  const options = await page.evaluate(() => (window as unknown as { dgisQa: { maps: Array<{ copyright: string }> } }).dgisQa.maps);
  expect(options[0].copyright).toBe('topLeft');
  await expect(page.getByRole('button', { name: 'Приблизить карту', exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(key);
  await page.getByRole('button', { name: 'Приблизить карту', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { dgisQa: { zoom: number[] } }).dgisQa.zoom)).toContain(14);
  const marker = page.locator('[data-map-engine="2gis"] button[aria-pressed]').first();
  await expect(marker).toBeVisible(); await marker.click({ force: true });
  await expect(page.getByRole('button', { name: 'Закрыть выбранное место', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/dgis-map/synthetic-map-ready.png' });
});

test('MapGL click sets manual origin and returns to original conditions', async ({ page }) => {
  const submitted = await fixture(page); await conditions(page);
  await page.getByRole('button', { name: 'Выбрать старт на карте', exact: true }).click();
  await expect(page.locator('[data-qa-dgis-credit]')).toBeVisible();
  await page.evaluate(() => (window as unknown as { dgisQa: { click: (point: number[]) => void } }).dgisQa.click([71.4304, 51.1282]));
  await expect(page.getByRole('heading', { name: /Сколько времени/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Убрать точку старта', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await expect.poll(() => submitted.find(entry => entry.path === '/api/chat')?.value?.context).toMatchObject({ origin: { lat: 51.1282, lon: 71.4304 } });
});

test('native copyright stays below a synthetic iPhone safe header and above map toolbar', async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.setProperty('--qettyq-safe-area-top', '58px');
    document.documentElement.style.setProperty('--qettyq-safe-area-bottom', '34px');
  }));
  await map(page);
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveAttribute('data-map-ready', 'true');
  const credit = await page.locator('[data-qa-dgis-credit]').boundingBox();
  const header = await page.locator('header').boundingBox();
  const toolbar = await page.getByRole('heading', { name: 'Город на карте', exact: true }).locator('..').boundingBox();
  expect(credit!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  expect(credit!.y + credit!.height).toBeLessThanOrEqual(toolbar!.y);
});

for (const mode of ['sdk-error', 'style-error'] as const) test(`MapGL ${mode} falls back honestly without false engine claim`, async ({ page }) => {
  await fixture(page, mode); await map(page);
  await expect(page.getByRole('status').filter({ hasText: 'Карта 2ГИС недоступна' })).toBeVisible();
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(key);
  await expect(page.getByText(/OpenStreetMap/).first()).toBeVisible();
});

test('lost WebGL context destroys MapGL then reports fallback', async ({ page }) => {
  await fixture(page); await map(page); await expect(page.locator('[data-qa-dgis-credit]')).toBeVisible();
  await page.evaluate(() => (window as unknown as { dgisQa: { lose: () => void } }).dgisQa.lose());
  await expect(page.getByRole('status').filter({ hasText: 'Карта 2ГИС недоступна' })).toBeVisible();
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { dgisQa: { destroyed: number } }).dgisQa.destroyed)).toBeGreaterThan(0);
});

for (const kind of ['invalidtilekey', 'styleloaderror', 'webglcontextlost']) test(`post-styleload SDK error ${kind} destroys MapGL without leaking provider payload`, async ({ page }) => {
  await fixture(page); await map(page);
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveAttribute('data-map-ready', 'true');
  await page.evaluate(kind => (window as unknown as { dgisQa: { error: (kind: string) => void } }).dgisQa.error(kind), kind);
  await expect(page.getByRole('status').filter({ hasText: 'Карта 2ГИС недоступна' })).toBeVisible();
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveCount(0);
  await expect(page.getByText(/OpenStreetMap/).first()).toBeVisible();
  const state = await page.evaluate(() => (window as unknown as { dgisQa: { destroyed: number; maps: unknown[] } }).dgisQa);
  expect(state.destroyed).toBeGreaterThan(0); expect(state.maps).toHaveLength(1);
  const visible = await page.locator('body').innerText();
  expect(visible).not.toContain(key); expect(visible).not.toContain('SYNTHETIC_PRIVATE_PAYLOAD'); expect(visible).not.toContain('tiles.example');
});

test('only validated street geometry creates jade route and halo on MapGL', async ({ page }) => {
  await fixture(page); await conditions(page);
  await page.getByRole('button', { name: 'Выбрать старт на карте', exact: true }).click();
  await expect(page.locator('[data-qa-dgis-credit]')).toBeVisible();
  await page.evaluate(() => (window as unknown as { dgisQa: { click: (point: number[]) => void } }).dgisQa.click([71.4304, 51.1282]));
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('article').first().getByRole('button', { name: 'Подробнее', exact: true }).click();
  await page.getByRole('button', { name: 'Оценить путь', exact: true }).click();
  await expect(page.locator('[data-qa-dgis-credit]')).toBeVisible();
  const nativeCredit = await page.locator('[data-qa-dgis-credit]').boundingBox();
  const back = await page.getByRole('button', { name: 'На карту', exact: true }).boundingBox();
  expect(nativeCredit!.y + nativeCredit!.height).toBeLessThanOrEqual(back!.y);
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveAttribute('data-route-quality', 'none');
  await page.getByRole('button', { name: 'Развернуть план маршрута', exact: true }).click();
  await page.locator('#route-details > details > summary').click();
  await page.getByRole('button', { name: 'Рассчитать путь по улицам', exact: true }).click();
  await expect(page.locator('[data-map-engine="2gis"]')).toHaveAttribute('data-route-quality', 'street');
  const lines = await page.evaluate(() => (window as unknown as { dgisQa: { lines: Array<{ color: string; width: number; coordinates: number[][] }> } }).dgisQa.lines);
  expect(lines).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#0B6E5D', width: 5 }), expect.objectContaining({ color: '#F4F6F2', width: 9 })]));
  expect(lines.at(-1)?.coordinates[0]).toEqual([71.4304, 51.1282]);
  await expect(page.getByRole('link', { name: 'SYNTHETIC walking route' })).toBeVisible();
});
