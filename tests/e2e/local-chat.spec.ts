import { expect, test } from "@playwright/test";

test("локальный чат извлекает контекст, переживает reload и удаляется без provider request", async ({ page }) => {
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (/openai|anthropic|gemini|chat\/completions|\/responses/i.test(request.url())) providerRequests.push(request.url());
  });

  await page.goto("/");
  const input = page.getByLabel("Сообщение помощнику");
  await input.fill("Хочу погулять 90 минут до 3 000 ₸");
  await page.getByRole("button", { name: "Отправить" }).click();

  await expect(page.getByText(/Понял контекст: погулять, 90 мин, до 3.000 ₸/)).toBeVisible();
  await expect(page.getByText(/90 мин · до 3.000 ₸/)).toBeVisible();
  expect(providerRequests).toEqual([]);

  await page.reload();
  await expect(page.getByText("Хочу погулять 90 минут до 3 000 ₸", { exact: true })).toBeVisible();
  await expect(page.getByText(/Понял контекст: погулять, 90 мин, до 3.000 ₸/)).toBeVisible();

  await page.getByRole("button", { name: /Очистить память/ }).click();
  await expect(page.getByText(/Опишите план своими словами/)).toBeVisible();
  const persisted = await page.evaluate(() => window.localStorage.getItem("qettyq.local-memory.v1"));
  expect(persisted).toBeNull();
});
