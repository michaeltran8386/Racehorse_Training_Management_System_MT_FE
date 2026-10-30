import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');

// P1-12 SC-1.06: CM thêm giống mới, form tạo ngựa chọn được giống đó (danh mục thay cho danh sách viết cứng).
test.describe('Breed Catalog Management', () => {
  test.use({ storageState: MANAGER_AUTH });

  test('manager adds a breed and the horse form offers it', async ({ page }) => {
    await page.goto('/catalogs/breeds');
    await expect(page.getByRole('heading', { name: 'Breeds & coat colours' })).toBeVisible();

    const timestamp = Date.now().toString().slice(-4);
    const code = `TEST_${timestamp}`;
    const name = `TestBreed ${timestamp}`;

    await page.getByRole('button', { name: 'Add new' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Code').fill(code);
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    await page.goto('/horses/new');
    await expect(page.getByLabel('Breed', { exact: false }).locator('option', { hasText: name })).toHaveCount(1);
  });
});

test.describe('Catalog RBAC Permissions', () => {
  test.use({ storageState: TRAINER_AUTH });

  test('only the manager edits the breed catalogue', async ({ page }) => {
    await page.goto('/catalogs/breeds');
    await expect(page.getByText('Thoroughbred', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add new' })).toHaveCount(0);
  });

  // P1-14 SC-3.01: CM, HT có menu Herd Health; trang không còn nút tạo / xóa ngựa giả.
  test('head trainer opens herd health from the menu and sees the colour cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Herd Health' }).first().click();
    await expect(page).toHaveURL('/herd');
    await expect(page.getByRole('button', { name: /^Fit to work\s*\d+$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Training Lock\s*\d+$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Horse' })).toHaveCount(0);
  });
});
