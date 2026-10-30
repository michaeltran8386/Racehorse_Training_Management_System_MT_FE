import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('guest opening / lands on the static landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/landing\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/equiflow/i);
  });

  test('sign-up and login buttons open the app auth pages', async ({ page }) => {
    await page.goto('/landing.html');
    await page.locator('header').getByRole('link', { name: 'Đăng ký' }).click();
    await expect(page).toHaveURL(/\/sign-up$/);

    await page.goto('/landing.html');
    await page.locator('header').getByRole('link', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('scrolling the ride section switches the active house', async ({ page }) => {
    await page.goto('/landing.html');
    await page.locator('#ride').evaluate((s) => {
      window.scrollTo({ top: s.offsetTop + 0.5 * (s.offsetHeight - window.innerHeight), behavior: 'instant' });
    });
    await expect(page.locator('#stepNow')).toHaveText('03');
    await expect(page.locator('#panel h3')).toHaveText('Bác Sĩ Thú Y');
  });

  test('no horizontal page scroll on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/landing.html');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
