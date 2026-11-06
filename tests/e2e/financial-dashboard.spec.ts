import { test, expect, type Page } from '@playwright/test';

const horse = { id: 'test-horse', name: 'Billing Thunder', horseCode: 'HR-TEST', breed: 'Thoroughbred' };
const owner = { id: 'test-owner', fullName: 'Test Owner', email: 'owner@gmail.com' };
const invoice = { id: 'test-invoice', horseId: horse.id, horse, ownerId: owner.id, owner, billingPeriod: '2026-10', boardingDays: 10, boardingMonthlyRate: 6000000, boardingFee: 1935484, medicalFee: 0, trainingFee: 0, prizeCredit: 0, netAmount: 1935484, status: 'DRAFT', dueAt: '2026-11-08T03:00:00Z', createdAt: '2026-11-01T03:00:00Z', updatedAt: '2026-11-01T03:00:00Z' };
const overview = {
  kpis: { managedHorses: 3, activePlans: 1, todayCompleted: 1, todayTotal: 1, blockedNext7Days: 0, loadSpikeHorses: 0 }, rows: [],
  nextWorkout: { id: 'workout-test', planId: 'plan-test', horseId: horse.id, horseName: horse.name, horseCode: horse.horseCode, workoutType: 'BREEZE', scheduledDate: '2026-11-06T01:00:00Z', intensity: 'HEAVY', surface: 'TURF', status: 'SCHEDULED' },
  latestPlan: { id: 'plan-test', planCode: 'GA-TEST', name: 'Race preparation', horseId: horse.id, horseName: horse.name, status: 'ACTIVE', startDate: '2026-11-01T00:00:00Z', endDate: '2026-11-30T00:00:00Z', currentPhaseName: 'Speed phase' },
};

async function serve(page: Page, role: string, data: unknown = overview) {
  let overviewRequests = 0;
  await page.addInitScript(() => localStorage.setItem('equiflow-lang-v2', 'en'));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = { items: [], total: 0, unreadCount: 0 };
    if (path.endsWith('/auth/me')) body = { ...owner, role, status: 'ACTIVE', permissions: { viewHorses: true, createPlan: true, assignSchedule: true, recordMetrics: true }, notify: {} };
    if (path.endsWith('/training/overview')) { body = data; overviewRequests++; }
    if (path.endsWith('/invoices/owner-summary')) body = { totalBoarding: invoice.boardingFee, totalMedical: 0, totalTraining: 0, totalExpense: invoice.boardingFee, totalPrizeCredit: 0, totalNet: invoice.netAmount, outstandingDebt: 6000000, invoiceCount: 1, invoices: [invoice] };
    await route.fulfill({ json: { statusCode: 200, success: true, data: body } });
  });
  return () => overviewRequests;
}

test('trainer action cards use the upcoming day and correct destinations without polling', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-05T09:00:00Z'));
  const requests = await serve(page, 'HEAD_TRAINER');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Next Workout', exact: true })).toBeVisible();
  await expect(page.getByText('06/11 08:00', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open weekly calendar', exact: true })).toHaveAttribute('href', '/training/calendar');
  await expect(page.getByRole('link', { name: 'View training plan', exact: true })).toHaveAttribute('href', '/training/plans/plan-test');
  await expect(page.getByText('Speed phase', { exact: true })).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(31000);
  expect(requests()).toBe(1);
  await page.locator('button[aria-label="Chuyển sang Tiếng Việt"]').click();
  await expect(page.getByRole('heading', { name: 'Buổi tập kế tiếp', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Giáo án gần nhất', exact: true })).toBeVisible();
});

test('trainer empty cards remain usable on a phone', async ({ page }) => {
  await serve(page, 'HEAD_TRAINER', { ...overview, nextWorkout: null, latestPlan: null });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');
  await expect(page.getByText('No upcoming workouts.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create training plan', exact: true })).toHaveAttribute('href', '/training/plans/new');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('financial report displays unissued labels, debt, deadline and stay snapshot in both languages', async ({ page }) => {
  await serve(page, 'HORSE_OWNER');
  await page.goto('/owner/financial-reports');
  await expect(page.getByRole('status').filter({ hasText: 'Outstanding balance' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Payment deadline', exact: true })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: horse.name });
  await expect(row.getByText('Not issued', { exact: true })).toBeVisible();
  await expect(row.getByRole('cell').nth(7)).toContainText('11/8/26');
  await row.getByRole('button', { name: /View statement/i }).click();
  await expect(page.getByRole('dialog').getByText('Boarding days: 10', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByLabel('Close', { exact: true }).click();
  await page.locator('button[aria-label="Chuyển sang Tiếng Việt"]').click();
  await expect(row.getByText('Chưa phát hành', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Tổng nợ tồn đọng' })).toBeVisible();
});
