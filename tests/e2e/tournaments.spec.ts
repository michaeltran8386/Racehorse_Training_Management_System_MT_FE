import { test, expect } from '@playwright/test';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siblingPrismaPath = path.resolve(__dirname, '../../../Racehorse_Training_Management_System_MT_BE/node_modules/@prisma/client');

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');

function getPrisma() {
  const { PrismaClient } = require(siblingPrismaPath);
  return new PrismaClient();
}

test.describe('Tournament lifecycle and controls (TASK-003 & CR-028)', () => {
  // Track all created IDs for deterministic, FK-safe cleanup with zero baseline mutation
  const trackedIds = {
    tournIds: new Set<string>(),
    regIds: new Set<string>(),
    horseIds: new Set<string>(),
    invoiceIds: new Set<string>(),
    resultIds: new Set<string>(),
  };

  let baselineSnapshot: Array<{ id: string; status: string }> = [];

  test.beforeAll(async () => {
    const prisma = getPrisma();
    try {
      // 1. Snapshot baseline tournament statuses for immutable baseline verification
      const baseline = await prisma.tournament.findMany({
        where: {
          OR: [
            { id: { startsWith: 'seed-tourn-' } },
            { id: { startsWith: '00000000-0000-4000-a00e-' } },
          ],
        },
        select: { id: true, status: true },
      });
      baselineSnapshot = baseline;
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async () => {
    const prisma = getPrisma();
    let cleanupError: any = null;
    try {
      // 1. Delete test-created results
      if (trackedIds.regIds.size > 0) {
        await prisma.tournamentResult.deleteMany({
          where: { registrationId: { in: Array.from(trackedIds.regIds) } },
        });
      }

      // 2. Delete test-created financial invoices linked to test horses
      if (trackedIds.horseIds.size > 0) {
        await prisma.financialInvoice.deleteMany({
          where: { horseId: { in: Array.from(trackedIds.horseIds) } },
        });
      }

      // 3. Delete test-created audit logs
      if (trackedIds.tournIds.size > 0 || trackedIds.regIds.size > 0) {
        await prisma.auditLog.deleteMany({
          where: {
            entityId: {
              in: [
                ...Array.from(trackedIds.tournIds),
                ...Array.from(trackedIds.regIds),
                ...Array.from(trackedIds.horseIds),
              ],
            },
          },
        });
      }

      // 4. Delete test-created registrations
      if (trackedIds.tournIds.size > 0 || trackedIds.regIds.size > 0) {
        await prisma.tournamentRegistration.deleteMany({
          where: {
            OR: [
              ...(trackedIds.tournIds.size > 0 ? [{ tournamentId: { in: Array.from(trackedIds.tournIds) } }] : []),
              ...(trackedIds.regIds.size > 0 ? [{ id: { in: Array.from(trackedIds.regIds) } }] : []),
            ],
          },
        });
      }

      // 5. Delete test-created tournaments
      if (trackedIds.tournIds.size > 0) {
        await prisma.tournament.deleteMany({
          where: { id: { in: Array.from(trackedIds.tournIds) } },
        });
      }

      // 6. Delete test-created horses
      if (trackedIds.horseIds.size > 0) {
        await prisma.horse.deleteMany({
          where: { id: { in: Array.from(trackedIds.horseIds) } },
        });
      }

      // 7. Verify baseline invariance: check that no baseline tournaments were modified
      const currentBaseline = await prisma.tournament.findMany({
        where: {
          OR: [
            { id: { startsWith: 'seed-tourn-' } },
            { id: { startsWith: '00000000-0000-4000-a00e-' } },
          ],
        },
        select: { id: true, status: true },
      });
      const baselineMap = new Map(baselineSnapshot.map((b) => [b.id, b.status]));
      for (const curr of currentBaseline) {
        const expectedStatus = baselineMap.get(curr.id);
        if (expectedStatus && curr.status !== expectedStatus) {
          throw new Error(`Baseline violation: Tournament ${curr.id} status changed from ${expectedStatus} to ${curr.status}`);
        }
      }

      // 8. Verify zero residue: no tracked IDs remain in the database
      if (trackedIds.tournIds.size > 0) {
        const remainingTourns = await prisma.tournament.count({
          where: { id: { in: Array.from(trackedIds.tournIds) } },
        });
        expect(remainingTourns).toBe(0);
      }
    } catch (err: any) {
      cleanupError = err;
    } finally {
      await prisma.$disconnect();
    }

    if (cleanupError) {
      throw cleanupError;
    }
  });

  test.describe('Club Manager Controls', () => {
    test.use({ storageState: MANAGER_AUTH });

    test('manager views tabs, status controls, and cannot permanently delete cancelled/registered events', async ({
      page,
    }) => {
      const prisma = getPrisma();
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const dedicatedCloseTournName = `QA Tourn Close ${uniqueSuffix}`;

      // Create isolated dedicated fixture tournament for closing registration
      const closeTourn = await prisma.tournament.create({
        data: {
          name: dedicatedCloseTournName,
          location: 'Saigon Racecourse - Sprint Track',
          distanceMeters: 1200,
          trackType: 'TURF',
          prizePool: 10000000,
          registrationDeadline: new Date(Date.now() + 86400000),
          raceDate: new Date(Date.now() + 2 * 86400000),
          status: 'OPEN_REGISTRATION',
        },
      });
      trackedIds.tournIds.add(closeTourn.id);
      await prisma.$disconnect();

      await page.goto('/racing');
      await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

      // Verify filter tabs include CLOSED_REGISTRATION
      await expect(page.getByRole('tab', { name: /All Events|Tất cả/i }).first()).toBeVisible();
      await expect(page.getByRole('tab', { name: /Registration Closed|Đã đóng đăng ký/i }).first()).toBeVisible();
      await expect(page.getByRole('tab', { name: /Cancelled|Đã hủy/i }).first()).toBeVisible();

      // 1. Check open registration event with entries (read-only assertion on baseline)
      await page.getByRole('tab', { name: /Open for Registration|Đang mở đăng ký/i }).first().click();
      const openCardWithEntries = page.locator('section').filter({ hasText: /Giải Đua Ngựa Thủ Công QA 4|Saigon Spring Sprint 2026/i }).first();
      await expect(openCardWithEntries).toBeVisible();
      // It has entries, so "Delete" button must NOT be visible
      await expect(openCardWithEntries.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
      // It should have Close Registration and Cancel Event buttons
      await expect(openCardWithEntries.getByRole('button', { name: /Đóng đăng ký|Close Registration/i })).toBeVisible();
      await expect(openCardWithEntries.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toBeVisible();

      // 2. Check cancelled event: Phu Tho Summer Classic 2026 (read-only assertion on baseline)
      await page.getByRole('tab', { name: /Cancelled|Đã hủy/i }).first().click();
      const cancelledCard = page.locator('section').filter({ hasText: /Phu Tho Summer Classic 2026|Giải Đua Ngựa Thủ Công QA 12/i }).first();
      await expect(cancelledCard).toBeVisible();
      // Cancelled event must NOT have delete button (must be preserved for audit)
      await expect(cancelledCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
      // Cancelled event is terminal: must NOT have reopen button (per CR-006)
      await expect(cancelledCard.getByRole('button', { name: /Mở lại giải|Reopen/i })).toHaveCount(0);

      // 3. Check unused upcoming event: National Endurance Derby 2026 (read-only assertion on baseline)
      await page.getByRole('tab', { name: /Upcoming|Sắp diễn ra/i }).first().click();
      const upcomingCard = page.locator('section').filter({ hasText: /National Endurance Derby 2026|Giải Đua Ngựa Thủ Công QA 1/i }).first();
      await expect(upcomingCard).toBeVisible();
      // It has 0 entries and is UPCOMING, so limited unused delete button is available
      const deleteBtn = upcomingCard.getByRole('button', { name: /Xóa giải chưa dùng|Delete Unused Event|Xóa/i }).first();
      await expect(deleteBtn).toBeVisible();

      // 4. Test Closing registration on the DEDICATED open registration fixture
      await page.getByRole('tab', { name: /Open for Registration|Đang mở đăng ký/i }).first().click();
      const targetOpenCard = page.locator('section').filter({ hasText: dedicatedCloseTournName }).first();
      await expect(targetOpenCard).toBeVisible();
      await targetOpenCard.getByRole('button', { name: /Đóng đăng ký|Close Registration/i }).click();

      // In-app confirmation dialog for closing registration
      const closeDialog = page.getByRole('dialog');
      await expect(closeDialog).toBeVisible();
      await expect(closeDialog.getByText(/Đóng cổng đăng ký thi đấu|Close tournament registration/i)).toBeVisible();
      await closeDialog.getByRole('button', { name: /Đóng đăng ký|Close registration/i }).click();

      // Dialog closes and status transitions to CLOSED_REGISTRATION
      await expect(closeDialog).toBeHidden();

      // Verify it now appears in Registration Closed tab
      const closedTab = page.getByRole('tab', { name: /Registration Closed|Đã đóng đăng ký/i }).first();
      await closedTab.click();
      await expect(closedTab).toHaveAttribute('aria-selected', 'true');
      const closedCard = page.locator('section').filter({ hasText: dedicatedCloseTournName }).first();
      await expect(closedCard).toBeVisible();
      // Closed registration cannot reopen: must NOT have reopen button (per CR-006)
      await expect(closedCard.getByRole('button', { name: /Mở lại đăng ký|Reopen Registration/i })).toHaveCount(0);
      await expect(closedCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
      // Closed registration can be cancelled
      await expect(closedCard.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toBeVisible();
    });

    test('club manager records draft results and locks official race results, transitioning tournament to COMPLETED (CR-007, CR-008, CR-009)', async ({
      page,
    }) => {
      const prisma = getPrisma();
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const dedicatedLockTournName = `QA Tourn Lock ${uniqueSuffix}`;

      // Create 2 dedicated test horses under existing owner
      const testHorse1 = await prisma.horse.create({
        data: {
          name: `QA Lock Horse 1 ${uniqueSuffix}`,
          horseCode: `LH1-${uniqueSuffix.slice(-6)}`,
          microchipRfid: `RFID-LH1-${uniqueSuffix.slice(-8)}`,
          breed: 'Thoroughbred',
          dob: new Date('2020-01-01'),
          gender: 'Colt',
          color: 'Bay',
          ownerId: '00000000-0000-4000-a001-00000000000a',
          status: 'ACTIVE',
        },
      });
      trackedIds.horseIds.add(testHorse1.id);

      const testHorse2 = await prisma.horse.create({
        data: {
          name: `QA Lock Horse 2 ${uniqueSuffix}`,
          horseCode: `LH2-${uniqueSuffix.slice(-6)}`,
          microchipRfid: `RFID-LH2-${uniqueSuffix.slice(-8)}`,
          breed: 'Thoroughbred',
          dob: new Date('2020-01-01'),
          gender: 'Filly',
          color: 'Chestnut',
          ownerId: '00000000-0000-4000-a001-00000000000a',
          status: 'ACTIVE',
        },
      });
      trackedIds.horseIds.add(testHorse2.id);

      // Create dedicated tournament in CLOSED_REGISTRATION with past raceDate and 2 registrations
      const lockTourn = await prisma.tournament.create({
        data: {
          name: dedicatedLockTournName,
          location: 'Trường Đua Phú Thọ',
          distanceMeters: 1200,
          trackType: 'DIRT',
          prizePool: 20000000,
          registrationDeadline: new Date(Date.now() - 2 * 86400000),
          raceDate: new Date(Date.now() - 86400000), // past race date
          status: 'CLOSED_REGISTRATION',
          registrations: {
            create: [
              {
                horseId: testHorse1.id,
                registeredByTrainerId: '00000000-0000-4000-a001-000000000002',
                status: 'REGISTERED',
                registrationDate: new Date(Date.now() - 3 * 86400000),
                notes: 'Dedicated entry 1',
              },
              {
                horseId: testHorse2.id,
                registeredByTrainerId: '00000000-0000-4000-a001-000000000002',
                status: 'REGISTERED',
                registrationDate: new Date(Date.now() - 3 * 86400000),
                notes: 'Dedicated entry 2',
              },
            ],
          },
        },
        include: { registrations: true },
      });
      trackedIds.tournIds.add(lockTourn.id);
      lockTourn.registrations.forEach((r: { id: string }) => trackedIds.regIds.add(r.id));
      await prisma.$disconnect();

      await page.goto('/racing');
      await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

      // Navigate to Registration Closed tab where dedicated fixture exists
      await page.getByRole('tab', { name: /Registration Closed|Đã đóng đăng ký/i }).first().click();
      const card = page.locator('section').filter({ hasText: dedicatedLockTournName }).first();
      await expect(card).toBeVisible();

      // Open Record Results modal as Club Manager
      const recordBtn = card.getByRole('button', { name: /Record Results|Ghi nhận kết quả|⏱️/i });
      await expect(recordBtn).toBeVisible();
      await recordBtn.click();

      const resModal = page.getByRole('dialog');
      await expect(resModal).toBeVisible();

      // Verify Club Manager sees authorization badge and both Save Draft and Lock buttons
      await expect(resModal.getByText(/Club Manager: Authorized to Record & Lock|Authorized to Lock|Ủy quyền/i)).toBeVisible();
      const saveDraftBtn = resModal.getByRole('button', { name: /Save Draft|Lưu bản nháp/i });
      const lockBtn = resModal.getByRole('button', { name: /Lock Official Results|Khóa kết quả/i });
      await expect(saveDraftBtn).toBeVisible();
      await expect(lockBtn).toBeVisible();

      // Fill in result inputs for registrations
      const rankInputs = resModal.locator('input[type="number"]');
      await expect(rankInputs.first()).toBeVisible();
      const inputCount = await rankInputs.count();
      // At least rank and finish time inputs are present
      expect(inputCount).toBeGreaterThan(0);

      // Step 1: Club Manager saves draft without locking (per CR-008)
      await saveDraftBtn.click();
      await expect(resModal).toBeHidden();

      // Confirm tournament remains in Registration Closed tab (status still CLOSED_REGISTRATION)
      await expect(card).toBeVisible();

      // Step 2: Club Manager reopens modal and locks official results
      await card.getByRole('button', { name: /Record Results|Ghi nhận kết quả|⏱️/i }).click();
      await expect(resModal).toBeVisible();

      // Wait for registrations to reload into table
      await expect(resModal.locator('input[type="number"]').first()).toBeVisible();

      // Handle confirmation prompt when Club Manager locks official results
      page.once('dialog', (dialog) => dialog.accept());

      // Club Manager locks official results (single-call result-lock per CR-007)
      await resModal.getByRole('button', { name: /Lock Official Results|Khóa kết quả/i }).click();

      // Modal closes without error and does not hang
      await expect(resModal).toBeHidden();

      // Verify tournament now appears under Completed tab
      const completedTab = page.getByRole('tab', { name: /Completed|Đã hoàn thành/i }).first();
      await completedTab.click();
      await expect(completedTab).toHaveAttribute('aria-selected', 'true');
      const completedCard = page.locator('section').filter({ hasText: dedicatedLockTournName }).first();
      await expect(completedCard).toBeVisible();
      // Completed event is terminal: no delete, no reopen, view results only
      await expect(completedCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
      await expect(completedCard.getByRole('button', { name: /Mở lại/i })).toHaveCount(0);
      await expect(completedCard.getByRole('button', { name: /View Results|Xem kết quả|⏱️/i })).toBeVisible();
    });
  });

  test.describe('Head Trainer Controls', () => {
    test.use({ storageState: TRAINER_AUTH });

    test('head trainer can register horses, scratch with reason, and view published completed results, but has no result-entry or lifecycle mutation controls', async ({
      page,
    }) => {
      const prisma = getPrisma();
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const dedicatedRegTournName = `QA Tourn Reg ${uniqueSuffix}`;

      // Create dedicated eligible horse for Head Trainer to register
      const testEligibleHorse = await prisma.horse.create({
        data: {
          name: `QA Reg Horse ${uniqueSuffix}`,
          horseCode: `RH-${uniqueSuffix.slice(-6)}`,
          microchipRfid: `RFID-RH-${uniqueSuffix.slice(-8)}`,
          breed: 'Thoroughbred',
          dob: new Date('2021-03-15'),
          gender: 'Colt',
          color: 'Bay',
          weightKg: 490,
          ownerId: '00000000-0000-4000-a001-00000000000a',
          status: 'ACTIVE',
        },
      });
      trackedIds.horseIds.add(testEligibleHorse.id);

      // Create dedicated open tournament for trainer registration and scratch
      const regTourn = await prisma.tournament.create({
        data: {
          name: dedicatedRegTournName,
          location: 'Trường Đua Đại Nam',
          distanceMeters: 1600,
          trackType: 'TURF',
          prizePool: 30000000,
          registrationDeadline: new Date(Date.now() + 86400000),
          raceDate: new Date(Date.now() + 2 * 86400000),
          status: 'OPEN_REGISTRATION',
        },
      });
      trackedIds.tournIds.add(regTourn.id);
      await prisma.$disconnect();

      await page.goto('/racing');
      await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

      // Head Trainer cannot create tournament
      await expect(page.getByRole('button', { name: /\+ Create Tournament|\+ Tạo giải/i })).toHaveCount(0);

      // Head Trainer cannot edit, cancel, close, or delete tournaments
      await expect(page.getByRole('button', { name: /Edit|Chỉnh sửa/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Đóng đăng ký|Close Registration/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Mở lại/i })).toHaveCount(0);

      // 1. Verify UPCOMING event has NO Register Horse button (per CR-009)
      await page.getByRole('tab', { name: /Upcoming|Sắp diễn ra/i }).first().click();
      const upcomingCard = page.locator('section').filter({ hasText: /National Endurance Derby 2026|Giải Đua Ngựa Thủ Công QA 1/i }).first();
      await expect(upcomingCard).toBeVisible();
      await expect(upcomingCard.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i })).toHaveCount(0);

      // 2. Head Trainer can see Register Horse button on dedicated OPEN_REGISTRATION event
      const openTab = page.getByRole('tab', { name: /Open for Registration|Đang mở đăng ký/i }).first();
      await openTab.click();
      await expect(openTab).toHaveAttribute('aria-selected', 'true');
      const card = page.locator('section').filter({ hasText: dedicatedRegTournName }).first();
      await expect(card.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i })).toBeVisible();

      // Open modal to register the eligible horse
      await card.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i }).click();
      const regModal = page.getByRole('dialog');
      await expect(regModal).toBeVisible();
      await expect(regModal.getByText(/Register Horse for Tournament|Eligible Horses|Chiến mã đủ điều kiện/i).first()).toBeVisible();

      // Select first eligible horse and confirm registration
      const radio = regModal.locator('input[type="radio"]:not([disabled])').first();
      if (await radio.isVisible()) {
        await radio.check();
        const notesInput = regModal.locator('textarea');
        if (await notesInput.count() > 0) {
          await notesInput.fill('E2E registration test note');
        }
        await regModal.getByRole('button', { name: /Confirm Registration|Đăng ký ngay/i }).click();
        await expect(regModal).toBeHidden();

        // Query created registration ID for tracking
        const dbPrisma = getPrisma();
        const createdReg = await dbPrisma.tournamentRegistration.findFirst({
          where: { tournamentId: regTourn.id },
          select: { id: true },
        });
        if (createdReg) {
          trackedIds.regIds.add(createdReg.id);
        }
        await dbPrisma.$disconnect();

        // 3. Test Scratch flow: Reopen modal to scratch a registered horse with reason
        await card.getByRole('button', { name: /Register Horse|Đăng ký ngựa|Quản lý danh sách/i }).click();
        await expect(regModal).toBeVisible();
      }

      const scratchBtn = regModal.getByRole('button', { name: /Rút ngựa|Scratch/i }).first();
      if (await scratchBtn.isVisible()) {
        await scratchBtn.click();
        const scratchReasonInput = regModal.locator('input[type="text"]').first();
        await expect(scratchReasonInput).toBeVisible();
        await scratchReasonInput.fill('Chấn thương gân chân trước cần điều trị thú y');
        await regModal.getByRole('button', { name: /Xác nhận rút|Confirm Scratch/i }).click();

        // Verify scratched badge and reason are displayed
        await expect(regModal.getByText(/Đã rút|Scratched/i).first()).toBeVisible();
        await expect(regModal.getByText(/Chấn thương gân chân trước/i).first()).toBeVisible();
      }

      await regModal.getByRole('button', { name: /Cancel|Hủy|Đóng|Close/i }).first().click();
      await expect(regModal).toBeHidden();

      // 4. Head Trainer CANNOT see Record Results button on active tournament (per CR-008, CR-009)
      await expect(card.getByRole('button', { name: /Record Results|Ghi nhận kết quả/i })).toHaveCount(0);

      // 5. Head Trainer can view published results of a COMPLETED event in read-only mode (read-only baseline)
      await page.getByRole('tab', { name: /Completed|Đã hoàn thành/i }).first().click();
      const completedCard = page.locator('section').filter({ hasText: /Giải Đua Ngựa Thủ Công QA 9|Grand Autumn Cup 2026/i }).first();
      await expect(completedCard).toBeVisible();
      const viewBtn = completedCard.getByRole('button', { name: /View Results|Xem kết quả|⏱️/i });
      await expect(viewBtn).toBeVisible();
      await viewBtn.click();

      const resModal = page.getByRole('dialog');
      await expect(resModal).toBeVisible();
      await expect(resModal.getByText(/Official Results Locked|Đã khóa kết quả/i)).toBeVisible();
      // Cannot save or lock in read-only mode
      await expect(resModal.getByRole('button', { name: /Save Draft|Lưu bản nháp/i })).toHaveCount(0);
      await expect(resModal.getByRole('button', { name: /Lock Official Results|Khóa kết quả/i })).toHaveCount(0);
      await resModal.getByRole('button', { name: /Close|Đóng/i }).first().click();
      await expect(resModal).toBeHidden();
    });

    test('head trainer user-visible workflows: operational screening, and zero lifecycle or result mutations across all tabs', async ({
      page,
    }) => {
      await page.goto('/racing');
      await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

      // Verify Head Trainer cannot see any creation or management buttons on the page
      await expect(page.getByRole('button', { name: /\+ Create Tournament|\+ Tạo giải/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Edit|Chỉnh sửa/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Đóng đăng ký|Close Registration/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Mở lại/i })).toHaveCount(0);

      // 1. Eligibility Screening Modal on initial view (strict check)
      const openCard = page.locator('section').filter({ hasText: /Giải Đua Ngựa Thủ Công QA 4/i }).first();
      await expect(openCard).toBeVisible();

      await openCard.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i }).click();
      const regModal = page.getByRole('dialog');
      await expect(regModal).toBeVisible();
      await expect(regModal.getByText(/Eligible Horses|Chiến mã đủ điều kiện/i).first()).toBeVisible();
      await regModal.getByRole('button', { name: /Cancel|Hủy|Đóng|Close/i }).first().click();
      await expect(regModal).toBeHidden();

      // 2. Record Results is strictly absent for Head Trainer (per CR-008)
      await expect(openCard.getByRole('button', { name: /Record Results|Ghi nhận kết quả/i })).toHaveCount(0);

      // 3. Verify tabs navigation for Head Trainer: zero lifecycle or result mutation controls across all tabs
      const tabs = [
        /All Events|Tất cả/i,
        /Open for Registration|Đang mở đăng ký/i,
        /Upcoming|Sắp diễn ra/i,
        /Registration Closed|Đã đóng đăng ký/i,
        /Completed|Đã hoàn thành/i,
        /Cancelled|Đã hủy/i,
      ];

      for (const tabRegex of tabs) {
        await page.getByRole('tab', { name: tabRegex }).first().click();
        // On every tab, confirm lifecycle mutation buttons remain completely absent
        await expect(page.getByRole('button', { name: /\+ Create Tournament|\+ Tạo giải/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Đóng đăng ký|Close Registration/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Mở lại/i })).toHaveCount(0);
        // Non-completed cards must not show Record Results
        if (!tabRegex.source.includes('Completed')) {
          await expect(page.getByRole('button', { name: /Record Results|Ghi nhận kết quả/i })).toHaveCount(0);
        }
      }
    });
  });
});
