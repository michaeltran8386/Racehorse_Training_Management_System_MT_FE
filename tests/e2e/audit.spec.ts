import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');

test.describe('Audit Log Real-Stack Acceptance (TASK-019 & CR-028)', () => {
  test.describe('Club Manager Audit Review', () => {
    test.use({ storageState: MANAGER_AUTH });

    test('audit filters, pagination, detail modal, and date validation on real backend', async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto('/audit');
      await expect(page.getByRole('heading', { name: /Audit Log|Nhật ký hệ thống/i })).toBeVisible();

      // Verify real records are loaded from PostgreSQL
      const statusEl = page.locator('span[role="status"]');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toContainText(/events|sự kiện/i);

      // Verify table rows (up to 20 rows + header)
      const rows = page.getByRole('row');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(1);

      // Verify pagination if total > 20
      const nextBtn = page.getByRole('button', { name: /Next page|Trang sau/i });
      if (await nextBtn.isEnabled()) {
        await nextBtn.click();
        await expect(statusEl).toContainText(/Page 2|Trang 2/i);
        const prevBtn = page.getByRole('button', { name: /Previous page|Trang trước/i });
        await prevBtn.click();
        await expect(statusEl).toContainText(/Page 1|Trang 1/i);
      }

      // Filter by Action AUTH_LOGIN
      await page.getByPlaceholder(/AUTH_LOGIN/i).fill('AUTH_LOGIN');
      await page.getByRole('button', { name: /Apply filters|Áp dụng/i }).click();
      await expect(statusEl).toBeVisible();

      // Open detail modal for first log entry
      const detailBtn = page.getByRole('button', { name: /View details|Xem chi tiết/i }).first();
      if (await detailBtn.isVisible()) {
        await detailBtn.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('audit-detail.png'), fullPage: true });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
      }

      // Filter by non-matching actor returns empty state
      await page.getByPlaceholder(/Search actor name|Tìm kiếm tên người thực hiện/i).fill('no-matching-actor-xyz');
      await page.getByRole('button', { name: /Apply filters|Áp dụng/i }).click();
      await expect(page.getByText(/No audit events match these filters|Không có sự kiện nào khớp/i)).toBeVisible();

      // Reset filters restores full list
      await page.getByRole('button', { name: /Reset|Đặt lại/i, exact: true }).click();
      await expect(statusEl).toBeVisible();

      // Date validation: invalid date range disables submit button
      const dateInputs = page.locator('form input[type="datetime-local"]');
      await dateInputs.nth(0).fill('2026-10-30T12:00');
      await dateInputs.nth(1).fill('2026-10-20T12:00');
      await expect(page.getByRole('button', { name: /Apply filters|Áp dụng/i })).toBeDisabled();

      // Reset restores valid state
      await page.getByRole('button', { name: /Reset|Đặt lại/i, exact: true }).click();
      await expect(page.getByRole('button', { name: /Apply filters|Áp dụng/i })).toBeEnabled();

      // Verify no horizontal page overflow
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
    });

    test('audit load failure displays error alert and can be retried', async ({ page }) => {
      let failOnce = true;
      await page.route('**/api/audit-logs*', async (route) => {
        if (failOnce) {
          failOnce = false;
          await route.fulfill({ status: 500, json: { message: 'Simulated backend temporary failure' } });
        } else {
          await route.continue();
        }
      });

      await page.goto('/audit');
      await expect(page.getByText(/Audit history could not be loaded|Không thể tải/i)).toBeVisible();

      // Click Try again / Thử lại to retry
      await page.getByRole('button', { name: /Try again|Thử lại/i }).click();
      await expect(page.locator('span[role="status"]')).toBeVisible();
      await expect(page.getByText(/Audit history could not be loaded|Không thể tải/i)).toHaveCount(0);
    });
  });

  test.describe('Role-based Access Restriction', () => {
    test.use({ storageState: TRAINER_AUTH });

    test('head trainer is forbidden (403) from accessing audit logs', async ({ page }) => {
      await page.goto('/audit');
      // Verify 403 Access Denied view
      await expect(page.getByText(/403 · ACCESS DENIED|403/i).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: /This screen is not part of your permissions|Không thuộc phạm vi quyền hạn/i }).first()).toBeVisible();
    });
  });
});
