import { expect, type Page, test } from "@playwright/test";

type Reaction = "Интересно" | "Не сейчас";

async function openDiscovery(
  page: Page,
  options: { goal?: string; minutes?: number; budget?: number } = {},
) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /2 минуты на выбор/ })).toBeVisible();

  await page.getByRole("button", { name: options.goal ?? "Попробовать новое" }).click();
  await expect(page.getByRole("heading", { name: /Сколько времени/ })).toBeVisible();

  if (options.minutes !== undefined) {
    await page.locator('input[type="range"]').fill(String(options.minutes));
  }
  if (options.budget !== undefined) {
    await page.getByLabel("Бюджет на человека").fill(String(options.budget));
  }

  await page.getByRole("button", { name: /Перейти к 15 свайпам/ }).click();
  await expect(page.getByText("1/15", { exact: true })).toBeVisible();
}

async function reactFifteenTimes(page: Page, reactions: Reaction[]) {
  expect(reactions).toHaveLength(15);
  for (let index = 0; index < reactions.length; index += 1) {
    await expect(page.getByText(`${index + 1}/15`, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: reactions[index], exact: true }).click();
  }
}

test("основной путь: цель → ограничения → 15 реакций → результаты со snapshot-источниками", async ({ page }) => {
  await openDiscovery(page, { minutes: 120, budget: 5_000 });

  const recommendationRequest = page.waitForRequest((request) =>
    request.url().endsWith("/api/recommendations") && request.method() === "POST",
  );
  await reactFifteenTimes(page, Array.from({ length: 15 }, (_, index) => (index % 3 === 0 ? "Интересно" : "Не сейчас") as Reaction));

  const request = await recommendationRequest;
  expect(request.postDataJSON()).toMatchObject({
    goal: "new",
    minutes: 120,
    budget: 5_000,
  });

  await expect(page.getByRole("heading", { name: "Для тебя" })).toBeVisible();

  const hero = page.locator(".feed-hero");
  await expect(hero).toBeVisible();
  await expect(hero.getByText("Иллюстрация категории", { exact: true })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Источник: OpenStreetMap contributors/ })).toHaveAttribute(
    "href",
    /^https:\/\/www\.openstreetmap\.org\//,
  );
  await expect(hero.getByRole("button", { name: "Подробнее" })).toBeVisible();
  const save = hero.getByRole("button", { name: "Сохранить" });
  await save.click();
  await expect(hero.getByRole("button", { name: "Убрать из сохранённых" })).toHaveAttribute("aria-pressed", "true");

  const dock = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(dock.getByRole("button")).toHaveCount(4);
  await expect(dock.getByRole("button", { name: "Для тебя" })).toHaveAttribute("aria-current", "page");
  await dock.getByRole("button", { name: "Поиск" }).click();
  await expect(page.getByRole("heading", { name: "Что ищем?" })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Поиск" })).toHaveAttribute("aria-current", "page");
});

test("жёсткое ограничение времени даёт честную пустую выдачу без автоматического ослабления", async ({ page }) => {
  await openDiscovery(page, { goal: "Погулять", minutes: 30, budget: 0 });
  await reactFifteenTimes(page, Array.from({ length: 15 }, () => "Не сейчас" as Reaction));

  await expect(page.getByRole("heading", { name: "По этим условиям вариантов не нашли" })).toBeVisible();
  await expect(page.getByText(/Ограничения не были ослаблены автоматически/)).toBeVisible();
  await expect(page.locator(".empty").getByRole("button", { name: "Изменить условия" })).toBeVisible();
  await expect(page.locator(".feed-hero")).toHaveCount(0);
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
  await reactFifteenTimes(page, Array.from({ length: 15 }, (_, index) => (index === 14 ? "Интересно" : "Не сейчас") as Reaction));

  await expect(page.getByText("Не удалось получить варианты", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Для тебя" })).toHaveCount(0);
  await expect(page.getByText("15/15", { exact: true })).toBeVisible();
});

test("mobile viewport и reduced motion: управление доступно кнопками без горизонтального overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Попробовать новое" })).toBeVisible();

  await page.getByRole("button", { name: "Настройки" }).click();
  const settings = page.getByRole("dialog", { name: "Настройки" });
  await expect(settings).toBeVisible();
  await expect(settings.getByRole("button", { name: "RU" })).toHaveAttribute("aria-pressed", "true");
  await settings.getByRole("button", { name: "Закрыть" }).click();
  await expect(settings).toBeHidden();

  const reducedMotion = await page.locator(".quick-intents button").first().evaluate((element) => {
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
  await page.getByRole("button", { name: /Перейти к 15 свайпам/ }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /Перейти к 15 свайпам/ })).toBeVisible();
  await page.getByRole("button", { name: /Перейти к 15 свайпам/ }).click();
  await expect(page.getByRole("button", { name: "Не сейчас" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Интересно" })).toBeVisible();
});
