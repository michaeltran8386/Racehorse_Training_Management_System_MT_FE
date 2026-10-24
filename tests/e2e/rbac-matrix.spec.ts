import { test, expect } from '@playwright/test';

/**
 * Parameterized 5-Role Matrix Landing Test (OPTIMIZED TESTING WORKFLOW)
 * Verifies that all 5 roles land on their dedicated dashboards without runtime errors.
 */
const ROLES_MATRIX = [
  {
    role: 'CLUB_MANAGER',
    email: 'manager@gmail.com',
    expectedText: 'Horses under management',
  },
  {
    role: 'HEAD_TRAINER',
    email: 'trainer@gmail.com',
    expectedText: 'Active training plans',
  },
  {
    role: 'VETERINARIAN',
    email: 'vet@gmail.com',
    expectedText: 'Training Locks in force',
  },
  {
    role: 'GROOM',
    email: 'groom@gmail.com',
    expectedText: 'Assigned horses',
  },
  {
    role: 'HORSE_OWNER',
    email: 'owner@gmail.com',
    expectedText: 'My horses',
  },
];

for (const { role, email, expectedText } of ROLES_MATRIX) {
  test(`5-Role Matrix Landing: ${role} lands on dashboard with zero runtime errors`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/login');
    await page.locator('input[type=email]').fill(email);
    await page.locator('input[type=password]').fill('EquiFlow@2026');
    await page.locator('button[type=submit]').click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(expectedText).first()).toBeVisible();

    // Zero uncaught runtime errors during render
    expect(pageErrors).toEqual([]);
  });
}

test('TASK-001: Head Trainer default permissions do not include horse create/edit authority', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/horses');
  await expect(page).toHaveURL('/horses');
  // Head Trainer cannot create or register horse master profiles
  await expect(page.locator('a[href="/horses/new"]')).not.toBeVisible();
  await expect(page.locator('a[href="/horses/deleted"]')).not.toBeVisible();
});

test('TASK-001: Club Manager retains horse master authority and account management', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('manager@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/horses');
  await expect(page.locator('a[href="/horses/new"]')).toBeVisible();
  await expect(page.locator('a[href="/horses/deleted"]')).toBeVisible();

  await page.goto('/accounts');
  await expect(page).toHaveURL('/accounts');
});

test('TASK-001: Self-profile supports contact details and role is read-only without direct permission edit', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/profile');
  await expect(page.getByText('Personal details')).toBeVisible();

  // Role field is read-only and disabled
  const roleInput = page.locator('input[value="Head Trainer"]');
  await expect(roleInput).toBeDisabled();

  // Direct permission edit switches are not present on self-profile
  await expect(page.locator('input[name="editHorses"]')).not.toBeVisible();
  await expect(page.locator('input[name="manageAccounts"]')).not.toBeVisible();
});

test('TASK-001: Alert review authority belongs exclusively to Veterinarian and training calendar is hidden on /alerts', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('vet@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/alerts');
  await expect(page).toHaveURL('/alerts');
  // Training schedule button is hidden for Veterinarian
  await expect(page.locator('a[href="/training/calendar"]')).not.toBeVisible();
  // Review & respond button is available for Vet
  await expect(page.locator('button:has-text("Review & respond")').or(page.locator('button:has-text("Xem & phản hồi")')).first()).toBeVisible();
});

test('TASK-001: Head Trainer cannot review or acknowledge abnormal-sign alerts', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/alerts');
  await expect(page).toHaveURL('/alerts');
  // Head Trainer sees training calendar link
  await expect(page.locator('a[href="/training/calendar"]')).toBeVisible();
  // Head Trainer CANNOT review & respond to abnormal sign alerts
  await expect(page.locator('button:has-text("Review & respond")')).not.toBeVisible();
  await expect(page.locator('button:has-text("Xem & phản hồi")')).not.toBeVisible();
});

test('TASK-002: Head Trainer is forbidden from creating horses and accessing /horses/new', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  // Direct navigation to /horses/new must be forbidden (403)
  await page.goto('/horses/new');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  // On /horses, row actions menu must NOT show Edit profile
  await page.goto('/horses');
  await expect(page).toHaveURL('/horses');
  await page.locator('button[aria-label^="Actions for"]').first().click();
  await expect(page.getByRole('menuitem', { name: /Edit profile|Chỉnh sửa/i })).not.toBeVisible();
});

test('TASK-002: Club Manager has complete horse master authority for creation, edit, and deletion', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('manager@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  // Direct navigation to /horses/new succeeds and renders the form
  await page.goto('/horses/new');
  await expect(page).toHaveURL('/horses/new');
  await expect(page.getByRole('heading', { name: /Register horse|Đăng ký ngựa/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Save Profile|Lưu hồ sơ/i }).first()).toBeVisible();

  // On /horses, row actions menu shows Edit profile
  await page.goto('/horses');
  await page.locator('button[aria-label^="Actions for"]').first().click();
  await expect(page.getByRole('menuitem', { name: /Edit profile|Chỉnh sửa/i })).toBeVisible();
});

