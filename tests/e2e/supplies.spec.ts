import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string, password = 'EquiFlow@2026') {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('TASK-006: Supply Catalog and Inventory RBAC (ADR-004 / CR-002)', () => {
  test('Groom views catalog: unit price and catalog management actions are hidden', async ({ page }) => {
    await signIn(page, 'groom@gmail.com');
    await page.goto('/catalogs/supplies');

    // Page loads successfully
    await expect(page.getByRole('heading', { name: 'Supplies Catalog' })).toBeVisible();

    // + Add Supply action button must NOT be present
    await expect(page.getByRole('button', { name: /Add Supply/i })).toHaveCount(0);

    // Unit Price column header must NOT be present
    await expect(page.getByRole('columnheader', { name: /Unit Price/i })).toHaveCount(0);

    // Action buttons (Edit, Stop using) must NOT be present
    await expect(page.getByRole('button', { name: /^Edit$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Stop using/i })).toHaveCount(0);

    // Groom can filter by category
    const feedTab = page.getByRole('button', { name: 'Feed & Forage' });
    await expect(feedTab).toBeVisible();
    await feedTab.click();

    // Groom can search by name
    const searchInput = page.getByPlaceholder(/Search by supply name/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Hay');
  });

  test('Club Manager views catalog: full management controls and unit price are visible', async ({ page }) => {
    await signIn(page, 'manager@gmail.com');
    await page.goto('/catalogs/supplies');

    // Page loads successfully
    await expect(page.getByRole('heading', { name: 'Supplies Catalog' })).toBeVisible();

    // + Add Supply action button MUST be visible
    await expect(page.getByRole('button', { name: /Add Supply/i })).toBeVisible();

    // Unit Price column header MUST be visible
    await expect(page.getByRole('columnheader', { name: /Unit Price/i })).toBeVisible();

    // Edit button MUST be visible on supply rows
    await expect(page.getByRole('button', { name: /^Edit$/i }).first()).toBeVisible();
  });

  test('Horse Owner cannot access supplies catalog (client 403)', async ({ page }) => {
    await signIn(page, 'owner@gmail.com');
    await page.goto('/catalogs/supplies');

    // Client-side 403 page or access restriction is displayed
    await expect(
      page.getByText(/Access Denied|403|Forbidden|Không có quyền truy cập/i).first(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supplies Catalog' })).toHaveCount(0);
  });

  test('Groom views zone inventory: Request Restock is visible, Adjust is hidden', async ({ page }) => {
    await signIn(page, 'groom@gmail.com');
    await page.goto('/supplies/inventory');

    // Inventory page loads
    await expect(page.getByRole('heading', { name: 'Zone Supply Inventory' })).toBeVisible();

    // Groom can see Request Restock button
    await expect(page.getByRole('button', { name: /Request Restock/i }).first()).toBeVisible();

    // Groom CANNOT see Adjust stock button
    await expect(page.getByRole('button', { name: /^Adjust$/i })).toHaveCount(0);
  });

  test('Club Manager views zone inventory: Adjust and Request Restock are both visible', async ({ page }) => {
    await signIn(page, 'manager@gmail.com');
    await page.goto('/supplies/inventory');

    // Inventory page loads
    await expect(page.getByRole('heading', { name: 'Zone Supply Inventory' })).toBeVisible();

    // Club Manager can see Request Restock button
    await expect(page.getByRole('button', { name: /Request Restock/i }).first()).toBeVisible();

    // Club Manager CAN see Adjust stock button
    await expect(page.getByRole('button', { name: /^Adjust$/i }).first()).toBeVisible();
  });
});
