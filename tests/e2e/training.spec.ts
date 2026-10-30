import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siblingPrismaPath =
  process.env.PRISMA_CLIENT_PATH ||
  path.resolve(__dirname, '../../..', 'Racehorse_Training_Management_System_MT_BE', 'node_modules', '@prisma/client');

const TRAINER_AUTH = path.resolve(process.cwd(), 'test-results', '.auth', 'trainer.json');
const GROOM_AUTH = path.resolve(process.cwd(), 'test-results', '.auth', 'groom.json');

/** Ngày mai theo giờ câu lạc bộ (UTC+7), dạng YYYY-MM-DD. */
function tomorrowClub(): string {
  return new Date(Date.now() + 7 * 3600_000 + 24 * 3600_000).toISOString().slice(0, 10);
}

/** Thời điểm trong ngày hôm nay theo giờ câu lạc bộ (UTC+7) đã qua giờ xuất phát để TRIAL hiển thị trên Trial Runs và chạy được. */
function dueTodayClubDate(): Date {
  const now = new Date();
  const clubMs = now.getTime() + 7 * 3600000;
  const sodClubMs = Math.floor(clubMs / 86400000) * 86400000;
  const sodUtc = sodClubMs - 7 * 3600000;
  return new Date(Math.min(sodUtc + 60000, now.getTime() - 1000));
}

test.describe('TASK-019 / CR-028: Training & Workouts E2E Acceptance', () => {
  let prisma: any = null;

  test.beforeAll(async () => {
    const { PrismaClient } = require(siblingPrismaPath);
    prisma = new PrismaClient();

    // 1. Ensure Storm Runner draft plan has 0 workouts, starts before tomorrow, has a phase, and is in DRAFT
    const samplePhase = [
      {
        id: 'phase-sr-1',
        name: 'Giai đoạn cơ bản',
        type: 'BASE',
        startDate: '2026-10-25',
        endDate: '2026-12-13',
        surface: 'TURF',
        targetSpeedKmh: 45,
        sessionsPerWeek: 4,
        maxWeeklyDistance: 8000,
      },
    ];
    await prisma.workoutSession.deleteMany({
      where: { trainingPlanId: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft' },
    });
    await prisma.trainingPlan.update({
      where: { id: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft' },
      data: {
        status: 'DRAFT',
        startDate: new Date('2026-10-25T00:00:00.000Z'),
        phases: samplePhase,
      },
    });

    // 2. Ensure w1-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa has abnormalSigns and recordedAt > 48h
    await prisma.workoutSession.update({
      where: { id: 'w1-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa' },
      data: {
        status: 'COMPLETED',
        resultRecordedAt: new Date('2026-10-20T06:00:00.000Z'),
        abnormalSigns: true,
        abnormalSignTypes: ['LAMENESS'],
        abnormalNotes: 'Slight limp noticed on left foreleg.',
        actualDistanceMeters: 1200,
        actualTimeSeconds: 72,
        performanceScore: 8.5,
        completionLevel: 'ACHIEVED',
        resultNotes: 'Completed with slight limp.',
      },
    });

    // 3. Ensure w-blocked-44ebb987-e0c9-4cea-b180-9775cdc706e3 is on tomorrowClub() and assigned to groom
    await prisma.workoutSession.updateMany({
      where: { id: 'w-blocked-44ebb987-e0c9-4cea-b180-9775cdc706e3' },
      data: {
        scheduledDate: new Date(`${tomorrowClub()}T06:14:23.400Z`),
        status: 'BLOCKED',
      },
    });

    // 4. Upsert due and future trial sessions for Thunderbolt Swift
    await prisma.simulatorSession.deleteMany({
      where: { workoutSessionId: { in: ['w-trial-due-thunderbolt', 'w-trial-future-thunderbolt'] } },
    });
    await prisma.workoutSession.deleteMany({
      where: { id: { in: ['w-trial-due-thunderbolt', 'w-trial-future-thunderbolt'] } },
    });
    await prisma.workoutSession.create({
      data: {
        id: 'w-trial-due-thunderbolt',
        trainingPlanId: 'plan-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
        horseId: 'fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
        scheduledDate: dueTodayClubDate(),
        distanceMeters: 1200,
        targetSpeedKmh: 60,
        jockeyName: 'Nguyen Van A',
        workoutType: 'TRIAL',
        intensity: 'HEAVY',
        trackSurface: 'TURF',
        status: 'SCHEDULED',
      },
    });
    await prisma.workoutSession.create({
      data: {
        id: 'w-trial-future-thunderbolt',
        trainingPlanId: 'plan-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
        horseId: 'fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
        scheduledDate: new Date(Date.now() + 86400000 * 2),
        distanceMeters: 1000,
        targetSpeedKmh: 58,
        jockeyName: 'Nguyen Van A',
        workoutType: 'TRIAL',
        intensity: 'HEAVY',
        trackSurface: 'TURF',
        status: 'SCHEDULED',
      },
    });
  });

  test.afterAll(async () => {
    if (prisma) {
      try {
        await prisma.simulatorSession.deleteMany({
          where: { workoutSessionId: { in: ['w-trial-due-thunderbolt', 'w-trial-future-thunderbolt'] } },
        });
        await prisma.workoutSession.deleteMany({
          where: { id: { in: ['w-trial-due-thunderbolt', 'w-trial-future-thunderbolt'] } },
        });
        await prisma.workoutSession.deleteMany({
          where: { trainingPlanId: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft' },
        });
        await prisma.trainingPlan.update({
          where: { id: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft' },
          data: { status: 'DRAFT' },
        });
        await prisma.trainingPlan.update({
          where: { id: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-active' },
          data: { status: 'ACTIVE' },
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  });

  test.describe('Head Trainer Workflows', () => {
    test.use({ storageState: TRAINER_AUTH });

    // SC-2.04 / DL-2.02: giáo án Nháp chưa có buổi tập thì nút Kích hoạt bị vô hiệu hóa, có lý do.
    test('a draft plan without workouts cannot be activated', async ({ page }) => {
      await page.goto('/training/plans');
      await page.getByRole('row', { name: /GA-000004/i }).click();
      await expect(page).toHaveURL(/\/training\/plans\/plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft$/);
      const activate = page.getByRole('button', { name: 'Activate' });
      await expect(activate).toBeDisabled();
      await expect(activate).toHaveAttribute('title', 'The plan has no workouts yet.');
    });

    // DL-2.01 + DL-2.02: xếp buổi đi bộ nhẹ cho giáo án Nháp, rồi kích hoạt (có xác nhận VET).
    test('head trainer schedules a light workout and then activates the plan', async ({ page }) => {
      // Set horse to UNDER_OBSERVATION to trigger vet consultation requirement
      await prisma.horse.update({
        where: { id: '137dab4a-d971-47dd-9cb6-a435d92a623c' },
        data: { status: 'UNDER_OBSERVATION' },
      });
      // Temporarily mark existing active plan as COMPLETED so Storm Runner has no conflicting active plan
      await prisma.trainingPlan.update({
        where: { id: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-active' },
        data: { status: 'COMPLETED' },
      });

      await page.goto('/training/calendar');
      await page.getByRole('button', { name: '+ Schedule Workout' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Horse / plan').selectOption('plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft');
      await dialog.getByLabel('Date').fill(tomorrowClub());
      await dialog.getByLabel('Start time').fill('09:00');
      await dialog.getByLabel('Workout type').selectOption('WALK');
      await dialog.getByLabel('Intensity').selectOption('LIGHT');
      await dialog.getByRole('button', { name: 'Save workout' }).click();
      await expect(page.getByText('Workout added.')).toBeVisible();

      await page.goto('/training/plans/plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft');
      await page.getByRole('button', { name: 'Activate' }).click();
      const activate = page.getByRole('dialog');
      // Ngựa đang "Cần theo dõi" -> phải xác nhận đã trao đổi với bác sĩ thú y (DL-2.02 ⚠).
      await expect(activate.getByRole('button', { name: 'Activate' })).toBeDisabled();
      await activate.getByText('I have discussed this plan with the Veterinarian').click();
      await activate.getByRole('button', { name: 'Activate' }).click();
      await expect(page.getByText('Training plan activated.')).toBeVisible();
      await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();

      // Clean up for repeatability
      await prisma.workoutSession.deleteMany({
        where: { trainingPlanId: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft' },
      });
      await prisma.trainingPlan.update({
        where: { id: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-draft' },
        data: { status: 'DRAFT' },
      });
      await prisma.trainingPlan.update({
        where: { id: 'plan-137dab4a-d971-47dd-9cb6-a435d92a623c-active' },
        data: { status: 'ACTIVE' },
      });
      await prisma.horse.update({
        where: { id: '137dab4a-d971-47dd-9cb6-a435d92a623c' },
        data: { status: 'IN_TRAINING' },
      });
    });

    // RULE-MED-01: buổi tập nặng của ngựa đang khóa hiện "Bị chặn" và chưa khôi phục được.
    test('a heavy workout of a locked horse is blocked and cannot be restored yet', async ({ page }) => {
      await page.goto('/training/calendar');
      await page.locator('input[type=date]').first().fill(tomorrowClub());
      await page.getByRole('button', { name: /Blocked.*(Xích Thố|Northern Dancer Legacy)/i }).click();
      const restore = page.getByRole('button', { name: 'Restore' });
      await expect(restore).toBeDisabled();
      await expect(restore).toHaveAttribute('title', 'The horse is still under a Training Lock.');
    });

    // SC-2.01: tổng quan có 4 thẻ chỉ số và bảng ngựa.
    test('training overview shows the KPI cards and the horse table', async ({ page }) => {
      await page.goto('/training');
      await expect(page.getByText('Active plans', { exact: true })).toBeVisible();
      await expect(page.getByText('Sudden load increase', { exact: true })).toBeVisible();
      await expect(page.getByRole('row', { name: /Bạch Long Mã|Thunderbolt Swift/ })).toBeVisible();
    });

    // SC-2.06: kết quả có dấu hiệu bất thường; quá 48 giờ thì không sửa được.
    test('a recorded result shows abnormal signs and cannot be edited after 48 hours', async ({ page }) => {
      await page.goto('/training/sessions/w1-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa/result');
      await expect(page.getByText('Abnormal signs', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit result' })).toBeDisabled();
    });

    test('head trainer launches a due trial with the URL issued by the backend', async ({ page }) => {
      // Ensure target session is SCHEDULED with due date and clear prior simulation
      await prisma.simulatorSession.deleteMany({
        where: { workoutSessionId: 'w-trial-due-thunderbolt' },
      });
      await prisma.workoutSession.upsert({
        where: { id: 'w-trial-due-thunderbolt' },
        create: {
          id: 'w-trial-due-thunderbolt',
          trainingPlanId: 'plan-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
          horseId: 'fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
          scheduledDate: dueTodayClubDate(),
          distanceMeters: 1200,
          targetSpeedKmh: 60,
          jockeyName: 'Nguyen Van A',
          workoutType: 'TRIAL',
          intensity: 'HEAVY',
          trackSurface: 'TURF',
          status: 'SCHEDULED',
        },
        update: {
          scheduledDate: dueTodayClubDate(),
          status: 'SCHEDULED',
        },
      });

      await page.context().route('http://localhost:5175/**', (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>Simulator</title>' }),
      );
      await page.goto('/training/trials');

      const dueRow = page.getByRole('row').filter({ hasText: /Bạch Long Mã|Thunderbolt Swift/ }).filter({ hasText: '1200m' });
      const futureRow = page.getByRole('row').filter({ hasText: /Bạch Long Mã|Thunderbolt Swift/ }).filter({ hasText: '1000m' });
      await expect(futureRow.getByRole('button', { name: 'Run simulation' })).toBeDisabled();
      await expect(futureRow.getByRole('button', { name: 'Run simulation' })).toHaveAttribute(
        'title',
        'The trial has not reached its scheduled start time.',
      );
      const popupPromise = page.waitForEvent('popup');
      await dueRow.getByRole('button', { name: 'Run simulation' }).click();
      const popup = await popupPromise;

      await expect(popup).toHaveURL(/localhost:5175\/\?sessionId=[a-zA-Z0-9_-]+/);
    });

    test('live monitor renders telemetry returned by the simulator API', async ({ page }) => {
      await page.route('**/api/simulator/sessions?status=RUNNING', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            active: [
              {
                sessionId: 'sim-live-001',
                lastSnapshot: {
                  horse: { horse_id: '44ebb987-e0c9-4cea-b180-9775cdc706e3', microchip_id: 'MICROCHIP-LIVE-001' },
                  track: { surface: 'TURF', track_condition: 'GOOD', sim_time_s: 45, target_distance_m: 1200, covered_distance_m: 600 },
                  metrics: { velocity_mps: 12, heart_rate_bpm: 156, stamina_pct: 78, body_temp_c: 38.4 },
                  alerts: {},
                },
              },
              {
                sessionId: 'sim-live-002',
                lastSnapshot: null,
              },
            ],
            recent: [],
          }),
        }),
      );
      await page.goto('/training/monitor');

      await expect(page.getByText('MICROCHIP-LIVE-001')).toBeVisible();
      await expect(page.getByText('43.2 km/h')).toBeVisible();
      await expect(page.getByText('156 bpm')).toBeVisible();
      await expect(page.getByText('600m / 1200m')).toBeVisible();
      await expect(page.getByText('Waiting for the first telemetry packet…')).toBeVisible();
    });

    test('trainer result form is prefilled from a finished simulator session', async ({ page }) => {
      // Ensure target session is SCHEDULED with fresh state
      await prisma.simulatorSession.deleteMany({
        where: { workoutSessionId: 'w-trial-due-thunderbolt' },
      });
      await prisma.workoutSession.upsert({
        where: { id: 'w-trial-due-thunderbolt' },
        create: {
          id: 'w-trial-due-thunderbolt',
          trainingPlanId: 'plan-fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
          horseId: 'fd4cce13-4bfd-4041-a9e2-ec9e00d7abaa',
          scheduledDate: dueTodayClubDate(),
          distanceMeters: 1200,
          targetSpeedKmh: 60,
          jockeyName: 'Nguyen Van A',
          workoutType: 'TRIAL',
          intensity: 'HEAVY',
          trackSurface: 'TURF',
          status: 'SCHEDULED',
        },
        update: {
          scheduledDate: dueTodayClubDate(),
          status: 'SCHEDULED',
          resultRecordedAt: null,
          resultRecordedById: null,
          resultUpdatedAt: null,
          resultUpdatedById: null,
          actualDistanceMeters: null,
          actualTimeSeconds: null,
          averageSpeedKmh: null,
          actualSurface: null,
          trackCondition: null,
          heartRatePeak: null,
          heartRateRecovery: null,
          topSpeedKmh: null,
          performanceScore: null,
          completionLevel: null,
          resultNotes: null,
          abnormalSigns: false,
          abnormalSignTypes: [],
          abnormalNotes: null,
        },
      });

      // Mock the simulator latest result endpoint for the target session
      await page.route('**/api/simulator/workouts/*/latest', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'COMPLETED',
            resultDraft: {
              actualDistanceMeters: 1187,
              actualTimeSeconds: 72.4,
              heartRatePeak: 195,
              heartRateRecovery: 86,
              topSpeedKmh: 65.5,
              actualSurface: 'TURF',
              trackCondition: 'SOFT',
            },
          }),
        }),
      );

      // Start from trials page so history has an app page to navigate(-1) back to upon save
      await page.goto('/training/trials');
      await page.goto('/training/sessions/w-trial-due-thunderbolt/result');

      await expect(page.getByLabel('Actual distance (m)')).toHaveValue('1187');
      await expect(page.getByLabel('Running time (mm:ss.s)')).toHaveValue('01:12.4');
      await expect(page.getByLabel('Peak heart rate (bpm)')).toHaveValue('195');
      await expect(page.getByLabel('Heart rate after 10 min rest (bpm)')).toHaveValue('86');
      await expect(page.getByLabel('Top speed (km/h)')).toHaveValue('65.5');
      await expect(page.getByLabel('Actual surface')).toHaveValue('TURF');
      await expect(page.getByLabel('Track condition')).toHaveValue('SOFT');
      await expect(page.getByLabel('Performance score')).toHaveValue('');
      await expect(page.getByLabel('Completion')).toHaveValue('PARTIAL');
      await expect(page.getByLabel(/Professional comment/)).toHaveValue('');

      await page.getByLabel('Performance score').selectOption('7');
      await page.getByLabel('Completion').selectOption('PARTIAL');
      await page.getByLabel(/Professional comment/).fill('Stopped safely and referred for veterinary review.');
      await page.getByRole('button', { name: 'Save result' }).click();
      await expect(page).toHaveURL('/training/trials');

      await page.goto('/training/sessions/w-trial-due-thunderbolt/result');
      await expect(page.getByText('Completed', { exact: true })).toBeVisible();
      await expect(page.getByText('65.5 km/h')).toBeVisible();
      await expect(page.getByText('Stopped safely and referred for veterinary review.')).toBeVisible();
    });
  });

  test.describe('Groom Workflows', () => {
    test.use({ storageState: GROOM_AUTH });

    // SC-2.08: Groom xem buổi được phân công.
    test('a groom sees the workouts assigned to them', async ({ page }) => {
      await page.goto('/my-training');
      await page.getByRole('tab', { name: 'Tomorrow' }).click();
      await expect(page.getByText(/Xích Thố|Northern Dancer Legacy/).first()).toBeVisible();
      await expect(page.getByText('do not take the horse to the track', { exact: false }).first()).toBeVisible();
    });
  });
});
