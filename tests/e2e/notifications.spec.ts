import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string, password = 'equiflow123') {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/.*dashboard/);
}

// C-01: chuông đọc thông báo qua API /notifications; mở tab Pending thì thông báo đăng ký mới được đánh dấu đã đọc.
test('opening the Pending tab marks the sign-up notification as read', async ({ page }) => {
  await signIn(page, 'viet.do@gmail.com');
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread' })).toBeVisible();
  await page.goto('/accounts');
  await page.getByRole('tab', { name: /Pending/ }).click();
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible();
});

test('a role only sees its own notifications', async ({ page }) => {
  await signIn(page, 'nam.tran@gmail.com');
  await page.goto('/notifications');
  await expect(page.getByText('New Account Registration Request')).toHaveCount(0);
});

test('Veterinarian sees clinical alerts and does not see manager account requests', async ({ page }) => {
  await signIn(page, 'chau.le@gmail.com');
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
  await expect(page.getByText('Clinical Observation Recorded')).toBeVisible();
  await expect(page.getByText('New Account Registration Request')).toHaveCount(0);
});

test('Horse Owner does not receive staff administrative or clinical observation notices', async ({ page }) => {
  await signIn(page, 'ha.ly@gmail.com');
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
  await expect(page.getByText('New Account Registration Request')).toHaveCount(0);
  await expect(page.getByText('Permission Access Request')).toHaveCount(0);
  await expect(page.getByText('Clinical Observation Recorded')).toHaveCount(0);
});
