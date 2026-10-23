import { expect, test } from '@playwright/test';
import { installOfflineTestGuards, openRussianApp } from './offline-test-setup';

test.beforeEach(async ({ page }) => { await installOfflineTestGuards(page); });

for (const [width, height] of [[360, 844], [390, 844], [430, 844], [1280, 720], [360, 600]]) {
  test(`visible swipe actions stay usable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openRussianApp(page);
    await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
    const card = page.getByTestId('swipe-card');
    const skip = page.getByRole('button', { name: 'Не сейчас', exact: true });
    const like = page.getByRole('button', { name: 'Интересно', exact: true });
    const title = card.getByRole('heading');
    await expect(card).toHaveAccessibleName(/, 1 из 15/);
    for (const action of [skip, like]) {
      await expect(action).toBeVisible();
      const bounds = await action.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      const heading = await title.boundingBox();
      expect(heading!.y + heading!.height).toBeLessThan(bounds!.y);
    }
    await like.click();
    await expect(card).toHaveAccessibleName(/, 2 из 15/);
    await skip.click();
    await expect(card).toHaveAccessibleName(/, 3 из 15/);
    await page.getByRole('button', { name: 'Отменить выбор', exact: true }).click();
    await expect(card).toHaveAccessibleName(/, 2 из 15/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await page.screenshot({ path: `output/playwright/glm-ui/swipe-${width}x${height}.png` });
  });
}

test('one liked culture card is labelled as two preference categories, not two likes', async ({ page }) => {
  await openRussianApp(page);
  await page.getByRole('button', { name: 'Выбрать свой вайб', exact: true }).click();
  await page.getByRole('button', { name: 'Интересно', exact: true }).click();
  await page.getByRole('button', { name: 'Пропустить подбор интересов', exact: true }).click();
  await page.getByRole('button', { name: 'К условиям подборки', exact: true }).click();
  await page.getByRole('button', { name: 'Показать подборку', exact: true }).click();
  await page.getByRole('button', { name: 'Профиль', exact: true }).click();
  await expect(page.getByText('Категорий в предпочтениях: 2', { exact: true })).toBeVisible();
});
