import { expect, type Page, test } from "@playwright/test";
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

// Provider failures are deterministic here; real-source smoke is recorded separately.
test.beforeEach(async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.route('**/api/events', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null }) }));
});

async function openSwipes(page: Page) {
  await openRussianApp(page);
  await expect(page.getByRole("heading", { name: /Не знаешь, как/ })).toBeVisible();
  await page.getByRole("button", { name: "Выбрать свой вайб" }).click();
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 1 из 15/);
}

async function finishSwipes(page: Page) {
  for (let index = 0; index < 15; index++) {
    await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(new RegExp(`, ${index + 1} из 15`));
    await page.getByTestId("swipe-card").press(index % 3 === 0 ? "ArrowRight" : "ArrowLeft");
  }
  await expect(page.getByRole("heading", { name: /Сколько времени/ })).toBeVisible();
}

async function skipToConditions(page: Page) {
  await openSwipes(page);
  await page.getByRole("button", { name: "Пропустить подбор интересов", exact: true }).click();
  await page.getByRole("button", { name: "К условиям подборки", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Сколько времени/ })).toBeVisible();
}

test("основной путь: 15 реакций → условия → реальные карточки → детали → план и навигация", async ({ page }) => {
  await openSwipes(page);
  await finishSwipes(page);
  await page.getByLabel("Свободное время", { exact: true }).fill("120");
  await page.getByLabel("Бюджет на человека, ₸", { exact: true }).fill("5000");
  await expect(page.getByLabel('Как провести время', { exact: true })).toHaveCount(0);
  const requestPromise = page.waitForRequest(request => request.url().endsWith("/api/chat") && request.method() === "POST");
  await page.getByRole("button", { name: "Показать подборку" }).click();
  expect((await requestPromise).postDataJSON().context).toMatchObject({ goal: "new", minutes: 120, budget: 5000, origin: null });
  await expect(page.getByRole("heading", { name: "Для тебя", exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Места под твои условия' })).toBeVisible();

  const first = page.getByRole("article").first();
  await expect(first).toBeVisible();
  await expect(first.getByText("Иллюстрация категории, не фото места", { exact: true })).toBeVisible();
  await page.screenshot({ path: 'exports/screenshots/ui-review-38/feed-390.png' });
  await first.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(first.getByRole("button", { name: "Убрать из сохранённых" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: /OpenStreetMap contributors/ })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  await first.getByRole("button", { name: "Подробнее", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Перед тем как идти" })).toBeVisible();
  await expect(page.getByText(/Расписание, язык и наличие мест не подтверждены/)).toBeVisible();
  await page.screenshot({ path: 'exports/screenshots/ui-review-38/place-detail-390.png' });
  await page.getByRole("button", { name: "Оценить путь", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Твой маршрут/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Нужна точка старта" })).toBeVisible();
  await page.getByRole("button", { name: "Развернуть план маршрута" }).click();
  await expect(page.getByText("Оставшееся свободное время неизвестно.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Google Maps ↗" }).first()).toHaveAttribute("href", /destination=51\./);
  await expect(page.getByRole("link", { name: "2ГИС ↗", exact: true }).first()).toHaveAttribute("href", /^dgis:\/\/2gis.ru\/routeSearch\/rsType\/pedestrian\/to\//);
  await expect(page.getByRole("link", { name: "2ГИС в браузере ↗", exact: true }).first()).toHaveAttribute("href", /^https:\/\/2gis.kz\/astana\/search\//);
  await page.getByRole("button", { name: "QETTYQ — на главную" }).click();

  const dock = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(dock.getByRole("button")).toHaveCount(4);
  await expect(dock.getByRole("button", { name: "Для тебя", exact: true })).toHaveAttribute("aria-current", "page");
  await dock.getByRole("button", { name: "Поиск", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Что придумаем?" })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Поиск", exact: true })).toHaveAttribute("aria-current", "page");
  await dock.getByRole("button", { name: "Карта", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Город на карте" })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas, [data-map-engine="fallbackleaflet"] .leaflet-container')).toBeVisible();
  await dock.getByRole("button", { name: "Профиль", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Твой QETTYQ" })).toBeVisible();
  await page.getByRole("button", { name: "QETTYQ — на главную" }).click();
  await expect(page.getByRole("heading", { name: "Для тебя", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Для тебя', exact: true })).toHaveAttribute('aria-current', 'page');
});

test("строгий нулевой бюджет: честная пустая выдача, ограничения не ослабляются", async ({ page }) => {
  await skipToConditions(page);
  await expect(page.getByLabel('Как провести время')).toHaveCount(0);
  await page.getByLabel("Свободное время", { exact: true }).fill("30");
  await page.getByLabel("Бюджет на человека, ₸", { exact: true }).fill("0");
  await expect(page.getByRole("checkbox", { name: "Не предлагать варианты с неизвестной ценой" })).toBeChecked();
  await page.getByRole("button", { name: "Показать подборку" }).click();
  await expect(page.getByRole("heading", { name: "По этим условиям вариантов не нашли" })).toBeVisible();
  await expect(page.getByText(/Мы не ослабляем твои условия автоматически/)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Изменить условия", exact: true }).last().click();
  await expect(page.getByLabel("Бюджет на человека, ₸", { exact: true })).toHaveValue("0");
});

test("отказ chat API 503 не маскируется выдачей, условия и повтор доступны", async ({ page }) => {
  await page.route("**/api/chat", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "PROVIDER_UNAVAILABLE" } }) }));
  await skipToConditions(page);
  await page.getByRole("button", { name: "Показать подборку" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Сервис не ответил. Попробуйте ещё раз." })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Сколько времени/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Для тебя", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Показать подборку" })).toBeEnabled();
});

test("drag: переход через порог не выбирает до отпускания; возврат отменяет, undo возвращает", async ({ page }) => {
  await openSwipes(page);
  const box = await page.getByTestId("swipe-card").boundingBox();
  expect(box).not.toBeNull();
  const start = { x: box!.x + 110, y: box!.y + 300 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 140, start.y, { steps: 10 });
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 1 из 15/);
  await page.mouse.move(start.x + 12, start.y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 1 из 15/);
  await expect(page.getByRole("button", { name: "Отменить выбор" })).toBeDisabled();
  // A fresh gesture releases beyond 104px (the 390px viewport threshold is 93.6px).
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 110, start.y, { steps: 10 });
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 1 из 15/);
  await page.mouse.up();
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 2 из 15/);
  await page.getByRole("button", { name: "Отменить выбор" }).click();
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 1 из 15/);
  await expect(page.getByTestId("swipe-card")).toHaveAccessibleName(/Культура и история, 1 из 15/);
});

test("mobile и reduced motion: полноширинная карточка, доступная клавиатура, нет overflow", async ({ page }) => {
  await openSwipes(page);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => {
      const bounds = await page.getByTestId("swipe-card").boundingBox();
      return Math.round(bounds?.width ?? 0);
    }).toBe(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
  const accessibleLike = page.getByRole("button", { name: "Интересно", exact: true });
  await accessibleLike.focus();
  await expect(accessibleLike).toBeVisible();
  await accessibleLike.press("Enter");
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 2 из 15/);
  await page.getByRole("button", { name: "Отменить выбор" }).click();
  await expect(page.getByTestId('swipe-card')).toHaveAccessibleName(/, 1 из 15/);
  await page.getByRole("button", { name: "Пропустить подбор интересов", exact: true }).click();
  await expect(page.getByRole("button", { name: "К условиям подборки", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "К условиям подборки", exact: true }).click();
  await expect(page.getByRole("button", { name: "Показать подборку" })).toBeVisible();
  const maximumTransitionMs = await page.getByRole("button", { name: "Показать подборку" }).evaluate(element => Math.max(...getComputedStyle(element).transitionDuration.split(",").map(part => Number.parseFloat(part) * (part.trim().endsWith("ms") ? 1 : 1000))));
  expect(maximumTransitionMs).toBeLessThanOrEqual(1);
});

test('организатор: локальный черновик проходит форму и не отправляется на публикацию', async ({ page }) => {
  const mutations: string[] = [];
  page.on('request', request => { if (/organizer|moderation|publish/.test(request.url()) && request.method() === 'POST') mutations.push(request.url()); });
  await openRussianApp(page);
  await page.getByRole('button', { name: 'QETTYQ — на главную' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Профиль', exact: true }).click();
  await page.getByRole('button', { name: 'Моё событие', exact: true }).click();
  await page.getByRole('button', { name: 'Создать событие', exact: true }).click();
  await page.getByLabel(/Название события/).fill('Тестовый черновик — не публиковать');
  await page.getByLabel('Категория', { exact: true }).selectOption('community');
  await page.getByLabel('Организатор', { exact: true }).fill('Synthetic test');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.getByLabel('Дата', { exact: true }).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await page.getByLabel('Начало', { exact: true }).fill('18:00');
  await page.getByLabel('Или длительность', { exact: true }).fill('60');
  await page.getByLabel('Место проведения', { exact: true }).fill('Тестовая площадка — не публиковать');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await page.getByRole('button', { name: 'Бесплатно', exact: true }).click();
  await page.getByRole('button', { name: 'Русский', exact: true }).click();
  await page.getByLabel('Ссылка', { exact: true }).fill('https://example.com');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Проверьте перед сохранением' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Отправить на проверку', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Мои события', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('qettyq.organizer.v2') ?? 'null').title)).toBe('Тестовый черновик — не публиковать');
  expect(mutations).toEqual([]);
});
