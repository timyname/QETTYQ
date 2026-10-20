import { expect, test } from "@playwright/test";
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

test.beforeEach(async ({ page }) => {
  await installOfflineTestGuards(page);
  await page.route('**/api/events', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], dataMode: 'unavailable', freshness: 'unavailable', fetchedAt: null }) }));
});

test("чат предлагает контекст, хранит диалог после reload и удаляет только после подтверждения", async ({ page }) => {
  const providerRequests: string[] = [];
  page.on("request", request => {
    if (/api\.openai|anthropic|generativelanguage|chat\/completions|\/responses/i.test(request.url())) providerRequests.push(request.url());
  });
  await openRussianApp(page);
  await expect(page.getByRole("button", { name: "Выбрать свой вайб" })).toBeEnabled();
  await page.getByRole("button", { name: "QETTYQ — на главную" }).click();
  await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("button", { name: "Поиск", exact: true }).click();
  const message = "Хочу погулять 90 минут до 3 000 ₸";
  await page.getByLabel("Сообщение помощнику").fill(message);
  await page.getByRole("button", { name: "Отправить сообщение" }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText(/Из запроса: 90 мин · 3.000 ₸. Применить эти условия/)).toBeVisible();
  await page.getByRole("button", { name: "Применить условия" }).click();
  await expect(page.getByRole("status")).toContainText("Условия обновлены.");
  expect(providerRequests).toEqual([]);

  await page.reload();
  await expect(page.getByRole("button", { name: "Выбрать свой вайб" })).toBeEnabled();
  await page.getByRole("button", { name: "QETTYQ — на главную" }).click();
  await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("button", { name: "Поиск", exact: true }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText("QETTYQ · поиск по каталогу", { exact: true })).toBeVisible();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("qettyq.local-memory.v1") ?? "null"));
  expect(restored.profile).toMatchObject({ goal: "walk", minutes: 90, budget: 3000 });
  expect(restored).not.toHaveProperty("origin");
  expect(restored.profile).not.toHaveProperty("origin");

  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByRole("button", { name: "Удалить мои данные", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Удалить память QETTYQ?" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Оставить данные" }).click();
  expect(await page.evaluate(() => localStorage.getItem("qettyq.local-memory.v1"))).toContain(message);
  await page.getByRole("button", { name: "Удалить мои данные", exact: true }).click();
  await confirmation.getByRole("button", { name: "Да, удалить данные" }).click();
  await expect(page.getByRole('main', { name: 'Language selection' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("qettyq.local-memory.v1"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('qettyq.language.v1'))).toBeNull();
  expect(providerRequests).toEqual([]);
});
