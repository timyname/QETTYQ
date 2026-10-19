import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await desktop.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
await desktop.waitForTimeout(800);
await desktop.screenshot({ path: "exports/screenshots/start-desktop.png", fullPage: false });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
await mobile.getByRole("button", { name: "Попробовать новое" }).click();
await mobile.getByRole("heading", { name: /Сколько времени/ }).waitFor();
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: "exports/screenshots/limits-mobile.png", fullPage: false });
await mobile.getByRole("button", { name: /Перейти к 15 свайпам/ }).click();
for (let index = 0; index < 15; index += 1) {
  await mobile.getByRole("button", { name: "Интересно" }).click();
  if (index < 14) await mobile.getByText(`${index + 2}/15`, { exact: true }).waitFor();
}
await mobile.getByRole("heading", { name: /Подходящие варианты/ }).waitFor();
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: "exports/screenshots/results-mobile.png", fullPage: true });
await mobile.getByRole("button", { name: /Выбрать этот план/ }).first().click();
await mobile.getByRole("heading", { level: 2 }).waitFor();
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: "exports/screenshots/plan-mobile.png", fullPage: true });

await browser.close();
