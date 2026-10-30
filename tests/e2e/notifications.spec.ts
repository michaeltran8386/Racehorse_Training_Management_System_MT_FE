import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siblingPrismaPath =
  process.env.PRISMA_CLIENT_PATH ||
  path.resolve(__dirname, '../../..', 'Racehorse_Training_Management_System_MT_BE', 'node_modules', '@prisma/client');

const API_BASE = 'http://localhost:3000/api';
const TARGET_HORSE_CODE = 'HR-000001'; // Thunderbolt Swift (Owner: owner@gmail.com, Groom: groom@gmail.com)
const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');

test.describe('TASK-010: Real-stack notifications and real-only runtime cutover', () => {
  let vetToken = '';
  let createdLockId = '';
  let runMarker = '';
  let targetHorseId = '';
  let targetHorseName = '';
  let baselineStatus = 'RESTING';
  let baselineIsLocked = false;
  let scopedPreNotifIds: string[] = [];
  let scopedPreAuditIds: string[] = [];
  let prisma: any = null;

  test.beforeAll(async ({ request }) => {
    runMarker = `T010_${Date.now()}`;

    // Initialize Prisma client with fail-closed assertion
    const { PrismaClient } = require(siblingPrismaPath);
    prisma = new PrismaClient();

    // Dynamic resolution of target horse and ownership/groom assertion
    const horse = await prisma.horse.findUnique({
      where: { horseCode: TARGET_HORSE_CODE },
      include: {
        owner: { select: { id: true, email: true, status: true } },
        stallAllocations: {
          where: { isActive: true },
          include: { assignedGroom: { select: { id: true, email: true, status: true } } },
        },
      },
    });
    if (!horse) {
      throw new Error(`Target horse with horseCode ${TARGET_HORSE_CODE} not found in database`);
    }
    if (!horse.owner || horse.owner.email !== 'owner@gmail.com') {
      throw new Error(`Target horse ${TARGET_HORSE_CODE} does not have active owner owner@gmail.com (got: ${horse.owner?.email})`);
    }
    const currentAllocation = horse.stallAllocations?.[0];
    if (!currentAllocation?.assignedGroom || currentAllocation.assignedGroom.email !== 'groom@gmail.com') {
      throw new Error(`Target horse ${TARGET_HORSE_CODE} does not have active assigned groom groom@gmail.com (got: ${currentAllocation?.assignedGroom?.email})`);
    }

    targetHorseId = horse.id;
    targetHorseName = horse.name;
    baselineStatus = horse.status;
    baselineIsLocked = horse.isMedicalLocked;

    // Snapshot scoped pre-existing notification IDs for target horse and lock lifecycle event types
    const targetHorseNotifWhere = {
      type: { in: ['LOCK_PLACED', 'LOCK_EXTENDED', 'LOCK_LIFTED'] },
      OR: [
        { params: { path: ['horse'], equals: targetHorseName } },
        { message: { contains: targetHorseName } },
      ],
    };
    const scopedPreNotifs = await prisma.notification.findMany({
      where: targetHorseNotifWhere,
      select: { id: true },
    });
    scopedPreNotifIds = scopedPreNotifs.map((n: { id: string }) => n.id);

    // Snapshot scoped pre-existing HORSE_STATUS_CHANGED audit IDs for target horse
    const scopedPreAudits = await prisma.auditLog.findMany({
      where: {
        entityId: targetHorseId,
        action: 'HORSE_STATUS_CHANGED',
      },
      select: { id: true },
    });
    scopedPreAuditIds = scopedPreAudits.map((a: { id: string }) => a.id);

    // 1. Authenticate as Vet via cached storage state or API fallback
    const vetAuthPath = path.join(AUTH_DIR, 'vet.json');
    if (fs.existsSync(vetAuthPath)) {
      try {
        const authData = JSON.parse(fs.readFileSync(vetAuthPath, 'utf8'));
        const tokensEntry = authData.origins?.[0]?.localStorage?.find((item: any) => item.name === 'equiflow.tokens');
        if (tokensEntry) {
          vetToken = JSON.parse(tokensEntry.value).accessToken;
        }
      } catch {}
    }
    if (!vetToken) {
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        data: { email: 'vet@gmail.com', password: 'EquiFlow@2026' },
      });
      if (!loginRes.ok()) {
        throw new Error(`Vet login failed with HTTP ${loginRes.status()}: ${await loginRes.text()}`);
      }
      const loginJson = await loginRes.json();
      vetToken = loginJson.data.accessToken;
    }

    // 2. Create unique Medical Lock with current-run marker
    const createRes = await request.post(`${API_BASE}/medical/locks`, {
      headers: { Authorization: `Bearer ${vetToken}` },
      data: {
        horseId: targetHorseId,
        expectedRestDays: 14,
        lockReason: `Synovitis examination [${runMarker}]`,
        appliedMedicalStatus: 'INJURED',
        unlockConditions: 'Clear joint flexion and ultrasound recheck',
      },
    });
    if (!createRes.ok()) {
      throw new Error(`Create medical lock failed with HTTP ${createRes.status()}: ${await createRes.text()}`);
    }
    const createJson = await createRes.json();
    createdLockId = createJson.data.id;
  });

  test.afterAll(async ({ request }) => {
    let releaseError: any = null;
    let cleanupError: any = null;

    try {
      if (createdLockId && vetToken) {
        try {
          const releaseRes = await request.post(`${API_BASE}/medical/locks/${createdLockId}/release`, {
            headers: { Authorization: `Bearer ${vetToken}` },
            data: {
              unlockReason: `E2E teardown [${runMarker}]`,
              newHorseStatus: baselineStatus,
            },
          });
          if (!releaseRes.ok()) {
            releaseError = new Error(
              `Teardown lock release failed with HTTP ${releaseRes.status()}: ${await releaseRes.text()}`,
            );
          }
        } catch (err) {
          releaseError = err;
        }
      }
    } finally {
      if (prisma) {
        try {
          // Query exact notification IDs created during this run for the target horse
          const notifs = await prisma.notification.findMany({
            where: {
              type: { in: ['LOCK_PLACED', 'LOCK_EXTENDED', 'LOCK_LIFTED'] },
              OR: [
                { params: { path: ['horse'], equals: targetHorseName } },
                { message: { contains: targetHorseName } },
              ],
              id: { notIn: scopedPreNotifIds },
            },
            select: { id: true },
          });
          const notifIds = notifs.map((n: { id: string }) => n.id);

          // Query exact audit IDs created during this run matching test actions/entities
          const audits = await prisma.auditLog.findMany({
            where: {
              OR: [
                ...(createdLockId
                  ? [
                      {
                        entityId: createdLockId,
                        action: {
                          in: ['CREATE_MEDICAL_LOCK', 'EXTEND_MEDICAL_LOCK', 'RELEASE_MEDICAL_LOCK'],
                        },
                      },
                    ]
                  : []),
                ...(targetHorseId
                  ? [
                      {
                        entityId: targetHorseId,
                        action: 'HORSE_STATUS_CHANGED',
                        id: { notIn: scopedPreAuditIds },
                      },
                    ]
                  : []),
              ],
            },
            select: { id: true },
          });
          const auditIds = audits.map((a: { id: string }) => a.id);

          // Execute atomic cleanup transaction of exact IDs
          const txOps: any[] = [];
          if (notifIds.length > 0) {
            txOps.push(prisma.notification.deleteMany({ where: { id: { in: notifIds } } }));
          }
          if (auditIds.length > 0) {
            txOps.push(prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } }));
          }
          if (createdLockId) {
            txOps.push(prisma.medicalLock.deleteMany({ where: { id: createdLockId } }));
          }
          if (targetHorseId) {
            txOps.push(
              prisma.horse.update({
                where: { id: targetHorseId },
                data: { status: baselineStatus, isMedicalLocked: baselineIsLocked },
              }),
            );
          }

          if (txOps.length > 0) {
            await prisma.$transaction(txOps);
          }

          // Assert zero target residue and exact baseline restoration
          const remNotifs =
            notifIds.length > 0
              ? await prisma.notification.count({ where: { id: { in: notifIds } } })
              : 0;
          const remLock = createdLockId
            ? await prisma.medicalLock.count({ where: { id: createdLockId } })
            : 0;
          const remAudits =
            auditIds.length > 0
              ? await prisma.auditLog.count({ where: { id: { in: auditIds } } })
              : 0;
          const restoredHorse = targetHorseId
            ? await prisma.horse.findUnique({
                where: { id: targetHorseId },
                select: { status: true, isMedicalLocked: true },
              })
            : null;

          if (remNotifs !== 0 || remLock !== 0 || remAudits !== 0) {
            throw new Error(
              `Teardown residue assertion failed: ${remNotifs} notifs, ${remLock} locks, ${remAudits} audits remain`,
            );
          }
          if (
            targetHorseId &&
            (!restoredHorse ||
              restoredHorse.status !== baselineStatus ||
              restoredHorse.isMedicalLocked !== baselineIsLocked)
          ) {
            throw new Error(
              `Teardown baseline restoration failed: expected ${baselineStatus}/${baselineIsLocked}, got ${restoredHorse?.status}/${restoredHorse?.isMedicalLocked}`,
            );
          }
        } catch (err) {
          cleanupError = err;
        } finally {
          await prisma.$disconnect();
        }
      }
    }

    if (releaseError || cleanupError) {
      const combined = [releaseError?.message, cleanupError?.message].filter(Boolean).join(' | ');
      throw new Error(`Teardown failed: ${combined}`);
    }
  });

  test('Real-stack cutover: rejects invalid credentials with visible error and zero mock bypass', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type=email]').fill('manager@gmail.com');
    await page.locator('input[type=password]').fill('InvalidPass123!');
    await page.locator('button[type=submit]').click();

    // Stays on login page without silent fallback
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/Email or password is incorrect|Tài khoản hoặc mật khẩu không chính xác/i).first(),
    ).toBeVisible();
  });

  test.describe('Role Notification Delivery', () => {
    test.describe('Club Manager', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'manager.json') });
      test('Club Manager receives current-run Medical Lock notification via real API', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker).first()).toBeVisible();
      });
    });

    test.describe('Head Trainer', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'trainer.json') });
      test('Head Trainer receives current-run Training Lock notification via real API', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker).first()).toBeVisible();
      });
    });

    test.describe('Horse Owner', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'owner.json') });
      test('Actual Horse Owner receives current-run lock notice and no staff administrative notices', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker).first()).toBeVisible();
        await expect(page.getByText(/New Account Registration Request|Tài khoản đăng ký mới/i)).toHaveCount(0);
        await expect(page.getByText(/Permission Access Request|Yêu cầu cấp quyền/i)).toHaveCount(0);
        await expect(page.getByText(/Restock Request|Phiếu đề xuất vật tư/i)).toHaveCount(0);
      });
    });

    test.describe('Assigned Groom', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'groom.json') });
      test('Assigned Groom receives current-run Training Lock notification', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker).first()).toBeVisible();
      });
    });

    test.describe('Acting Veterinarian Isolation', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'vet.json') });
      test('Acting Veterinarian isolation: receives zero self-generated lock events', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker)).toHaveCount(0);
      });
    });

    test.describe('Unrelated Horse Owner Isolation', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'owner2.json') });
      test('Unrelated Horse Owner isolation: receives zero events for target horse', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker)).toHaveCount(0);
      });
    });

    test.describe('Unrelated Groom Isolation', () => {
      test.use({ storageState: path.join(AUTH_DIR, 'groom2.json') });
      test('Unrelated Groom isolation: receives zero events for target horse', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('heading', { name: /Notifications|Thông báo/i })).toBeVisible();
        await expect(page.getByText(runMarker)).toHaveCount(0);
      });
    });
  });
});
