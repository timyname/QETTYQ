import { type Page } from '@playwright/test';

/** The compact route opens from its circle; parameters are a separate explicit
 * disclosure. Keep legacy geometry/arithmetic checks, navigating to their new home. */
export async function showRouteOptions(page: Page) {
  const options = page.locator('#route-details > details');
  if (await options.count() && !(await options.evaluate(element => element.hasAttribute('open')))) {
    await options.locator(':scope > summary').click();
  }
}
