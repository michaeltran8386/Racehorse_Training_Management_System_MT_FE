import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siblingPrismaPath =
  process.env.PRISMA_CLIENT_PATH ||
  path.resolve(__dirname, '../../..', 'Racehorse_Training_Management_System_MT_BE', 'node_modules', '@prisma/client');
const { PrismaClient } = require(siblingPrismaPath);

const FE_BASE = 'http://localhost:5173';
const SIM_BASE = 'http://localhost:5175';
const BE_BASE = process.env.VITE_API_URL || 'http://localhost:3000/api';
const QA_PASSWORD = 'EquiFlow@2026';
const TARGET_HORSE_CODE = 'QA-HR-000001';
const TARGET_WORKOUT_ID = '00000000-0000-4000-a007-000000000003';
const TARGET_TRAINER_EMAIL = 'qa-trainer1@gmail.com';
const SECOND_TRAINER_EMAIL = 'qa-trainer2@gmail.com';
const TARGET_VET_EMAIL = 'qa-vet1@gmail.com';
const SLICE_G_PLAN_ID = '00000000-0000-4000-a013-000000000011';
const SLICE_G_MARKER = 'TASK-013-SLICE-G-E2E';

const evidenceDir = path.resolve(__dirname, '../../..', 'Racehorse_Training_Management_System_MT_BE', 'docs', 'ai-workflow', 'evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function signIn(page: Page, email: string) {
  await page.goto(`${FE_BASE}/login`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${FE_BASE}/login`);
  const emailInput = page.locator('input[type=email]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  await page.locator('input[type=password]').fill(QA_PASSWORD);
  await page.locator('button[type=submit]').click();
  try {
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 8000 });
  } catch {
    const tooMany = page.locator('text=/Too many requests|quá nhiều/i');
    if (await tooMany.isVisible()) {
      await page.waitForTimeout(45000);
      await page.locator('button[type=submit]').click();
    } else {
      const submitBtn = page.locator('button[type=submit]');
      if (await submitBtn.isVisible()) {
        await page.waitForTimeout(1500);
        await submitBtn.click();
      }
    }
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
  }
}

test.describe.serial('TASK-013: Real-stack Head Trainer & Veterinarian Simulator integration', () => {
  test.setTimeout(90_000);

  let prisma: any;
  let targetHorseId: string;
  let targetHorseName: string;
  let targetHorseWeight: number;
  let targetHorseStall: string;

  test.beforeAll(async () => {
    prisma = new PrismaClient();
    const horse = await prisma.horse.findUnique({
      where: { horseCode: TARGET_HORSE_CODE },
      include: {
        stallAllocations: {
          where: { isActive: true },
          include: { stall: true },
        },
      },
    });
    expect(horse).toBeTruthy();
    expect(horse.weightKg).toBe(490);
    expect(horse.stallAllocations.length).toBeGreaterThan(0);

    targetHorseId = horse.id;
    targetHorseName = horse.name;
    targetHorseWeight = horse.weightKg;
    targetHorseStall = horse.stallAllocations[0].stall.code;

    const staleSliceGWorkouts = await prisma.workoutSession.findMany({
      where: { trainingPlanId: SLICE_G_PLAN_ID, trainerNotes: SLICE_G_MARKER },
      select: { id: true },
    });
    const staleSliceGIds = staleSliceGWorkouts.map((row: { id: string }) => row.id);
    if (staleSliceGIds.length > 0) {
      await prisma.$transaction([
        prisma.auditLog.deleteMany({ where: { entityName: 'WorkoutSession', entityId: { in: staleSliceGIds } } }),
        prisma.workoutSession.deleteMany({ where: { id: { in: staleSliceGIds } } }),
      ]);
    }

    // Reset previous workout simulatorSession and status for clean deterministic trial run
    await prisma.simulatorSession.deleteMany({
      where: { workoutSessionId: TARGET_WORKOUT_ID },
    });
    await prisma.workoutSession.updateMany({
      where: { id: TARGET_WORKOUT_ID },
      data: { status: 'SCHEDULED' },
    });
    const examHorse = await prisma.horse.findUnique({
      where: { horseCode: 'QA-T013-EXAM-001' },
    });
    if (examHorse) {
      await prisma.simulatorSession.deleteMany({
        where: { horseIds: { has: examHorse.id } },
      });
    }
  });

  test.afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test('TASK-015: Direct access to port 5175 without session loads real catalogue from PostgreSQL without login screen', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    // 1. Root access without session or token
    await page.goto(`${SIM_BASE}/`);

    // Verify no login form exists
    await expect(page.locator('input[type=email]')).toHaveCount(0);
    await expect(page.locator('input[type=password]')).toHaveCount(0);

    // Verify direct catalogue badge loads
    await expect(page.locator('body')).toContainText(/Danh mục trực tiếp/i);

    // Open horse list modal
    const horseBtn = page.getByRole('button', { name: /Ngựa/i }).first();
    await expect(horseBtn).toBeVisible();
    await horseBtn.click();

    // Verify real horses from PostgreSQL catalogue are present
    const targetHorseTile = page.getByRole('button', { name: new RegExp(targetHorseName, 'i') }).first();
    await expect(targetHorseTile).toBeVisible();
    await targetHorseTile.click();

    // Verify real horse card displays authoritative master data: name, stall, weight
    await expect(page.locator('body')).toContainText(targetHorseName);
    await expect(page.locator('body')).toContainText(targetHorseStall);
    await expect(page.locator('body')).toContainText(`${targetHorseWeight} kg`);

    // Reload page and confirm persisted catalogue data remains identical without session
    await page.reload();
    await expect(page.locator('body')).toContainText(/Danh mục trực tiếp/i);
    await expect(page.locator('input[type=email]')).toHaveCount(0);

    // Save evidence screenshot
    if (process.env.CAPTURE_HISTORICAL_EVIDENCE) {
      await page.screenshot({ path: path.join(evidenceDir, 'task015_simulator_direct_catalogue.png') });
    }
  });

  test('Slice G: Trial Runs scheduling creates a TRIAL row visible after reload', async ({ page }) => {
    await signIn(page, TARGET_TRAINER_EMAIL);
    await page.goto(`${FE_BASE}/trials`);

    await page.getByRole('button', { name: /Lên lịch chạy thử|Schedule Trial Run/i }).first().click();

    const workoutType = page.locator('select:has(option[value="TRIAL"])');
    await expect(workoutType).toBeVisible();
    await expect(workoutType).toHaveValue('TRIAL');

    const planSelect = page.locator(`select:has(option[value="${SLICE_G_PLAN_ID}"])`);
    await planSelect.selectOption(SLICE_G_PLAN_ID);
    await page.locator('input[type="date"][min]').fill('2026-10-28');
    await page.locator('input[type="time"][min="04:00"]').fill('19:45');
    await page.locator('input[min="10"][max="70"]').fill('55');
    await page.locator('input[maxlength="100"]').fill('QA T013 Slice G Jockey');
    await page.locator('textarea[maxlength="500"]').fill(SLICE_G_MARKER);

    let createdId: string | undefined;
    try {
      const responsePromise = page.waitForResponse((response) =>
        response.request().method() === 'POST' &&
        response.url().includes(`/api/training/plans/${SLICE_G_PLAN_ID}/workouts`),
      );
      await page.getByRole('button', { name: /Save workout|Lưu buổi tập/i }).click();
      let response = await responsePromise;
      if (!response.ok()) {
        const warning = await response.json();
        expect(warning.code).toBe('WARNINGS_NEED_CONFIRMATION');
        const confirmedResponse = page.waitForResponse((candidate) =>
          candidate.request().method() === 'POST' &&
          candidate.url().includes(`/api/training/plans/${SLICE_G_PLAN_ID}/workouts`),
        );
        await page.getByRole('button', { name: /Save anyway|Vẫn lưu/i }).click();
        response = await confirmedResponse;
      }
      expect(response.ok()).toBe(true);
      const payload = await response.json();
      createdId = payload.data?.id ?? payload.id;
      expect(createdId).toBeTruthy();

      await page.reload();
      const createdRow = page.locator('tr', { hasText: 'QA T013 Trial Horse' }).filter({ hasText: '19:45' });
      await expect(createdRow).toBeVisible({ timeout: 15000 });
      await expect(createdRow.getByRole('button', { name: /Chạy mô phỏng|Run simulation/i })).toBeDisabled();
      await expect(createdRow.locator('[data-testid="trial-launch-timing"]')).toContainText(
        /Có thể chạy từ|Available from/i,
      );
    } finally {
      const created = await prisma.workoutSession.findMany({
        where: { trainingPlanId: SLICE_G_PLAN_ID, trainerNotes: SLICE_G_MARKER },
        select: { id: true },
      });
      const ids = created.map((row: { id: string }) => row.id);
      if (ids.length > 0) {
        await prisma.$transaction([
          prisma.auditLog.deleteMany({ where: { entityName: 'WorkoutSession', entityId: { in: ids } } }),
          prisma.workoutSession.deleteMany({ where: { id: { in: ids } } }),
        ]);
      }
    }
  });

  test('Head Trainer trial run: immutable setup, no obstacle authoring, stops at distance, DONE & summary, 1 finish packet & DB persistence', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await signIn(page, TARGET_TRAINER_EMAIL);
    await page.goto(`${FE_BASE}/trials`);

    // Verify row for QA Zephyr Wind exists and has launch action
    const horseLink = page.getByRole('link', { name: 'QA Zephyr Wind' });
    await expect(horseLink).toBeVisible({ timeout: 15000 });

    const trialRow = page.locator('tr', { has: horseLink });
    await expect(trialRow).toContainText(/Đã lên lịch|SCHEDULED/i);

    const runBtn = trialRow.getByRole('button', { name: /Chạy mô phỏng|Run simulation/i });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();

    // Track outbound sim:session_finished frames/requests
    let finishOutboundCount = 0;
    const pageListener = (p: any) => {
      p.on('websocket', (ws: any) => {
        ws.on('framesent', (frame: any) => {
          if (typeof frame.payload === 'string' && frame.payload.includes('sim:session_finished')) {
            finishOutboundCount++;
          }
        });
      });
      p.on('request', (req: any) => {
        const postData = req.postData();
        if (typeof postData === 'string' && postData.includes('sim:session_finished')) {
          finishOutboundCount++;
        }
      });
    };
    context.on('page', pageListener);

    // Launch simulation and capture popup
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      runBtn.click(),
    ]);

    await popup.waitForURL((url) => url.searchParams.has('sessionId'), { timeout: 15000 });
    await popup.waitForLoadState('networkidle');
    expect(popup.url()).toContain(`${SIM_BASE}/?sessionId=`);

    // 1. Verify Simulator UI renders real PostgreSQL data (no hash, no default)
    await expect(popup.locator('body')).toContainText('QA Zephyr Wind', { timeout: 15000 });
    await expect(popup.locator('body')).toContainText(`${targetHorseWeight} kg`); // 490 kg
    await expect(popup.locator('body')).toContainText(targetHorseStall); // STALL-QA01
    await expect(popup.locator('body')).toContainText('985 141 099 000 001'); // Standardized microchip

    // 2. Slice E: Verify Main-Web-issued setup is immutable
    await expect(popup.locator('[data-testid="prescribed-workout-notice"]')).toBeVisible();
    // Buttons for surface, distance and intensity must be disabled
    const surfaceSegment = popup.locator('div[aria-label="Mặt sân"] button').first();
    await expect(surfaceSegment).toBeDisabled();
    const distanceSegment = popup.locator('div[aria-label="Cự ly"] button').first();
    await expect(distanceSegment).toBeDisabled();
    const intensitySegment = popup.locator('div[aria-label="Cường độ"] button').first();
    await expect(intensitySegment).toBeDisabled();

    // 3. Slice E: Verify obstacle authoring is hidden (no authoritative obstacles prescribed)
    await expect(popup.locator('text=Chướng ngại để đặt')).toHaveCount(0);
    await expect(popup.getByRole('button', { name: 'Ngẫu nhiên' })).toHaveCount(0);

    // Slice H: keep the result form open before Simulator finishes. Returning focus must refresh it.
    await page.goto(`${FE_BASE}/training/sessions/${TARGET_WORKOUT_ID}/result`);
    await expect(page.locator('[data-testid="simulation-result-source"]')).toHaveCount(0);

    // 5. Start workout run at 1x to verify live telemetry on LiveMonitorPage (TASK-016)
    const startRunBtn = popup.getByRole('button', { name: /» Bắt đầu chạy thử/i });
    await expect(startRunBtn).toBeVisible();
    await startRunBtn.click();

    // TASK-016: Verify 1 Hz telemetry appears live on LiveMonitorPage
    const monitorPage = await context.newPage();
    await monitorPage.goto(`${FE_BASE}/training/monitor`);
    const liveCard = monitorPage.locator('article', { hasText: '985141099000001' }).or(
      monitorPage.locator('article', { hasText: 'km/h' }),
    ).first();
    await expect(liveCard).toBeVisible({ timeout: 15000 });
    await expect(liveCard).toContainText(/km\/h/);
    await expect(liveCard).toContainText(/bpm/);
    await expect(liveCard).toContainText(/°C/);
    await monitorPage.screenshot({ path: path.join(evidenceDir, 'task016_live_monitor_telemetry.png') });
    await monitorPage.close();

    // Set simulation speed to 60x for rapid deterministic completion
    const speed60Btn = popup.locator('button[aria-label="Tốc độ 60 lần"]');
    await expect(speed60Btn).toBeVisible();
    await speed60Btn.click();

    // 6. Slice E: At prescribed distance, runner stops, visibly transitions to DONE, summary card appears
    const phasePill = popup.locator('[data-testid="trial-phase-pill"]');
    await expect(phasePill).toContainText('DONE', { timeout: 35000 });

    const summaryCard = popup.locator('[data-testid="workout-summary-card"]');
    await expect(summaryCard).toBeVisible({ timeout: 5000 });
    await expect(popup.locator('[data-testid="workout-result-status"]')).toContainText('DONE');

    // Slice G: 60× changes wall-clock duration only; the chart still samples simulated seconds.
    const chartMeta = popup.locator('[data-testid="trial-chart-meta"]');
    await expect(chartMeta).toContainText(/60×/);
    await expect(chartMeta).toContainText(/thời gian mô phỏng/i);
    const chartSamples = Number(await chartMeta.getAttribute('data-sample-count'));
    expect(chartSamples).toBeGreaterThanOrEqual(90);

    // 7. Slice E: Verify exactly one outbound sim:session_finished wire packet
    expect(finishOutboundCount).toBe(1);
    context.off('page', pageListener);

    // 8. Capture completion screenshot
    if (process.env.CAPTURE_HISTORICAL_EVIDENCE) {
      await popup.screenshot({ path: path.join(evidenceDir, 'task013_workout_completed_sim.png') });
    }

    // 9. Verify PostgreSQL persistence directly
    const currentUrl = new URL(popup.url());
    const sessionId = currentUrl.searchParams.get('sessionId');
    expect(sessionId).toBeTruthy();

    const persistedSession = await prisma.simulatorSession.findUnique({
      where: { id: sessionId! },
    });
    expect(persistedSession).toBeTruthy();
    expect(persistedSession.status).toBe('COMPLETED');
    expect(persistedSession.finishedAt).not.toBeNull();
    expect(persistedSession.result).toBeTruthy();
    expect(persistedSession.result.distanceCompletedM).toBeGreaterThanOrEqual(1800);

    // Slice H: focus refresh imports objective values but does not auto-submit subjective trainer fields.
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const imported = page.locator('[data-testid="simulation-result-source"]');
    await expect(imported).toBeVisible({ timeout: 15000 });
    await expect(imported).toContainText(/Loaded from Simulator|Đã tải từ Simulator/i);
    await expect(page.locator('[data-testid="result-distance"]')).toHaveValue(
      String(persistedSession.result.distanceCompletedM),
    );
    await expect(page.locator('[data-testid="result-duration"]')).toHaveValue(
      /^\d{2}:\d{2}\.\d$/,
    );
    await expect(page.locator('[data-testid="result-peak-hr"]')).toHaveValue(
      String(persistedSession.result.peakHr),
    );
    await expect(page.locator('[data-testid="result-top-speed"]')).toHaveValue(
      String(persistedSession.result.topSpeedKmh),
    );
    await expect(page.locator('[data-testid="result-recovery-hr"]')).toHaveValue('');
    await expect(page.locator('[data-testid="result-completion"]')).toHaveValue('ACHIEVED');
    await expect(page.locator('[data-testid="result-performance-score"]')).toHaveValue('');
    await expect(page.locator('[data-testid="result-comment"]')).toHaveValue('');

    const unsubmittedWorkout = await prisma.workoutSession.findUnique({
      where: { id: persistedSession.workoutSessionId! },
      select: { status: true, resultRecordedAt: true },
    });
    expect(unsubmittedWorkout).toEqual({ status: 'SCHEDULED', resultRecordedAt: null });

    // R-11: Attempting to restart the completed workout session must be rejected with 409 SIMULATOR_SESSION_FINISHED
    const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('equiflow.tokens') || '{}'));
    const trainerToken = tokens.accessToken;
    expect(trainerToken).toBeTruthy();

    const restartRes = await page.request.post(
      `http://localhost:3000/api/simulator/workouts/${persistedSession.workoutSessionId}/start`,
      {
        headers: { Authorization: `Bearer ${trainerToken}` },
      },
    );
    expect(restartRes.status()).toBe(409);
    const restartJson = await restartRes.json();
    expect(restartJson.code || restartJson.message).toMatch(
      /SIMULATOR_SESSION_FINISHED|already been simulated and finished/i,
    );
    expect(restartJson.launchUrl).toBeUndefined();

    await popup.close();
    expect(consoleErrors).toEqual([]);
  });

  test('Veterinarian exam: no intro, UI finish -> sim:exam_finished -> ACK -> return/close -> auto-load on focus', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await signIn(page, TARGET_VET_EMAIL);
    await page.goto(`${FE_BASE}/medical/records/new?horseId=${targetHorseId}`);

    const startExamBtn = page.getByRole('button', { name: /Open Simulator Exam|Khám mô phỏng/i });
    await expect(startExamBtn).toBeVisible({ timeout: 15000 });
    await expect(startExamBtn).toBeEnabled();

    // Track outbound sim:exam_finished frames/requests to prove exactly one wire emission per click
    let examFinishedOutboundCount = 0;
    const pageListener = (p: any) => {
      p.on('websocket', (ws: any) => {
        ws.on('framesent', (frame: any) => {
          if (typeof frame.payload === 'string' && frame.payload.includes('sim:exam_finished')) {
            examFinishedOutboundCount++;
          }
        });
      });
      p.on('request', (req: any) => {
        const postData = req.postData();
        if (typeof postData === 'string' && postData.includes('sim:exam_finished')) {
          examFinishedOutboundCount++;
        }
      });
    };
    context.on('page', pageListener);

    // Launch exam simulation popup
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      startExamBtn.click(),
    ]);

    await popup.waitForURL((url) => url.searchParams.has('sessionId'), { timeout: 15000 });
    await popup.waitForLoadState('networkidle');
    expect(popup.url()).toContain(`${SIM_BASE}/?sessionId=`);
    expect(popup.url()).toContain('type=EXAM');

    // Slice E: Verify decorative intro overlay is bypassed (no overlay div on screen)
    await expect(popup.locator('div[class*="IntroOverlay_overlay"]')).toHaveCount(0);

    // Verify Simulator opened VetZone and clinical exam panel is directly visible
    const completeExamBtn = popup.locator('#btn-complete-exam, [data-testid="complete-exam-btn"]');
    await expect(completeExamBtn).toBeVisible({ timeout: 15000 });

    // Click to finish clinical examination
    await completeExamBtn.click();

    // Verify ACK received and completion notice displayed
    const alertNotice = popup.locator('[data-testid="exam-completed-alert"]');
    await expect(alertNotice).toBeVisible({ timeout: 10000 });
    await expect(alertNotice).toContainText(/Đã ghi nhận kết quả khám thành công vào PostgreSQL/i);

    // Assert R-10 / Slice E: exactly one outbound sim:exam_finished frame/request was emitted on wire
    expect(examFinishedOutboundCount).toBe(1);
    context.off('page', pageListener);

    // Slice E: Verify return/close action is visible after ACK
    const closeExamBtn = popup.locator('#btn-close-exam, [data-testid="close-exam-btn"]');
    await expect(closeExamBtn).toBeVisible();

    // Capture Simulator completion screenshot
    if (process.env.CAPTURE_HISTORICAL_EVIDENCE) {
      await popup.screenshot({ path: path.join(evidenceDir, 'task013_vet_exam_sim.png') });
    }

    // Click close/return action
    await closeExamBtn.click();
    if (!popup.isClosed()) {
      await popup.close();
    }

    // Slice E: Bring Main Web tab into focus — it must automatically load newest acknowledged measurements!
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // Assert measurements are auto-populated without requiring manual button click
    const weightInput = page.locator('input[min="200"][max="800"]');
    await expect(weightInput).toHaveValue(String(targetHorseWeight), { timeout: 10000 });

    const tempInput = page.locator('input[min="35"][max="43"]');
    const hrInput = page.locator('input[min="20"][max="120"]');
    const rrInput = page.locator('input[min="4"][max="60"]');

    const tempVal = parseFloat(await tempInput.inputValue());
    const hrVal = parseInt(await hrInput.inputValue(), 10);
    const rrVal = parseInt(await rrInput.inputValue(), 10);

    expect(tempVal).toBeGreaterThanOrEqual(35.0);
    expect(tempVal).toBeLessThanOrEqual(43.0);
    expect(hrVal).toBeGreaterThanOrEqual(20);
    expect(hrVal).toBeLessThanOrEqual(120);
    expect(rrVal).toBeGreaterThanOrEqual(4);
    expect(rrVal).toBeLessThanOrEqual(60);

    // Assert measurement source alert is visible
    await expect(page.locator('body')).toContainText(/equiflow-sim-v3/i);

    // Verify manual fallback load button remains visible and operational
    const manualLoadBtn = page.getByRole('button', { name: /Load Simulator Measurements|Tải kết quả từ mô phỏng/i });
    await expect(manualLoadBtn).toBeVisible();
    await expect(manualLoadBtn).toBeEnabled();

    // Capture Main Web auto-populated evidence
    if (process.env.CAPTURE_HISTORICAL_EVIDENCE) {
      await page.screenshot({ path: path.join(evidenceDir, 'task013_vet_main_web_loaded.png') });
    }

    // Assert DB persistence directly via Prisma
    const latestExamSession = await prisma.simulatorSession.findFirst({
      where: {
        type: 'EXAM',
        status: 'COMPLETED',
        horseIds: { has: targetHorseId },
      },
      orderBy: { finishedAt: 'desc' },
    });

    expect(latestExamSession).toBeTruthy();
    expect(latestExamSession.finishedAt).not.toBeNull();
    const resultJson = latestExamSession.result as any;
    expect(resultJson).toBeTruthy();
    expect(resultJson.metrics?.weight?.value).toBe(targetHorseWeight);
    expect(resultJson.metrics?.temperature?.value).toBeGreaterThanOrEqual(35);

    expect(consoleErrors).toEqual([]);
  });

  test('VitalsDisplay: displays within/outside reference range badges and disclaims health/injury/lock status', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await signIn(page, TARGET_VET_EMAIL);

    // Verify on existing medical record for locked/injured horse HR-000002
    const lockedRecord = await prisma.medicalRecord.findFirst({
      where: {
        horse: {
          OR: [{ isMedicalLocked: true }, { status: 'INJURED' }],
        },
      },
      include: { horse: true },
    });
    expect(lockedRecord).toBeTruthy();
    expect(lockedRecord.horse.isMedicalLocked || lockedRecord.horse.status === 'INJURED').toBe(true);

    await page.goto(`${FE_BASE}/medical/records/${lockedRecord.id}`);

    // Verify vital badges render "Trong dải tham chiếu" / "Within reference range"
    const inRangeBadge = page.locator('text=/Trong dải tham chiếu|Within reference range/i').first();
    await expect(inRangeBadge).toBeVisible({ timeout: 15000 });

    // Verify vital range disclaimer is visible
    const disclaimer = page.locator('[data-testid="vitals-range-disclaimer"]');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText(/Nhãn dải tham chiếu chỉ phản ánh|Reference range labels classify/i);

    // Verify injured/locked horse state remains completely separate from in-range vital labels
    // The horse status badge or lock indication remains active on the page
    const horseStatusInfo = page.locator('body');
    await expect(horseStatusInfo).toContainText(/INJURED|Khóa y tế|Medical Lock|Đang chấn thương/i);

    // Save screenshot evidence
    if (process.env.CAPTURE_HISTORICAL_EVIDENCE) {
      await page.screenshot({ path: path.join(evidenceDir, 'task013_vitals_reference_range.png') });
    }

    expect(consoleErrors).toEqual([]);
  });

  test('Persistence and reload: Simulator and Main Web refetch latest data after page reload', async ({ page }) => {
    // 1. Reload Main Web Record Form page and reload measurements
    await signIn(page, TARGET_VET_EMAIL);
    await page.goto(`${FE_BASE}/medical/records/new?horseId=${targetHorseId}`);

    const loadExamBtn = page.getByRole('button', { name: /Load Simulator Measurements|Tải kết quả từ mô phỏng/i });
    await loadExamBtn.click();

    const weightInput = page.locator('input[min="200"][max="800"]');
    await expect(weightInput).toHaveValue(String(targetHorseWeight), { timeout: 10000 });

    // 2. Query completed exam session and verify Simulator loads completed session cleanly
    const latestExamSession = await prisma.simulatorSession.findFirst({
      where: {
        type: 'EXAM',
        status: 'COMPLETED',
        horseIds: { has: targetHorseId },
      },
      orderBy: { finishedAt: 'desc' },
    });
    expect(latestExamSession).toBeTruthy();

    // 3. Terminal session verification in Simulator: once COMPLETED, Simulator fails closed with finished notice
    await page.goto(`${SIM_BASE}/?sessionId=${latestExamSession.id}`);
    await expect(page.locator('body')).toContainText(/SIMULATOR_SESSION_FINISHED|Simulation session has already finished/i);
    await page.reload();
    await expect(page.locator('body')).toContainText(/SIMULATOR_SESSION_FINISHED|Simulation session has already finished/i);
  });

  test('R-12: Veterinarian exam on horse with absent master weight (QA T013 Exam Horse)', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const examHorse = await prisma.horse.findUnique({
      where: { horseCode: 'QA-T013-EXAM-001' },
    });
    expect(examHorse).toBeTruthy();
    expect(examHorse.weightKg).toBeNull();

    await signIn(page, TARGET_VET_EMAIL);
    await page.goto(`${FE_BASE}/medical/records/new?horseId=${examHorse.id}`);

    let examFinishedOutboundCount = 0;
    const pageListener = (p: any) => {
      p.on('websocket', (ws: any) => {
        ws.on('framesent', (frame: any) => {
          if (typeof frame.payload === 'string' && frame.payload.includes('sim:exam_finished')) {
            examFinishedOutboundCount++;
          }
        });
      });
      p.on('request', (req: any) => {
        const postData = req.postData();
        if (typeof postData === 'string' && postData.includes('sim:exam_finished')) {
          examFinishedOutboundCount++;
        }
      });
    };
    context.on('page', pageListener);

    const examSimBtn = page.getByRole('button', { name: /Open Simulator Exam|Khám mô phỏng/i });
    await expect(examSimBtn).toBeVisible({ timeout: 15000 });

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      examSimBtn.click(),
    ]);

    await popup.waitForURL((url) => url.searchParams.has('sessionId'), { timeout: 15000 });
    await popup.waitForLoadState('networkidle');
    expect(popup.url()).toContain(`${SIM_BASE}/?sessionId=`);
    expect(popup.url()).toContain('type=EXAM');

    // Assert weight displays "Chưa có dữ liệu" rather than a fabricated number
    await expect(popup.locator('text=Chưa có dữ liệu')).toBeVisible({ timeout: 15000 });

    // Complete exam
    const completeExamBtn = popup.locator('#btn-complete-exam, [data-testid="complete-exam-btn"]');
    await expect(completeExamBtn).toBeVisible();
    await completeExamBtn.click();

    // Verify ACK received
    const alertNotice = popup.locator('[data-testid="exam-completed-alert"]');
    await expect(alertNotice).toBeVisible({ timeout: 10000 });
    expect(examFinishedOutboundCount).toBe(1);
    context.off('page', pageListener);

    // Close Simulator tab
    const closeExamBtn = popup.locator('#btn-close-exam, [data-testid="close-exam-btn"]');
    await closeExamBtn.click();
    if (!popup.isClosed()) {
      await popup.close();
    }

    // Bring Main Web into focus to auto-load measurements
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // Assert temperature, resting HR, respiratory rate are auto-loaded
    const tempInput = page.locator('input[min="35"][max="43"]');
    await expect(tempInput).not.toHaveValue('', { timeout: 10000 });

    // Assert weight input remains empty without false validation error
    const weightInput = page.locator('input[min="200"][max="800"]');
    await expect(weightInput).toHaveValue('');

    // Assert DB persistence has null weight
    const examSession = await prisma.simulatorSession.findFirst({
      where: {
        type: 'EXAM',
        status: 'COMPLETED',
        horseIds: { has: examHorse.id },
      },
      orderBy: { finishedAt: 'desc' },
    });
    expect(examSession).toBeTruthy();
    const resultJson = examSession.result as any;
    expect(resultJson.metrics?.weight?.value).toBeNull();

    expect(consoleErrors).toEqual([]);
  });

  test('R-13: Medical record list displays real horse name and horse code without raw UUID fallback', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await signIn(page, TARGET_VET_EMAIL);
    await page.goto(`${FE_BASE}/medical/records`);

    // Verify record table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Verify QA T013 Exam Horse appears with its name and code
    await expect(page.locator('tbody')).toContainText('QA T013 Exam Horse');
    await expect(page.locator('tbody')).toContainText('QA-T013-EXAM-001');

    // Assert no row in the table contains a raw UUID in the horse cell
    const horseCells = await page.locator('tbody tr td:nth-child(2)').allTextContents();
    expect(horseCells.length).toBeGreaterThan(0);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const cellText of horseCells) {
      expect(cellText.trim()).not.toMatch(uuidRegex);
    }

    if (process.env.CAPTURE_HISTORICAL_EVIDENCE) {
      await page.screenshot({ path: path.join(evidenceDir, 'task013_medical_record_list_names.png') });
    }
    expect(consoleErrors).toEqual([]);
  });

  test('TASK-016: Emergency stop in Simulator stops running trial and persists ABORTED_INJURY once', async ({ page, context }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // Reset TARGET_WORKOUT_ID for emergency stop test
    await prisma.simulatorSession.deleteMany({
      where: { workoutSessionId: TARGET_WORKOUT_ID },
    });
    await prisma.workoutSession.updateMany({
      where: { id: TARGET_WORKOUT_ID },
      data: { status: 'SCHEDULED' },
    });

    await signIn(page, TARGET_TRAINER_EMAIL);
    await page.goto(`${FE_BASE}/trials`);

    const horseLink = page.getByRole('link', { name: 'QA Zephyr Wind' });
    await expect(horseLink).toBeVisible({ timeout: 15000 });
    const trialRow = page.locator('tr', { has: horseLink });
    const runBtn = trialRow.getByRole('button', { name: /Chạy mô phỏng|Run simulation/i });
    await expect(runBtn).toBeEnabled();

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      runBtn.click(),
    ]);

    await popup.waitForURL((url) => url.searchParams.has('sessionId'), { timeout: 15000 });
    await popup.waitForLoadState('networkidle');

    // Start workout
    const startRunBtn = popup.getByRole('button', { name: /» Bắt đầu chạy thử/i });
    await expect(startRunBtn).toBeVisible();
    await startRunBtn.click();

    // Verify it is running
    const phasePill = popup.locator('[data-testid="trial-phase-pill"]');
    await expect(phasePill).toContainText(/Đang chạy|RUNNING/i, { timeout: 10000 });

    // Emergency stop: click "Dừng phiên"
    const stopBtn = popup.getByRole('button', { name: 'Dừng phiên' });
    await expect(stopBtn).toBeVisible();
    await stopBtn.click();

    // Verify it transitions to ABORTED_INJURY
    await expect(phasePill).toContainText('ABORTED_INJURY', { timeout: 10000 });
    const summaryCard = popup.locator('[data-testid="workout-summary-card"]');
    await expect(summaryCard).toBeVisible({ timeout: 5000 });
    await expect(popup.locator('[data-testid="workout-result-status"]')).toContainText('Dừng do chấn thương');

    // Screenshot evidence
    await popup.screenshot({ path: path.join(evidenceDir, 'task016_simulator_emergency_stop.png') });

    // Verify DB persistence
    const currentUrl = new URL(popup.url());
    const sessionId = currentUrl.searchParams.get('sessionId');
    expect(sessionId).toBeTruthy();

    const abortedSession = await prisma.simulatorSession.findUnique({
      where: { id: sessionId! },
    });
    expect(abortedSession).toBeTruthy();
    expect(abortedSession.status).toBe('ABORTED_INJURY');
    expect(abortedSession.finishedAt).not.toBeNull();

    await popup.close();
    expect(consoleErrors).toEqual([]);
  });

  test('TASK-016: Medical lock blocks starting high-intensity workout and retired horse cannot be simulated', async ({ page }) => {
    await signIn(page, TARGET_TRAINER_EMAIL);
    const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('equiflow.tokens') || '{}'));
    const trainerToken = tokens.accessToken;
    expect(trainerToken).toBeTruthy();

    // 1. Find a horse with active medical lock
    const lockedHorse = await prisma.horse.findFirst({
      where: { isMedicalLocked: true, deletedAt: null },
    });
    expect(lockedHorse).toBeTruthy();

    // Create a scheduled HEAVY workout for the locked horse
    const heavyWorkoutId = '00000000-0000-4000-a016-000000000001';
    await prisma.simulatorSession.deleteMany({ where: { workoutSessionId: heavyWorkoutId } });
    await prisma.workoutSession.deleteMany({ where: { id: heavyWorkoutId } });

    await prisma.workoutSession.create({
      data: {
        id: heavyWorkoutId,
        trainingPlanId: SLICE_G_PLAN_ID,
        horseId: lockedHorse!.id,
        workoutType: 'TRIAL',
        intensity: 'HEAVY',
        scheduledDate: new Date(Date.now() - 3600000),
        status: 'SCHEDULED',
        distanceMeters: 1000,
        targetDurationSeconds: 60,
      },
    });

    try {
      const lockRes = await page.request.post(
        `http://localhost:3000/api/simulator/workouts/${heavyWorkoutId}/start`,
        { headers: { Authorization: `Bearer ${trainerToken}` } },
      );
      expect(lockRes.status()).toBe(409);
      const lockJson = await lockRes.json();
      expect(lockJson.code).toBe('MEDICAL_LOCK_ACTIVE');
    } finally {
      await prisma.workoutSession.deleteMany({ where: { id: heavyWorkoutId } });
    }

    // 2. Find a retired horse
    const retiredHorse = await prisma.horse.findFirst({
      where: { status: 'RETIRED', deletedAt: null },
    });
    expect(retiredHorse).toBeTruthy();

    const retiredWorkoutId = '00000000-0000-4000-a016-000000000002';
    await prisma.simulatorSession.deleteMany({ where: { workoutSessionId: retiredWorkoutId } });
    await prisma.workoutSession.deleteMany({ where: { id: retiredWorkoutId } });

    await prisma.workoutSession.create({
      data: {
        id: retiredWorkoutId,
        trainingPlanId: SLICE_G_PLAN_ID,
        horseId: retiredHorse!.id,
        workoutType: 'TRIAL',
        intensity: 'LIGHT',
        scheduledDate: new Date(Date.now() - 3600000),
        status: 'SCHEDULED',
        distanceMeters: 1000,
        targetDurationSeconds: 60,
      },
    });

    try {
      const retiredRes = await page.request.post(
        `http://localhost:3000/api/simulator/workouts/${retiredWorkoutId}/start`,
        { headers: { Authorization: `Bearer ${trainerToken}` } },
      );
      expect(retiredRes.status()).toBe(400);
      const retiredJson = await retiredRes.json();
      expect(retiredJson.code).toBe('HORSE_RETIRED');
    } finally {
      await prisma.workoutSession.deleteMany({ where: { id: retiredWorkoutId } });
    }
  });

  test('TASK-016: Network disconnect for 15s marks running session ABORTED_INJURY in PostgreSQL', async ({ page, context }) => {
    // Reset TARGET_WORKOUT_ID
    await prisma.simulatorSession.deleteMany({
      where: { workoutSessionId: TARGET_WORKOUT_ID },
    });
    await prisma.workoutSession.updateMany({
      where: { id: TARGET_WORKOUT_ID },
      data: { status: 'SCHEDULED' },
    });

    await signIn(page, TARGET_TRAINER_EMAIL);
    await page.goto(`${FE_BASE}/trials`);

    const horseLink = page.getByRole('link', { name: 'QA Zephyr Wind' });
    await expect(horseLink).toBeVisible({ timeout: 15000 });
    const trialRow = page.locator('tr', { has: horseLink });
    const runBtn = trialRow.getByRole('button', { name: /Chạy mô phỏng|Run simulation/i });
    await expect(runBtn).toBeEnabled();

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      runBtn.click(),
    ]);

    await popup.waitForURL((url) => url.searchParams.has('sessionId'), { timeout: 15000 });
    await popup.waitForLoadState('networkidle');

    const currentUrl = new URL(popup.url());
    const sessionId = currentUrl.searchParams.get('sessionId');
    expect(sessionId).toBeTruthy();

    // Start workout
    const startRunBtn = popup.getByRole('button', { name: /» Bắt đầu chạy thử/i });
    await expect(startRunBtn).toBeVisible();
    await startRunBtn.click();

    // Verify it is running
    const phasePill = popup.locator('[data-testid="trial-phase-pill"]');
    await expect(phasePill).toContainText(/Đang chạy|RUNNING/i, { timeout: 10000 });

    // Verify session became RUNNING in PostgreSQL
    await expect.poll(async () => {
      const s = await prisma.simulatorSession.findUnique({ where: { id: sessionId! } });
      return s?.status;
    }, { timeout: 10000 }).toBe('RUNNING');

    // Disconnect: abruptly close popup while running
    await popup.close();

    // Wait for 15s disconnect grace period to elapse
    await page.waitForTimeout(16000);

    // Verify session was marked ABORTED_INJURY in DB
    const finalSession = await prisma.simulatorSession.findUnique({
      where: { id: sessionId! },
    });
    expect(finalSession).toBeTruthy();
    expect(finalSession.status).toBe('ABORTED_INJURY');
    expect(finalSession.finishedAt).not.toBeNull();
    const res = finalSession.result as any;
    expect(res?.abortReason).toBe('DISCONNECT_TIMEOUT_15S');
  });

  test('TASK-016 / CR-023: Multi-trainer ownership scoping and fail-closed start check', async ({ page }) => {
    const TARGET_TRAINER2_EMAIL = 'qa-trainer2@gmail.com';

    // 0. Ensure TARGET_WORKOUT_ID is in its deterministic seed state
    await prisma.simulatorSession.deleteMany({
      where: { workoutSessionId: TARGET_WORKOUT_ID },
    });
    await prisma.workoutSession.updateMany({
      where: { id: TARGET_WORKOUT_ID },
      data: {
        status: 'SCHEDULED',
        trainerNotes: 'Deterministic QA Head Trainer Trial Run',
        statusReason: null,
        resultRecordedAt: null,
        resultRecordedById: null,
        resultUpdatedAt: null,
        resultUpdatedById: null,
        actualDistanceMeters: null,
        actualTimeSeconds: null,
        actualSurface: null,
        trackCondition: null,
        heartRatePeak: null,
        heartRateRecovery: null,
        topSpeedKmh: null,
        averageSpeedKmh: null,
        recoveryTimeMinutes: null,
        staminaScore: null,
        performanceScore: null,
        completionLevel: null,
        resultNotes: null,
      },
    });

    const initialSessions = await prisma.simulatorSession.findMany({
      where: { workoutSessionId: TARGET_WORKOUT_ID },
      select: { id: true },
    });
    const initialSessionIdSet = new Set(initialSessions.map((s) => s.id));
    let testCreatedSessionId: string | null = null;

    try {
      // 5a. Capture exact PostgreSQL baseline before any cross-trainer attacks
      const baselineWorkout = await prisma.workoutSession.findUnique({
        where: { id: TARGET_WORKOUT_ID },
        include: { simulatorSession: true },
      });
      expect(baselineWorkout).toBeTruthy();
      expect(baselineWorkout!.trainerNotes).toBe('Deterministic QA Head Trainer Trial Run');
      const baselinePlanId = baselineWorkout!.trainingPlanId;
      const baselineWorkoutCount = await prisma.workoutSession.count({
        where: { trainingPlanId: baselinePlanId },
      });
      const baselineTotalWorkouts = await prisma.workoutSession.count();

      // 1a. Sign in as Trainer 2
      await signIn(page, TARGET_TRAINER2_EMAIL);

      // 1b. Obtain Trainer 2 auth token
      const tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('equiflow.tokens') || '{}'));
      const trainer2Token = tokens.accessToken;
      expect(trainer2Token).toBeTruthy();

      // 1c. Trainer 2 visits Trial Runs page — cannot see Trainer 1 trial
      await page.goto(`${FE_BASE}/trials`);
      await page.waitForLoadState('networkidle');
      const trainer1HorseLink = page.getByRole('link', { name: 'QA Zephyr Wind' });
      await expect(trainer1HorseLink).not.toBeVisible();

      // 1d. Trainer 2 visits Training Plans page — cannot see Trainer 1 plan
      await page.goto(`${FE_BASE}/training/plans`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('QA-GA-000001')).not.toBeVisible();

      // 1e. Trainer 2 API access to Trainer 1 plan and workout returns 404
      const planGetRes = await page.request.get(
        `http://localhost:3000/api/training/plans/${baselinePlanId}`,
        { headers: { Authorization: `Bearer ${trainer2Token}` } },
      );
      expect(planGetRes.status()).toBe(404);

      const workoutGetRes = await page.request.get(
        `http://localhost:3000/api/training/workouts/${TARGET_WORKOUT_ID}`,
        { headers: { Authorization: `Bearer ${trainer2Token}` } },
      );
      expect(workoutGetRes.status()).toBe(404);

      // 2. Cross-trainer start returns 403 Forbidden
      const forbiddenStartRes = await page.request.post(
        `http://localhost:3000/api/simulator/workouts/${TARGET_WORKOUT_ID}/start`,
        { headers: { Authorization: `Bearer ${trainer2Token}` } },
      );
      expect(forbiddenStartRes.status()).toBe(403);
      const forbiddenStartJson = await forbiddenStartRes.json();
      expect(forbiddenStartJson.message).toContain('another trainer');

      // 3. Cross-trainer create and repeat-create against Trainer 1 plan return 403 Forbidden
      const groom = await prisma.user.findFirst({
        where: { role: 'GROOM', status: 'ACTIVE' },
      });
      expect(groom).toBeTruthy();

      const crossCreateRes = await page.request.post(
        `http://localhost:3000/api/training/plans/${baselinePlanId}/workouts`,
        {
          headers: { Authorization: `Bearer ${trainer2Token}`, 'Content-Type': 'application/json' },
          data: {
            scheduledDate: new Date(Date.now() + 86400000).toISOString(),
            phaseId: 'phase-1',
            workoutType: 'CANTER',
            intensity: 'MEDIUM',
            distanceMeters: 1200,
            trackSurface: 'TURF',
            assignedStaffUserId: groom!.id,
            trainerNotes: 'UNAUTHORIZED_CROSS_TRAINER_CREATE',
          },
        },
      );
      expect(crossCreateRes.status()).toBe(403);
      const crossCreateJson = await crossCreateRes.json();
      expect(crossCreateJson.message).toContain('another trainer');

      const crossRepeatRes = await page.request.post(
        `http://localhost:3000/api/training/plans/${baselinePlanId}/workouts/repeat`,
        {
          headers: { Authorization: `Bearer ${trainer2Token}`, 'Content-Type': 'application/json' },
          data: {
            scheduledDate: new Date(Date.now() + 86400000).toISOString(),
            phaseId: 'phase-1',
            workoutType: 'CANTER',
            intensity: 'MEDIUM',
            distanceMeters: 1200,
            trackSurface: 'TURF',
            assignedStaffUserId: groom!.id,
            weekdays: [1],
            until: '2026-11-15',
            trainerNotes: 'UNAUTHORIZED_CROSS_TRAINER_REPEAT',
          },
        },
      );
      expect(crossRepeatRes.status()).toBe(403);
      const crossRepeatJson = await crossRepeatRes.json();
      expect(crossRepeatJson.message).toContain('another trainer');

      // 4. Cross-trainer update, cancel, restore and record-result return 403 Forbidden
      const crossUpdateRes = await page.request.patch(
        `http://localhost:3000/api/training/workouts/${TARGET_WORKOUT_ID}`,
        {
          headers: { Authorization: `Bearer ${trainer2Token}`, 'Content-Type': 'application/json' },
          data: { trainerNotes: 'MALICIOUS_UPDATE_ATTEMPT' },
        },
      );
      expect(crossUpdateRes.status()).toBe(403);
      const crossUpdateJson = await crossUpdateRes.json();
      expect(crossUpdateJson.message).toContain('another trainer');

      const crossCancelRes = await page.request.post(
        `http://localhost:3000/api/training/workouts/${TARGET_WORKOUT_ID}/cancel`,
        {
          headers: { Authorization: `Bearer ${trainer2Token}`, 'Content-Type': 'application/json' },
          data: { reason: 'PLAN_CHANGE', note: 'Malicious cancel attempt by other trainer' },
        },
      );
      expect(crossCancelRes.status()).toBe(403);
      const crossCancelJson = await crossCancelRes.json();
      expect(crossCancelJson.message).toContain('another trainer');

      const crossRestoreRes = await page.request.post(
        `http://localhost:3000/api/training/workouts/${TARGET_WORKOUT_ID}/restore`,
        {
          headers: { Authorization: `Bearer ${trainer2Token}`, 'Content-Type': 'application/json' },
          data: {},
        },
      );
      expect(crossRestoreRes.status()).toBe(403);
      const crossRestoreJson = await crossRestoreRes.json();
      expect(crossRestoreJson.message).toContain('another trainer');

      const crossRecordRes = await page.request.post(
        `http://localhost:3000/api/training/workouts/${TARGET_WORKOUT_ID}/result`,
        {
          headers: { Authorization: `Bearer ${trainer2Token}`, 'Content-Type': 'application/json' },
          data: {
            actualDistanceMeters: 1000,
            actualTimeSeconds: 65,
            performanceScore: 8,
            completionLevel: 'ACHIEVED',
            trainerNotes: 'Malicious result notes by other trainer',
          },
        },
      );
      expect(crossRecordRes.status()).toBe(403);
      const crossRecordJson = await crossRecordRes.json();
      expect(crossRecordJson.message).toContain('another trainer');

      // 5b. Assert exact PostgreSQL baseline: zero records created/updated, state/result preserved
      const afterWorkout = await prisma.workoutSession.findUnique({
        where: { id: TARGET_WORKOUT_ID },
        include: { simulatorSession: true },
      });
      expect(afterWorkout).toBeTruthy();
      const afterWorkoutCount = await prisma.workoutSession.count({
        where: { trainingPlanId: baselinePlanId },
      });
      const afterTotalWorkouts = await prisma.workoutSession.count();

      expect(afterWorkoutCount).toBe(baselineWorkoutCount);
      expect(afterTotalWorkouts).toBe(baselineTotalWorkouts);
      expect(afterWorkout!.status).toBe(baselineWorkout!.status);
      expect(afterWorkout!.trainerNotes).toBe(baselineWorkout!.trainerNotes);
      expect(afterWorkout!.statusReason).toBe(baselineWorkout!.statusReason);
      expect(afterWorkout!.resultRecordedAt).toBe(baselineWorkout!.resultRecordedAt);
      expect(afterWorkout!.actualTimeSeconds).toBe(baselineWorkout!.actualTimeSeconds);
      expect(afterWorkout!.updatedAt.getTime()).toBe(baselineWorkout!.updatedAt.getTime());

      // 6. Trainer 1 can still see and use its own trial
      await signIn(page, TARGET_TRAINER_EMAIL);
      await page.goto(`${FE_BASE}/trials`);
      await page.waitForLoadState('networkidle');

      const horseLink = page.getByRole('link', { name: 'QA Zephyr Wind' });
      await expect(horseLink).toBeVisible({ timeout: 15000 });
      const trialRow = page.locator('tr', { has: horseLink });
      const runBtn = trialRow.getByRole('button', { name: /Chạy mô phỏng|Run simulation/i });
      await expect(runBtn).toBeVisible();
      await expect(runBtn).toBeEnabled();

      const trainer1Tokens = await page.evaluate(() => JSON.parse(localStorage.getItem('equiflow.tokens') || '{}'));
      const trainer1Token = trainer1Tokens.accessToken;
      expect(trainer1Token).toBeTruthy();

      const trainer1StartRes = await page.request.post(
        `http://localhost:3000/api/simulator/workouts/${TARGET_WORKOUT_ID}/start`,
        { headers: { Authorization: `Bearer ${trainer1Token}` } },
      );
      expect(trainer1StartRes.status()).toBe(201);
      const trainer1StartJson = await trainer1StartRes.json();
      const startData = trainer1StartJson.data || trainer1StartJson;
      expect(startData.launchUrl).toBeTruthy();
      expect(startData.sessionId).toBeTruthy();
      testCreatedSessionId = startData.sessionId;
    } finally {
      // 1. Delete only SimulatorSession rows created for TARGET_WORKOUT_ID by this test
      const currentSessions = await prisma.simulatorSession.findMany({
        where: { workoutSessionId: TARGET_WORKOUT_ID },
        select: { id: true },
      });
      const createdIdsToDelete = currentSessions
        .map((s) => s.id)
        .filter((id) => !initialSessionIdSet.has(id) || id === testCreatedSessionId);

      if (createdIdsToDelete.length > 0) {
        await prisma.simulatorSession.deleteMany({
          where: {
            id: { in: createdIdsToDelete },
            workoutSessionId: TARGET_WORKOUT_ID,
          },
        });
      }

      // 2. Restore TARGET_WORKOUT_ID to its deterministic seed state:
      //    status SCHEDULED,
      //    trainerNotes "Deterministic QA Head Trainer Trial Run",
      //    statusReason null,
      //    resultRecordedAt/resultRecordedById/resultUpdatedAt/resultUpdatedById null,
      //    result/result metric fields null as defined by seed-manual-qa.ts.
      await prisma.workoutSession.updateMany({
        where: { id: TARGET_WORKOUT_ID },
        data: {
          status: 'SCHEDULED',
          trainerNotes: 'Deterministic QA Head Trainer Trial Run',
          statusReason: null,
          resultRecordedAt: null,
          resultRecordedById: null,
          resultUpdatedAt: null,
          resultUpdatedById: null,
          actualDistanceMeters: null,
          actualTimeSeconds: null,
          actualSurface: null,
          trackCondition: null,
          heartRatePeak: null,
          heartRateRecovery: null,
          topSpeedKmh: null,
          averageSpeedKmh: null,
          recoveryTimeMinutes: null,
          staminaScore: null,
          performanceScore: null,
          completionLevel: null,
          resultNotes: null,
        },
      });

      // 3. Assert the exact test-created session residue count is zero
      const residueCount = await prisma.simulatorSession.count({
        where: {
          workoutSessionId: TARGET_WORKOUT_ID,
          id: { in: createdIdsToDelete.length > 0 ? createdIdsToDelete : ['__none__'] },
        },
      });
      expect(residueCount).toBe(0);

      // Verify TARGET_WORKOUT_ID has returned to deterministic seed state
      const restoredWorkout = await prisma.workoutSession.findUnique({
        where: { id: TARGET_WORKOUT_ID },
      });
      expect(restoredWorkout?.status).toBe('SCHEDULED');
      expect(restoredWorkout?.trainerNotes).toBe('Deterministic QA Head Trainer Trial Run');
      expect(restoredWorkout?.statusReason).toBeNull();
      expect(restoredWorkout?.resultRecordedAt).toBeNull();
      expect(restoredWorkout?.resultRecordedById).toBeNull();
      expect(restoredWorkout?.resultUpdatedAt).toBeNull();
      expect(restoredWorkout?.resultUpdatedById).toBeNull();
      expect(restoredWorkout?.actualDistanceMeters).toBeNull();
      expect(restoredWorkout?.actualTimeSeconds).toBeNull();
      expect(restoredWorkout?.actualSurface).toBeNull();
      expect(restoredWorkout?.trackCondition).toBeNull();
      expect(restoredWorkout?.heartRatePeak).toBeNull();
      expect(restoredWorkout?.heartRateRecovery).toBeNull();
      expect(restoredWorkout?.topSpeedKmh).toBeNull();
      expect(restoredWorkout?.performanceScore).toBeNull();
      expect(restoredWorkout?.completionLevel).toBeNull();
    }
  });

  test('TASK-016 / CR-023: TrialRunsPage auto-expands date filter onSaved and syncs with Weekly Calendar', async ({ page }) => {
    const TEST_MARKER = 'TASK-016-CR023-AUTOEXPAND';
    const OUTSIDE_DATE = '2026-11-20'; // Outside the default 14-day window

    // Clean up any stale sessions with this marker
    const stale = await prisma.workoutSession.findMany({
      where: { trainerNotes: TEST_MARKER },
      select: { id: true },
    });
    if (stale.length > 0) {
      const staleIds = stale.map((s: { id: string }) => s.id);
      await prisma.simulatorSession.deleteMany({ where: { workoutSessionId: { in: staleIds } } });
      await prisma.workoutSession.deleteMany({ where: { id: { in: staleIds } } });
    }

    try {
      // 1. Sign in as Trainer 1
      await signIn(page, TARGET_TRAINER_EMAIL);
      await page.goto(`${FE_BASE}/trials`);
      await page.waitForLoadState('networkidle');

      // 2. Open Schedule Trial dialog
      const scheduleBtn = page.getByRole('button', { name: /\+ (Lên lịch chạy thử|Schedule Trial Run)/i });
      await expect(scheduleBtn).toBeVisible({ timeout: 10000 });
      await scheduleBtn.click();

      // Modal appears
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Fill in date outside current filter
      const dateInput = dialog.locator('input[type="date"]');
      await dateInput.fill(OUTSIDE_DATE);

      // Fill target speed (required for TRIAL: 10 - 70)
      const speedInput = dialog.getByLabel(/Tốc độ mục tiêu|Target speed/i);
      await speedInput.fill('48');

      // Fill jockey name (required for TRIAL)
      const jockeyInput = dialog.getByLabel(/Nài ngựa|Jockey/i);
      await jockeyInput.fill('QA CR023 Auto Jockey');

      // Fill notes to easily locate
      const notesArea = dialog.getByLabel(/Chỉ dẫn|Instructions/i);
      await notesArea.fill(TEST_MARKER);

      // Submit
      const saveBtn = dialog.getByRole('button', { name: /Save workout|Lưu buổi tập|Save anyway|Lưu bằng mọi giá/i });
      await saveBtn.click();

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 10000 });

      // Verify the 'to' date filter on TrialRunsPage automatically expanded to OUTSIDE_DATE
      const toFilter = page.locator('input[type="date"]').nth(1);
      await expect(toFilter).toHaveValue(OUTSIDE_DATE);

      // Verify the new trial session appears in the table with its jockey and simulation action
      const jockeyCell = page.locator('td', { hasText: 'QA CR023 Auto Jockey' });
      await expect(jockeyCell).toBeVisible({ timeout: 10000 });

      const newRow = page.locator('tr', { has: jockeyCell });
      const runBtn = newRow.getByRole('button', { name: /Chạy mô phỏng|Run simulation/i });
      await expect(runBtn).toBeVisible();

      // 3. Navigate to Weekly Training Calendar
      await page.goto(`${FE_BASE}/training/calendar`);
      await page.waitForLoadState('networkidle');

      // Switch date on calendar to OUTSIDE_DATE
      const calDateInput = page.locator('input[type="date"]').first();
      await calDateInput.fill(OUTSIDE_DATE);

      // Verify the scheduled session appears on calendar with the horse name
      const createdSessionInDb = await prisma.workoutSession.findFirst({
        where: { trainerNotes: TEST_MARKER },
        include: { horse: true },
      });
      expect(createdSessionInDb).toBeTruthy();
      expect(createdSessionInDb.status).toBe('SCHEDULED');

      const horseNameOnCalendar = page.locator(`button:has-text("${createdSessionInDb.horse.name}")`);
      await expect(horseNameOnCalendar.first()).toBeVisible({ timeout: 10000 });
    } finally {
      // Clean up test session
      const created = await prisma.workoutSession.findMany({
        where: { trainerNotes: TEST_MARKER },
        select: { id: true },
      });
      if (created.length > 0) {
        const ids = created.map((s: { id: string }) => s.id);
        await prisma.simulatorSession.deleteMany({ where: { workoutSessionId: { in: ids } } });
        await prisma.workoutSession.deleteMany({ where: { id: { in: ids } } });
      }
    }
  });

  test('TASK-017: Incident -> Vet review -> Medical Record & Lock -> Round-trip enforcement & lift', async ({ page, context }) => {
    test.setTimeout(120_000);

    const testStartTime = new Date();
    const TEST_MARKER = `TASK-017-E2E-${Date.now()}`;
    const trainerUser = await prisma.user.findUnique({ where: { email: TARGET_TRAINER_EMAIL } });
    const vetUser = await prisma.user.findUnique({ where: { email: TARGET_VET_EMAIL } });
    expect(trainerUser).toBeTruthy();
    expect(vetUser).toBeTruthy();

    // 0. Snapshot the reused horse's original status, isMedicalLocked, and relationships (R-6.3)
    const initialHorse = await prisma.horse.findUnique({
      where: { id: targetHorseId },
      include: {
        stallAllocations: {
          where: { isActive: true },
          select: { assignedGroomUserId: true },
        },
      },
    });
    expect(initialHorse).toBeTruthy();
    const originalStatus = initialHorse!.status;
    const originalIsMedicalLocked = initialHorse!.isMedicalLocked;
    const initialOwnerId = initialHorse!.ownerId;
    const initialGroomUserId = initialHorse!.stallAllocations[0]?.assignedGroomUserId;
    expect(initialOwnerId).toBeTruthy();
    expect(initialGroomUserId).toBeTruthy();

    // Snapshot pre-existing IDs and counts for the reused horse (R-6.6)
    const preRegIds = (
      await prisma.tournamentRegistration.findMany({
        where: { horseId: targetHorseId },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((r: { id: string }) => r.id);

    const preLockIds = (
      await prisma.medicalLock.findMany({
        where: { horseId: targetHorseId },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((r: { id: string }) => r.id);

    const preRecordIds = (
      await prisma.medicalRecord.findMany({
        where: { horseId: targetHorseId },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((r: { id: string }) => r.id);

    const preIncidentIds = (
      await prisma.incidentReport.findMany({
        where: { horseId: targetHorseId },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((r: { id: string }) => r.id);

    // R-10.1: Snapshot every pre-existing heavy/BREEZE/TRIAL WorkoutSession for targetHorseId (id, status, statusReason)
    const preWorkoutSnapshots = await prisma.workoutSession.findMany({
      where: {
        horseId: targetHorseId,
        OR: [{ intensity: 'HEAVY' }, { workoutType: { in: ['BREEZE', 'TRIAL'] } }],
      },
      select: {
        id: true,
        status: true,
        statusReason: true,
      },
      orderBy: { id: 'asc' },
    });

    // R-10.4: Snapshot pre-existing Notification and AuditLog IDs before execution
    const preNotificationIds = (
      await prisma.notification.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((n: { id: string }) => n.id);

    const preAuditLogIds = (
      await prisma.auditLog.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
      })
    ).map((a: { id: string }) => a.id);

    // Track exact IDs and correlation markers created by this test for non-destructive cleanup (R-6.4)
    let createdWorkoutSessionId: string | null = null;
    let createdSessionId: string | null = null;
    let createdIncidentId: string | null = null;
    let createdIncidentNumber: string | null = null;
    let createdMedicalRecordId: string | null = null;
    let placedLockId: string | null = null;
    let placedLockCode: string | null = null;
    let futureWorkoutId: string | null = null;
    let createdTournamentId: string | null = null;
    let createdNotificationIds: string[] = [];
    let simPage: Page | null = null;
    let sentinelNotificationId: string | null = null;
    let sentinelAuditLogId: string | null = null;
    const SENTINEL_MARKER = `SENTINEL-CONCURRENT-${Date.now()}`;

    try {
      // Add sentinel unrelated Notification & AuditLog created after snapshot to prove cleanup preserves concurrent rows
      const sentinelNotif = await prisma.notification.create({
        data: {
          userId: vetUser.id,
          type: 'SENTINEL_UNRELATED_CONCURRENT',
          category: 'SYSTEM',
          title: `Sentinel Unrelated Notification [${SENTINEL_MARKER}]`,
          message: 'Simulated concurrent notification that must be preserved by cleanup',
          params: { sentinel: true, marker: SENTINEL_MARKER },
        },
      });
      sentinelNotificationId = sentinelNotif.id;

      const sentinelAudit = await prisma.auditLog.create({
        data: {
          userId: vetUser.id,
          action: 'SENTINEL_CONCURRENT_ACTION',
          entityName: 'SystemConfig',
          entityId: `sentinel-${Date.now()}`,
          newValuesJson: JSON.stringify({
            detail: `Sentinel Unrelated AuditLog [${SENTINEL_MARKER}]`,
            marker: SENTINEL_MARKER,
          }),
        },
      });
      sentinelAuditLogId = sentinelAudit.id;

      // 1. Get auth token for Trainer (R-1.1)
      const trainerLoginRes = await page.request.post(`${BE_BASE}/auth/login`, {
        data: { email: TARGET_TRAINER_EMAIL, password: QA_PASSWORD },
      });
      expect(trainerLoginRes.ok()).toBeTruthy();
      const trainerLoginData = await trainerLoginRes.json();
      const trainerToken = trainerLoginData.data.accessToken;

      // 2. Prepare eligible SCHEDULED HEAVY/TRIAL workout fixture (R-1.1)
      const workout = await prisma.workoutSession.create({
        data: {
          trainingPlanId: '00000000-0000-4000-a006-000000000001',
          horseId: targetHorseId,
          workoutType: 'TRIAL',
          intensity: 'HEAVY',
          distanceMeters: 1000,
          scheduledDate: new Date(Date.now() - 60000), // reached start time
          status: 'SCHEDULED',
          trainerNotes: `TASK-017 Active Heavy Trial [${TEST_MARKER}]`,
        },
      });
      createdWorkoutSessionId = workout.id;

      // Start the workout via live NestJS API before lock exists (R-1.1)
      const startRes = await page.request.post(`${BE_BASE}/simulator/workouts/${workout.id}/start`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      expect(startRes.status()).toBe(201);
      const startData = await startRes.json();
      createdSessionId = startData.data.sessionId;

      // 3. Connect canonical Simulator using the Backend-issued sessionId (R-1.2)
      simPage = await context.newPage();
      await simPage.goto(`${SIM_BASE}/?sessionId=${createdSessionId}`);
      await simPage.waitForLoadState('networkidle');

      const retryBtn = simPage.getByRole('button', { name: /Thử tải lại/i });
      if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await retryBtn.click();
        await simPage.waitForLoadState('networkidle');
      }

      // Click "» Bắt đầu chạy thử" to start running
      const startTrialBtn = simPage.getByRole('button', { name: /Bắt đầu chạy thử|Start trial/i });
      await expect(startTrialBtn).toBeVisible({ timeout: 15000 });
      await startTrialBtn.click();
      await expect(simPage.getByTestId('trial-phase-pill')).toContainText(/Đang chạy/i);

      // 4. Produce/report the incident through the real Simulator Socket.IO contract (R-1.3)
      const lamenessBtn = simPage.getByRole('button', { name: /! Khập khiễng/i });
      await expect(lamenessBtn).toBeVisible({ timeout: 10000 });
      await lamenessBtn.click();

      // 5. Verify PostgreSQL IncidentReport persistence and recipient notifications (R-1.4 & R-1.5)
      let incident: any = null;
      for (let i = 0; i < 20; i++) {
        incident = await prisma.incidentReport.findFirst({
          where: { horseId: targetHorseId, status: 'REPORTED', id: { notIn: preIncidentIds } },
          orderBy: { createdAt: 'desc' },
        });
        if (incident) break;
        await page.waitForTimeout(500);
      }
      expect(incident).toBeTruthy();
      createdIncidentId = incident.id;
      createdIncidentNumber = incident.incidentNumber;
      expect(incident.status).toBe('REPORTED');
      expect(incident.severity).toBe('MODERATE');
      expect(incident.symptomsJson).toContain('LAMENESS');

      // Verify exact incident notification routing (R-7)
      let incidentNotifs: any[] = [];
      for (let i = 0; i < 20; i++) {
        const notifs = await prisma.notification.findMany({
          where: {
            createdAt: { gte: testStartTime },
            category: 'MEDICAL',
          },
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        });
        incidentNotifs = notifs.filter(
          (n: any) => (n.params as any)?.incidentNumber === incident.incidentNumber,
        );
        if (incidentNotifs.length > 0) break;
        await page.waitForTimeout(500);
      }
      expect(incidentNotifs.length).toBeGreaterThan(0);
      createdNotificationIds = incidentNotifs.map((n: any) => n.id);

      // R-7: Verify required unique recipients and roles for MODERATE simulator incident
      const recipientUserIds = new Set(incidentNotifs.map((n: any) => n.userId));
      const recipientRoles = new Set(incidentNotifs.map((n: any) => n.user.role));

      // Intended roles: Veterinarian, Groom, Horse Owner
      expect(recipientRoles.has('VETERINARIAN')).toBe(true);
      expect(recipientRoles.has('GROOM')).toBe(true);
      expect(recipientRoles.has('HORSE_OWNER')).toBe(true);

      // Intended specific users
      const vetNotif = incidentNotifs.find((n: any) => n.user.email === TARGET_VET_EMAIL);
      expect(vetNotif).toBeTruthy();
      expect(recipientUserIds.has(initialGroomUserId!)).toBe(true);
      expect(recipientUserIds.has(initialOwnerId!)).toBe(true);

      // Verify NO unintended recipients: Head Trainer and Club Manager are NOT notified for MODERATE incident
      expect(recipientRoles.has('HEAD_TRAINER')).toBe(false);
      expect(recipientRoles.has('CLUB_MANAGER')).toBe(false);
      for (const notif of incidentNotifs) {
        expect(['VETERINARIAN', 'GROOM', 'HORSE_OWNER']).toContain(notif.user.role);
      }

      // Invariant: incident does not automatically create MedicalRecord or MedicalLock
      const recordsPreReview = await prisma.medicalRecord.count({ where: { horseId: targetHorseId } });
      expect(recordsPreReview).toBe(preRecordIds.length);
      const incidentRecords = await prisma.medicalRecord.count({
        where: { horseId: targetHorseId, clinicalDiagnosis: { contains: TEST_MARKER } },
      });
      expect(incidentRecords).toBe(0);
      const locksPreReview = await prisma.medicalLock.count({ where: { horseId: targetHorseId, isLocked: true } });
      expect(locksPreReview).toBe(preLockIds.length);
      const horsePreReview = await prisma.horse.findUnique({ where: { id: targetHorseId } });
      expect(horsePreReview?.isMedicalLocked).toBe(originalIsMedicalLocked);

      // 6. Sign in as Veterinarian and navigate to /incidents (R-2.1)
      await signIn(page, TARGET_VET_EMAIL);
      await page.goto(`${FE_BASE}/incidents`);
      await page.waitForLoadState('networkidle');

      // Locate incident card by incidentNumber
      const incidentCard = page.locator('section').filter({ hasText: incident.incidentNumber });
      await expect(incidentCard).toBeVisible({ timeout: 15000 });

      // Click Review & Prescribe button
      await incidentCard.getByTestId('incident-card-review-btn').click();

      // Modal opens: Verify Vet-only controls and perform clinical review
      const modal = page.locator('div[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });

      const placeLockBtn = modal.locator('[data-testid="incident-action-place-lock"]');
      const createRecordBtn = modal.locator('[data-testid="incident-action-create-record"]');
      await expect(placeLockBtn).toBeVisible();
      await expect(createRecordBtn).toBeVisible();

      // Submit clinical review (Status -> UNDER_REVIEW with Vet Notes)
      await modal.locator('[data-testid="incident-status-select"]').selectOption('UNDER_REVIEW');
      await modal.locator('[data-testid="incident-vet-notes"]').fill(`Clinical examination confirms left forelimb lameness [${TEST_MARKER}]`);
      await modal.locator('[data-testid="incident-submit-review"]').click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Invariant check: Status is now UNDER_REVIEW, reviewedAt is set, but still no automatic MedicalRecord or MedicalLock
      const reviewedIncident = await prisma.incidentReport.findUnique({ where: { id: createdIncidentId } });
      expect(reviewedIncident?.status).toBe('UNDER_REVIEW');
      expect(reviewedIncident?.reviewedAt).not.toBeNull();
      const horsePostReview = await prisma.horse.findUnique({ where: { id: targetHorseId } });
      expect(horsePostReview?.isMedicalLocked).toBe(originalIsMedicalLocked);
      const recordsPostReview = await prisma.medicalRecord.count({ where: { horseId: targetHorseId } });
      expect(recordsPostReview).toBe(preRecordIds.length);

      // Capture review notification ID created by review submission
      const reviewNotifs = await prisma.notification.findMany({
        where: {
          createdAt: { gte: testStartTime },
          title: { contains: incident.incidentNumber },
        },
        select: { id: true },
      });
      createdNotificationIds.push(...reviewNotifs.map((n: { id: string }) => n.id));

      // 7. Vet uses Create Medical Record via Main-Web UI (R-2.2)
      await incidentCard.getByTestId('incident-card-review-btn').click();
      await expect(modal).toBeVisible({ timeout: 10000 });
      await modal.locator('[data-testid="incident-action-create-record"]').click();

      await expect(page).toHaveURL(new RegExp(`/medical/records/new\\?horseId=${targetHorseId}`), { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Fill in required fields
      await page.getByPlaceholder(/Horse exhibits|front limb lameness/i).fill(`Clinical evaluation of post-trial lameness [${TEST_MARKER}]`);
      await page.getByPlaceholder(/Note lung sounds|lung sounds/i).fill(`Palpation shows left forelimb tendon heat and sensitivity. Grade 2 lameness [${TEST_MARKER}].`);
      await page.getByPlaceholder(/Acute tenosynovitis/i).fill(`Left forelimb superficial digital flexor tendonitis [${TEST_MARKER}]`);

      // Submit and finalize record
      const saveRecordBtn = page.getByRole('button', { name: /Save & Finalize|Lưu bệnh án/i });
      await saveRecordBtn.click();
      await expect(page).toHaveURL(/.*medical\/records\/.+/, { timeout: 15000 });

      // Verify in PostgreSQL: record persisted for targetHorseId
      const createdRecord = await prisma.medicalRecord.findFirst({
        where: { horseId: targetHorseId, clinicalDiagnosis: { contains: TEST_MARKER } },
      });
      expect(createdRecord).toBeTruthy();
      createdMedicalRecordId = createdRecord!.id;
      expect(createdRecord!.status).toBe('OPEN');
      expect(createdRecord!.horseId).toBe(targetHorseId);

      // Invariant: record creation does NOT automatically place a MedicalLock
      const horseAfterRecord = await prisma.horse.findUnique({ where: { id: targetHorseId } });
      expect(horseAfterRecord?.isMedicalLocked).toBe(originalIsMedicalLocked);
      const locksAfterRecord = await prisma.medicalLock.count({ where: { horseId: targetHorseId, isLocked: true } });
      expect(locksAfterRecord).toBe(preLockIds.length);

      // 8. Vet explicitly places the Medical Lock (R-2.3)
      await page.goto(`${FE_BASE}/locks?horseId=${targetHorseId}&action=place`);
      await page.waitForLoadState('networkidle');

      const lockModal = page.locator('div[role="dialog"]');
      await expect(lockModal).toBeVisible({ timeout: 10000 });

      await lockModal.locator('textarea').fill(`Severe left forelimb suspensory desmitis [${TEST_MARKER}]`);
      const confirmLockBtn = lockModal.getByRole('button', { name: /Confirm Training Lock|Xác nhận khóa/i });
      await confirmLockBtn.click();
      await expect(lockModal).not.toBeVisible({ timeout: 10000 });

      // Verify DB: horse is now medical locked and active lock exists
      const horseLocked = await prisma.horse.findUnique({ where: { id: targetHorseId } });
      expect(horseLocked?.isMedicalLocked).toBe(true);

      const activeLock = await prisma.medicalLock.findFirst({
        where: { horseId: targetHorseId, isLocked: true, lockReason: { contains: TEST_MARKER } },
        orderBy: { createdAt: 'desc' },
      });
      expect(activeLock).toBeTruthy();
      placedLockId = activeLock!.id;
      placedLockCode = activeLock!.lockCode;

      // Capture Training Lock placed notification IDs
      const lockPlacedNotifs = await prisma.notification.findMany({
        where: {
          createdAt: { gte: testStartTime },
          title: 'Training Lock placed',
          message: { contains: TEST_MARKER },
        },
        select: { id: true },
      });
      createdNotificationIds.push(...lockPlacedNotifs.map((n: { id: string }) => n.id));

      // 9. Simulator lock enforcement on already-active session (R-3.1 & R-3.2)
      // Lock synchronization arrives through sys:medical_lock_sync
      const lockBanner = simPage.locator('text=/Đang bị Medical Lock/i');
      await expect(lockBanner).toBeVisible({ timeout: 15000 });

      // Simulator visibly blocks/throttles the active heavy action
      const heavyIntensityBtn = simPage.locator('div[aria-label="Cường độ"] button').filter({ hasText: /Nặng|HEAVY/i });
      await expect(heavyIntensityBtn).toBeDisabled();

      // 10. Reject new future HEAVY/TRIAL workout start through live NestJS API (R-3.3)
      const futureWorkout = await prisma.workoutSession.create({
        data: {
          trainingPlanId: '00000000-0000-4000-a006-000000000001',
          horseId: targetHorseId,
          workoutType: 'TRIAL',
          intensity: 'HEAVY',
          distanceMeters: 1200,
          scheduledDate: new Date(Date.now() - 30000),
          status: 'SCHEDULED',
          trainerNotes: `Future Heavy Attempt [${TEST_MARKER}]`,
        },
      });
      futureWorkoutId = futureWorkout.id;

      const rejectStartRes = await page.request.post(`${BE_BASE}/simulator/workouts/${futureWorkout.id}/start`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
      });
      expect(rejectStartRes.status()).toBe(409); // Conflict
      const rejectStartData = await rejectStartRes.json();
      expect(rejectStartData.code || rejectStartData.message).toMatch(/MEDICAL_LOCK_ACTIVE|medical lock/i);

      // 11. Reject future tournament/race registration for locked horse through live NestJS API (R-3.4)
      const tournament = await prisma.tournament.create({
        data: {
          name: `QA T017 Cup [${TEST_MARKER}]`,
          raceDate: new Date(Date.now() + 7 * 86400000),
          location: 'QA Racecourse',
          distanceMeters: 1600,
          trackType: 'TURF',
          prizePool: 10000,
          registrationDeadline: new Date(Date.now() + 2 * 86400000),
          status: 'OPEN_REGISTRATION',
        },
      });
      createdTournamentId = tournament.id;

      const regRes = await page.request.post(`${BE_BASE}/tournaments/${tournament.id}/registrations`, {
        headers: { Authorization: `Bearer ${trainerToken}` },
        data: { horseId: targetHorseId },
      });
      expect(regRes.status()).toBe(400); // Bad Request
      const regData = await regRes.json();
      expect(regData.code || regData.message).toMatch(/MEDICAL_LOCK_ACTIVE|Medical Lock/i);

      // 12. Vet lifts the Medical Lock in Main Web (R-3.5)
      await page.goto(`${FE_BASE}/locks`);
      await page.waitForLoadState('networkidle');

      const lockRow = page.locator('tr').filter({ hasText: TEST_MARKER });
      const liftBtn = lockRow.locator('[data-testid="training-lock-lift-btn"]').first();
      await expect(liftBtn).toBeVisible({ timeout: 10000 });
      await liftBtn.click();

      const liftModal = page.locator('div[role="dialog"]');
      await expect(liftModal).toBeVisible({ timeout: 10000 });

      await liftModal.locator('textarea').fill(`Ultrasound confirms complete tendon fiber recovery [${TEST_MARKER}]`);
      const confirmLiftBtn = liftModal.getByRole('button', { name: /Confirm Lift Lock|Xác nhận mở khóa/i });
      await confirmLiftBtn.click();
      await expect(liftModal).not.toBeVisible({ timeout: 10000 });

      // Verify in DB: horse is unlocked and lock is RELEASED
      const horseUnlocked = await prisma.horse.findUnique({ where: { id: targetHorseId } });
      expect(horseUnlocked?.isMedicalLocked).toBe(originalIsMedicalLocked);

      const releasedLock = await prisma.medicalLock.findUnique({ where: { id: placedLockId } });
      expect(releasedLock?.isLocked).toBe(false);

      // Capture Training Lock lifted notification IDs
      const lockLiftedNotifs = await prisma.notification.findMany({
        where: {
          createdAt: { gte: testStartTime },
          title: 'Training Lock lifted',
          message: { contains: initialHorse!.name },
        },
        select: { id: true },
      });
      createdNotificationIds.push(...lockLiftedNotifs.map((n: { id: string }) => n.id));

      // Verify Simulator receives sys:medical_lock_sync and clears the block banner
      await expect(lockBanner).not.toBeVisible({ timeout: 15000 });

      // Simulator returns only to explicitly permitted state, does not automatically resume unsafe active heavy action (R-3.5)
      await expect(heavyIntensityBtn).not.toHaveClass(/active|selected|btn-primary/i);
    } finally {
      if (simPage) {
        await simPage.close().catch(() => {});
      }
      // R-6.4: Delete only rows whose exact IDs were captured as created by this test,
      // or rows carrying the unique current TEST_MARKER.
      if (createdSessionId) {
        await prisma.simulatorSession.deleteMany({ where: { id: createdSessionId } });
      }
      if (createdWorkoutSessionId) {
        await prisma.workoutSession.deleteMany({ where: { id: createdWorkoutSessionId } });
      }
      if (futureWorkoutId) {
        await prisma.workoutSession.deleteMany({ where: { id: futureWorkoutId } });
      }
      await prisma.workoutSession.deleteMany({
        where: { trainerNotes: { contains: TEST_MARKER } },
      });

      if (createdTournamentId) {
        await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: createdTournamentId } });
        await prisma.tournament.deleteMany({ where: { id: createdTournamentId } });
      }
      await prisma.tournament.deleteMany({
        where: { name: { contains: TEST_MARKER } },
      });

      if (placedLockId) {
        await prisma.medicalLock.deleteMany({ where: { id: placedLockId } });
      }
      await prisma.medicalLock.deleteMany({
        where: { lockReason: { contains: TEST_MARKER } },
      });

      if (createdMedicalRecordId) {
        await prisma.medicalRecord.deleteMany({ where: { id: createdMedicalRecordId } });
      }
      await prisma.medicalRecord.deleteMany({
        where: { clinicalDiagnosis: { contains: TEST_MARKER } },
      });

      if (createdIncidentId) {
        await prisma.incidentReport.deleteMany({ where: { id: createdIncidentId } });
      }
      await prisma.incidentReport.deleteMany({
        where: { description: { contains: TEST_MARKER } },
      });

      // Correlated Notification cleanup: delete test-owned rows using exact created IDs, TEST_MARKER, and correlation fields
      await prisma.notification.deleteMany({
        where: {
          OR: [
            ...(createdNotificationIds.length > 0 ? [{ id: { in: createdNotificationIds } }] : []),
            { message: { contains: TEST_MARKER } },
            { title: { contains: TEST_MARKER } },
          ],
        },
      });

      // Correlated AuditLog cleanup: delete test-owned rows using exact created entity IDs, TEST_MARKER, and correlation fields
      const correlatedEntityIds = [
        createdIncidentId,
        createdMedicalRecordId,
        placedLockId,
        createdWorkoutSessionId,
        futureWorkoutId,
        createdTournamentId,
        createdSessionId,
      ].filter(Boolean) as string[];

      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { newValuesJson: { contains: TEST_MARKER } },
            ...(correlatedEntityIds.length > 0 ? [{ entityId: { in: correlatedEntityIds } }] : []),
            ...(placedLockCode ? [{ newValuesJson: { contains: placedLockCode } }] : []),
          ],
        },
      });

      // R-10.2: Restore pre-existing workout rows to their exact original field values
      for (const snap of preWorkoutSnapshots) {
        await prisma.workoutSession.update({
          where: { id: snap.id },
          data: {
            status: snap.status,
            statusReason: snap.statusReason,
          },
        });
      }

      // R-6.3: Restore horse's original status and isMedicalLocked exactly
      await prisma.horse.update({
        where: { id: targetHorseId },
        data: {
          status: originalStatus,
          isMedicalLocked: originalIsMedicalLocked,
        },
      });

      // R-6.6: Assert that all pre-existing counts/IDs for the reused horse remain unchanged after cleanup
      const postRegIds = (
        await prisma.tournamentRegistration.findMany({
          where: { horseId: targetHorseId },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((r: { id: string }) => r.id);

      const postLockIds = (
        await prisma.medicalLock.findMany({
          where: { horseId: targetHorseId },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((r: { id: string }) => r.id);

      const postRecordIds = (
        await prisma.medicalRecord.findMany({
          where: { horseId: targetHorseId },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((r: { id: string }) => r.id);

      const postIncidentIds = (
        await prisma.incidentReport.findMany({
          where: { horseId: targetHorseId },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      ).map((r: { id: string }) => r.id);

      // R-10.3: Assert complete relevant workout snapshots equal their pre-test values
      const postWorkoutSnapshots = await prisma.workoutSession.findMany({
        where: {
          horseId: targetHorseId,
          OR: [{ intensity: 'HEAVY' }, { workoutType: { in: ['BREEZE', 'TRIAL'] } }],
        },
        select: {
          id: true,
          status: true,
          statusReason: true,
        },
        orderBy: { id: 'asc' },
      });

      // Assert pre-existing Notification rows remain present
      const postNotifsForPre = await prisma.notification.findMany({
        where: { id: { in: preNotificationIds } },
        select: { id: true },
      });
      if (postNotifsForPre.length !== preNotificationIds.length) {
        const postSet = new Set(postNotifsForPre.map((n: { id: string }) => n.id));
        const missing = preNotificationIds.filter((id: string) => !postSet.has(id));
        console.error('MISSING PRE-NOTIFICATION IDS:', missing);
      }
      expect(postNotifsForPre.length).toBe(preNotificationIds.length);

      // Assert pre-existing AuditLog rows remain present
      const postAuditsForPre = await prisma.auditLog.findMany({
        where: { id: { in: preAuditLogIds } },
        select: { id: true },
      });
      expect(postAuditsForPre.length).toBe(preAuditLogIds.length);

      // Assert test-correlated residue is zero
      const residueNotifs = await prisma.notification.findMany({
        where: {
          OR: [
            { message: { contains: TEST_MARKER } },
            { title: { contains: TEST_MARKER } },
            ...(createdNotificationIds.length > 0 ? [{ id: { in: createdNotificationIds } }] : []),
          ],
        },
      });
      expect(residueNotifs.length).toBe(0);

      const residueAudits = await prisma.auditLog.findMany({
        where: {
          OR: [
            { newValuesJson: { contains: TEST_MARKER } },
            ...(correlatedEntityIds.length > 0 ? [{ entityId: { in: correlatedEntityIds } }] : []),
            ...(placedLockCode ? [{ newValuesJson: { contains: placedLockCode } }] : []),
          ],
        },
      });
      expect(residueAudits.length).toBe(0);

      // Prove cleanup preserved sentinel unrelated Notification & AuditLog created after snapshot
      if (sentinelNotificationId) {
        const preservedSentinelNotif = await prisma.notification.findUnique({
          where: { id: sentinelNotificationId },
        });
        expect(preservedSentinelNotif).toBeTruthy();
        expect(preservedSentinelNotif?.title).toContain(SENTINEL_MARKER);
        // Clean up sentinel by exact ID afterward
        await prisma.notification.delete({ where: { id: sentinelNotificationId } });
        expect(await prisma.notification.findUnique({ where: { id: sentinelNotificationId } })).toBeNull();
      }

      if (sentinelAuditLogId) {
        const preservedSentinelAudit = await prisma.auditLog.findUnique({
          where: { id: sentinelAuditLogId },
        });
        expect(preservedSentinelAudit).toBeTruthy();
        expect(preservedSentinelAudit?.newValuesJson).toContain(SENTINEL_MARKER);
        // Clean up sentinel by exact ID afterward
        await prisma.auditLog.delete({ where: { id: sentinelAuditLogId } });
        expect(await prisma.auditLog.findUnique({ where: { id: sentinelAuditLogId } })).toBeNull();
      }

      expect(postRegIds).toEqual(preRegIds);
      expect(postLockIds).toEqual(preLockIds);
      expect(postRecordIds).toEqual(preRecordIds);
      expect(postIncidentIds).toEqual(preIncidentIds);
      expect(postWorkoutSnapshots).toEqual(preWorkoutSnapshots);

      const finalHorse = await prisma.horse.findUnique({ where: { id: targetHorseId } });
      expect(finalHorse?.status).toBe(originalStatus);
      expect(finalHorse?.isMedicalLocked).toBe(originalIsMedicalLocked);
    }
  });
});
