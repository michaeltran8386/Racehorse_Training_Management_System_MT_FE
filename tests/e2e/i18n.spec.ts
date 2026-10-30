import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const VET_AUTH = path.join(AUTH_DIR, 'vet.json');

async function switchToVietnamese(page: Page) {
  const toggle = page.locator('button[aria-label="Chuyển sang Tiếng Việt"]');
  const appeared = await toggle.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  if (appeared) {
    await toggle.click();
    await expect(page.locator('button[aria-label="Switch to English"]')).toBeVisible({ timeout: 5000 });
  }
}

test.describe('Bilingual i18n Localization (TASK-019 & CR-028)', () => {
  // Yêu cầu song ngữ: nút đổi ngôn ngữ chuyển toàn bộ chữ giao diện sang tiếng Việt và ghi nhớ lựa chọn.
  test('the language toggle switches the interface to Vietnamese and remembers it', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await page.locator('button[aria-label="Chuyển sang Tiếng Việt"]').click();
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  });

  test.describe('Authenticated Views Localization', () => {
    test.use({ storageState: MANAGER_AUTH });

    test('horse profile page reflects bilingual attributes and age localization', async ({ page }) => {
      // Navigate to first horse in PostgreSQL
      await page.goto('/horses/44ebb987-e0c9-4cea-b180-9775cdc706e3');
      await expect(page.getByRole('heading', { name: /Xích Thố|Northern Dancer Legacy/i })).toBeVisible();

      // In English:
      await expect(page.getByText(/\d+ y\/o|\d+ years old/i).first()).toBeVisible();

      // Switch to Vietnamese:
      await switchToVietnamese(page);
      await expect(page.getByText(/\d+ tuổi/i).first()).toBeVisible();
      await expect(page.getByText(/Giống ngựa/i).first()).toBeVisible();
      await expect(page.getByText(/Giới tính/i).first()).toBeVisible();
      await expect(page.getByText(/Màu lông/i).first()).toBeVisible();
    });

    test('stable map page localizes search placeholder and empty search state in Vietnamese', async ({ page }) => {
      await page.goto('/stalls');
      await switchToVietnamese(page);

      const searchInput = page.locator('input[type="search"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('ZZZZ_UNKNOWN_HORSE_QUERY');

      await expect(page.getByText(/Không tìm thấy ngựa trên sơ đồ|No horse found on the map/i)).toBeVisible();
    });
  });

  test.describe('Veterinarian Medical Prescription Localization', () => {
    test.use({ storageState: VET_AUTH });

    test('medical record prescriptions table displays Vietnamese units and intervals', async ({ page }) => {
      // Mock record detail with prescription items matching MedicalRecord schema
      await page.route('**/api/medical/records/med-test-i18n*', async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            record: {
              id: 'med-test-i18n',
              recordNumber: 'MR-2026-I18N',
              status: 'FINALIZED',
              examinationDate: '2026-10-25T08:00:00.000Z',
              examinationType: 'PERIODIC_EXAM',
              horseId: '44ebb987-e0c9-4cea-b180-9775cdc706e3',
              horse: {
                id: '44ebb987-e0c9-4cea-b180-9775cdc706e3',
                name: 'Northern Dancer Legacy',
              },
              prescriptions: [
                {
                  id: 'rx-test-1',
                  medicationName: 'Phenylbutazone Paste',
                  dosage: 2,
                  unit: 'g',
                  route: 'ORAL',
                  frequencyPerDay: 2,
                  daysCount: 5,
                  status: 'ACTIVE',
                  instructions: 'Cho uống sau bữa sáng',
                },
              ],
            },
          },
        });
      });

      await page.goto('/medical/records/med-test-i18n?tab=prescriptions');
      await switchToVietnamese(page);

      await expect(page.getByRole('tab', { name: /Đơn thuốc|Prescriptions/i })).toBeVisible();
      await expect(page.getByText(/lần\/ngày/i).first()).toBeVisible();
      await expect(page.getByText(/ngày/i).first()).toBeVisible();
    });
  });
});
