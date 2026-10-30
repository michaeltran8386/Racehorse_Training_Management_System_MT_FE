import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');
const VET_AUTH = path.join(AUTH_DIR, 'vet.json');

// Q-0.01 = B: mỗi vai trò một dashboard riêng.
test.describe('Club Manager Dashboard', () => {
  test.use({ storageState: MANAGER_AUTH });

  test('the club manager lands on the club overview', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Horses under management')).toBeVisible();
    await expect(page.getByText('Medical safety', { exact: true })).toBeVisible();
  });
});

test.describe('Head Trainer Dashboard', () => {
  test.use({ storageState: TRAINER_AUTH });

  test('the head trainer lands on the training dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Active training plans')).toBeVisible();
    await expect(page.getByText("Today's workouts", { exact: true })).toBeVisible();
    await expect(page.getByText('Horses under management')).toHaveCount(0);
  });

  // Q-0.04: Head Trainer xem danh sách cảnh báo nhưng không ghi nhận (chỉ VET).
  test('the head trainer sees alerts but cannot acknowledge them', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Threshold Alerts' }).click();
    await expect(page).toHaveURL('/alerts');
    await expect(page.getByRole('button', { name: 'Review & respond' })).toHaveCount(0);
  });
});

test.describe('Veterinarian Dashboard', () => {
  test.use({ storageState: VET_AUTH });

  test('the veterinarian lands on the medical dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Training Locks in force')).toBeVisible();
    await expect(page.getByText('Abnormal signs to review')).toBeVisible();
  });
});
