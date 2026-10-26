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

test('TASK-004: Head Trainer can plan, schedule, run trials, and view published race results', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  // 1. Training Plans
  await page.goto('/training/plans');
  await expect(page).toHaveURL('/training/plans');
  await expect(page.getByRole('heading', { name: /Training Plans|Giáo án huấn luyện/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /\+ Create New Plan|\+ Tạo giáo án/i })).toBeVisible();

  // 2. Training Calendar & Scheduling
  await page.goto('/training/calendar');
  await expect(page).toHaveURL('/training/calendar');
  await expect(page.getByRole('button', { name: /\+ Schedule Workout|\+ Thêm buổi tập/i })).toBeVisible();

  // 3. Trial Runs
  await page.goto('/training/trials');
  await expect(page).toHaveURL('/training/trials');
  await expect(page.getByRole('heading', { name: /Trial Runs|Lượt chạy thử/i })).toBeVisible();

  // 4. Racing & Tournaments (HT can view and register)
  await page.goto('/racing');
  await expect(page).toHaveURL('/racing');
  await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i })).toBeVisible();

  // 5. Published Race Results (Read-only)
  await page.goto('/races/results');
  await expect(page).toHaveURL('/races/results');
  await expect(page.getByRole('heading', { name: /Race Results|Kết quả giải đấu/i })).toBeVisible();
});

test('TASK-004: Head Trainer cannot mutate tournament definitions, change status, or record/lock results', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/racing');
  await expect(page).toHaveURL('/racing');

  // Head Trainer cannot create tournament
  await expect(page.getByRole('button', { name: /\+ Create Tournament|\+ Tạo giải/i })).toHaveCount(0);

  // Head Trainer cannot edit, cancel, close, or delete tournaments
  await expect(page.getByRole('button', { name: /^Edit$|^Chỉnh sửa$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Đóng đăng ký|Close Registration/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Mở đăng ký|Open Registration/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Xóa/i })).toHaveCount(0);

  // Head Trainer cannot record results
  await expect(page.getByRole('button', { name: /Ghi kết quả|Record Results/i })).toHaveCount(0);

  // Head Trainer sees registration actions
  const registerBtn = page.getByRole('button', { name: /Đăng ký ngựa|Register Horse/i });
  await expect(registerBtn.first()).toBeVisible();
});

test('TASK-004: Head Trainer is forbidden from accounts management, staff directory, and permission matrix', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  // Direct navigation to /accounts is 403 Forbidden
  await page.goto('/accounts');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  // Direct navigation to /staff is 403 Forbidden
  await page.goto('/staff');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  // Direct navigation to permission matrix is 403 Forbidden
  await page.goto('/accounts/seed-trainer/permissions');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
});

test('TASK-004: Head Trainer cannot access horse profile creation, edit, or deleted list', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  // /horses/new -> 403
  await page.goto('/horses/new');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  // /horses/deleted -> 403
  await page.goto('/horses/deleted');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  // /horses/:id/edit -> 403
  await page.goto('/horses/h-1/edit');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
});

test('TASK-004: Head Trainer can access plan authoring routes (/plans/new and /training/plans/:id/edit)', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/plans/new');
  await expect(page).toHaveURL('/plans/new');
  await expect(page.getByText('403', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Create Training Plan|Tạo giáo án/i })).toBeVisible();

  await page.goto('/training/plans/plan-1/edit');
  await expect(page).toHaveURL('/training/plans/plan-1/edit');
  await expect(page.getByText('403', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Edit|Chỉnh sửa/i })).toBeVisible();
});

test('TASK-004: Unauthorized actor receives client-side 403 page on plan authoring routes', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('groom@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/plans/new');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  await page.goto('/training/plans/plan-1/edit');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
});

test('TASK-004: Club Manager receives client-side 403 page on both plan authoring routes', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('manager@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  // Club Manager is blocked from /plans/new
  await page.goto('/plans/new');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();

  // Club Manager is blocked from /training/plans/:id/edit
  await page.goto('/training/plans/plan-1/edit');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
});

test('TASK-007: Horse Owner sees only owned horses on /my-horses and foreign horse details return 404 without leakage', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('owner@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/my-horses');
  await expect(page).toHaveURL('/my-horses');
  await expect(page.getByRole('heading', { name: /My horses/i })).toBeVisible();

  // Foreign horse from different owner is NOT visible
  await expect(page.getByText('Ironclad Titan')).toHaveCount(0);

  // Directly navigating to a foreign horse ID (Owner 2's horse 'Ironclad Titan') returns 404 without data leakage
  await page.goto('/horses/d2b6aac3-c3f8-4ee7-83f7-d7c7d260347b');
  await expect(
    page.getByText(/Không tìm thấy hồ sơ ngựa|Horse profile not found|This horse profile could not be opened/i).first()
  ).toBeVisible();
});

test('TASK-007: Horse Owner sees only owned financial reports and cannot generate invoices', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('owner@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/financial-reports');
  await expect(page).toHaveURL('/financial-reports');

  // Horse Owner sees financial summary
  await expect(page.getByText(/Owner Financial Reports|Báo cáo tài chính/i).first()).toBeVisible();

  // Horse Owner cannot generate monthly invoices (Club Manager only action)
  await expect(page.getByRole('button', { name: /\+ Generate Monthly Invoices|\+ Tạo hóa đơn/i })).toHaveCount(0);
});

test('TASK-007: Horse Owner self-profile allows contact updates but prevents direct self-permission editing', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('owner@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');

  await page.goto('/profile');
  await expect(page).toHaveURL('/profile');
  await expect(page.getByText('Personal details')).toBeVisible();

  // Role and email are read-only
  await expect(page.locator('input[value="Horse Owner"]')).toBeDisabled();
  await expect(page.locator('input[value="owner@gmail.com"]')).toBeDisabled();

  // Permissions count is display-only with no direct editing switches
  await expect(page.getByText('Permissions', { exact: true })).toBeVisible();
  await expect(page.locator('input[name="manageAccounts"]')).not.toBeVisible();
  await expect(page.locator('input[name="editHorses"]')).not.toBeVisible();

  // Update contact details (name and phone)
  const nameInput = page.locator('input[autocomplete="name"]');
  await nameInput.fill('Phan Duc Long');
  const phoneInput = page.locator('input[placeholder="0901 234 567"]');
  await phoneInput.fill('0901234571');
  await page.getByRole('button', { name: /Save details|Lưu thông tin/i }).click();
  await expect(page.getByText(/Details saved|Đã lưu thông tin/i).first()).toBeVisible();

  // Direct navigation to accounts management is 403 Forbidden with request-only button
  await page.goto('/accounts');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Request the permission|Request permission|Xin cấp quyền|Yêu cầu cấp quyền/i }).first()
  ).toBeVisible();

  // Direct navigation to permission matrix is 403 Forbidden
  await page.goto('/accounts/seed-owner/permissions');
  await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
});
