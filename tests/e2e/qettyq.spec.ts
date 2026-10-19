import { expect, type Page, test } from "@playwright/test";

type Reaction = "Интересно" | "Не сейчас";

async function openDiscovery(
  page: Page,
  options: { goal?: string; minutes?: number; budget?: number } = {},
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Как проведём/ })).toBeVisible();

  await page.getByRole("button", { name: options.goal ?? "Попробовать новое" }).click();
  await expect(page.getByRole("heading", { name: /Сколько у нас/ })).toBeVisible();

  if (options.minutes !== undefined) {
    await page.locator('input[type="range"]').fill(String(options.minutes));
  }
  if (options.budget !== undefined) {
    await page.getByLabel("Бюджет на человека").fill(String(options.budget));
  }

  await page.getByRole("button", { name: /Выбрать настроение/ }).click();
  await expect(page.getByText("1/4", { exact: true })).toBeVisible();
}

async function reactFourTimes(page: Page, reactions: Reaction[]) {
  expect(reactions).toHaveLength(4);
  for (let index = 0; index < reactions.length; index += 1) {
    await expect(page.getByText(`${index + 1}/4`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: reactions[index], exact: true }).click();
  }
}

test("основной путь: цель → ограничения → 4 реакции → результаты со snapshot-источниками", async ({ page }) => {
  await openDiscovery(page, { minutes: 120, budget: 5_000 });

  const recommendationRequest = page.waitForRequest((request) =>
    request.url().endsWith("/api/recommendations") && request.method() === "POST",
  );
  await reactFourTimes(page, ["Интересно", "Не сейчас", "Интересно", "Не сейчас"]);

  const request = await recommendationRequest;
  expect(request.postDataJSON()).toMatchObject({
    goal: "new",
    minutes: 120,
    budget: 5_000,
  });

  await expect(page.getByRole("heading", { name: /Вот что подходит сейчас/ })).toBeVisible();
  await expect(page.getByText(/AI-объяснение недоступно/)).toBeVisible();

  const resultCards = page.locator(".result-card");
  await expect(resultCards.first()).toBeVisible();
  expect(await resultCards.count()).toBeLessThanOrEqual(3);
  await expect(resultCards.first().getByRole("link", { name: /Источник: OpenStreetMap contributors/ })).toHaveAttribute(
    "href",
    /^https:\/\/www\.openstreetmap\.org\//,
  );
});

test("жёсткое ограничение времени даёт честную пустую выдачу без автоматического ослабления", async ({ page }) => {
  await openDiscovery(page, { goal: "Погулять", minutes: 30, budget: 0 });
  await reactFourTimes(page, ["Не сейчас", "Не сейчас", "Не сейчас", "Не сейчас"]);

  await expect(page.getByRole("heading", { name: "Подходящих вариантов пока нет" })).toBeVisible();
  await expect(page.getByText(/ограничения не были ослаблены автоматически/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Изменить условия" })).toBeVisible();
  await expect(page.locator(".result-card")).toHaveCount(0);
});

test("отказ recommendation API остаётся явной ошибкой и не маскируется результатами", async ({ page }) => {
  await page.route("**/api/recommendations", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "PROVIDER_UNAVAILABLE" }),
    });
  });

  await openDiscovery(page);
  await reactFourTimes(page, ["Не сейчас", "Не сейчас", "Не сейчас", "Интересно"]);

  await expect(page.getByText("Не удалось получить варианты", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Вот что подходит сейчас/ })).toHaveCount(0);
  await expect(page.getByText("4/4", { exact: true })).toBeVisible();
});

test("mobile viewport и reduced motion: управление доступно кнопками без горизонтального overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Попробовать новое" })).toBeVisible();

  const reducedMotion = await page.locator(".goal-card").first().evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration
      .split(",")
      .map((part) => Number.parseFloat(part) * (part.includes("ms") ? 1 : 1_000));
    return Math.max(...duration);
  });
  expect(reducedMotion).toBeLessThanOrEqual(1);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.getByRole("button", { name: "Попробовать новое" }).click();
  await page.getByRole("button", { name: /Выбрать настроение/ }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /Выбрать настроение/ })).toBeVisible();
  await page.getByRole("button", { name: /Выбрать настроение/ }).click();
  await expect(page.getByRole("button", { name: "Не сейчас" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Интересно" })).toBeVisible();
});
