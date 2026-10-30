import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');

test.describe('Unauthenticated and Authentication Guard Flows', () => {
  test('unauthenticated account access redirects to login', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });

  test('locked account cannot enter dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type=email]').fill('locked.user@gmail.com');
    await page.locator('input[type=password]').fill('EquiFlow@2026');
    await page.locator('button[type=submit]').click();
    await expect(page.getByRole('alert')).toContainText(/locked|bị khóa/i);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});

test.describe('Manager Account Management Access', () => {
  test.use({ storageState: MANAGER_AUTH });

  test('manager opens accounts and retains the session on reload', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/accounts');
    await expect(page.getByText('manager@gmail.com', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByText('manager@gmail.com', { exact: false })).toBeVisible();
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflows).toBe(false);
    expect(errors).toEqual([]);
  });
});

test.describe('Trainer Forbidden from Account Management', () => {
  test.use({ storageState: TRAINER_AUTH });

  test('trainer is denied account management', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('manager@gmail.com', { exact: true })).toHaveCount(0);
  });
});
