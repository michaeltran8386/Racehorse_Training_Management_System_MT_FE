import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const VET_AUTH = path.join(AUTH_DIR, 'vet.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const GROOM_AUTH = path.join(AUTH_DIR, 'groom.json');
const OWNER_AUTH = path.join(AUTH_DIR, 'owner.json');

/** Ngày mai theo giờ câu lạc bộ (UTC+7), dạng YYYY-MM-DD. */
function tomorrowClub(): string {
  return new Date(Date.now() + 7 * 3600_000 + 24 * 3600_000).toISOString().slice(0, 10);
}

// C-08 · Flow 3: Khóa huấn luyện — chỉ VET đặt khóa, HT và CM chỉ xem.
test.describe('Veterinarian Training Lock Management', () => {
  test.use({ storageState: VET_AUTH });

  test('a veterinarian places a training lock', async ({ page }) => {
    await page.goto('/locks');
    await page.getByRole('button', { name: 'Place Training Lock' }).click();
    const confirm = page.getByRole('button', { name: 'Confirm Training Lock' });
    await expect(confirm).toBeDisabled(); // chưa có lý do
    const dialog = page.getByRole('dialog');
    const picked = await dialog.locator('select').first().evaluate((el: HTMLSelectElement) => el.selectedOptions[0].text);
    const horseName = picked.split(' (')[0].trim();
    await page.getByPlaceholder(/Superficial digital flexor/).fill('Heat and swelling on the left fore tendon after work.');
    await confirm.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Training locks' }).getByText(horseName).first()).toBeVisible();
  });

  test('veterinarian loads simulator vitals but diagnosis remains a human decision', async ({ page }) => {
    await page.route('**/api/simulator/horses/*/exams/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          horseId: 'horse-01',
          resultDraft: {
            modelVersion: 'equiflow-sim-v3',
            temperature: 38.3,
            restingHeartRate: 39,
            respiratoryRate: 14,
            weightKg: 487,
            capturedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/medical/records/new');
    await page.getByRole('button', { name: 'Load Simulator Measurements' }).click();

    await expect(page.getByLabel('Temperature (°C) *')).toHaveValue('38.3');
    await expect(page.getByLabel('Resting Heart Rate (bpm) *')).toHaveValue('39');
    await expect(page.getByLabel('Respiratory Rate (breaths/min) *')).toHaveValue('14');
    await expect(page.getByLabel('Weight (kg)')).toHaveValue('487');
    await expect(page.getByText(/equiflow-sim-v3/)).toBeVisible();
    await expect(page.getByLabel('Definitive Diagnosis *')).toHaveValue('');
  });

  // P0 - FR-3.10 / BR-3.04: Đặt Khóa Huấn Luyện hiển thị cảnh báo tác động và chặn buổi tập nặng
  test('P0: Veterinarian opens Place Training Lock modal with impact assessment warning', async ({ page }) => {
    await page.goto('/locks');
    const placeBtn = page.getByRole('button', { name: /Place Training Lock/i });
    await expect(placeBtn).toBeVisible();
    await placeBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Clinical Order Impact Assessment/i)).toBeVisible();
    await expect(modal.getByText(/BLOCKS all upcoming high-intensity workouts/i)).toBeVisible();

    const confirmBtn = modal.getByRole('button', { name: /Confirm Training Lock/i });
    await expect(confirmBtn).toBeDisabled();

    const reasonTextarea = modal.locator('textarea');
    await reasonTextarea.fill('Suspected left foreleg flexor strain, requires 14 days strict stall rest.');
    await expect(confirmBtn).toBeEnabled();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  // FR-3.20 / STT 16: Cảnh báo rời trang khi biểu mẫu bệnh án chưa lưu
  test('FR-3.20: warning prompt prevents accidental navigation when medical record form is unsaved', async ({ page }) => {
    await page.goto('/medical/records/new');
    await expect(page.getByRole('heading', { name: /New Electronic Medical Record/i })).toBeVisible();

    const reasonInput = page.locator('textarea').first();
    await reasonInput.fill('Routine checkup after morning gallop session');

    let promptSeen = false;
    page.once('dialog', async (dialog) => {
      promptSeen = true;
      expect(dialog.message()).toContain('You have unsaved changes in this medical record');
      await dialog.dismiss();
    });

    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    await cancelBtn.click();

    expect(promptSeen).toBe(true);
    await expect(page).toHaveURL(/\/medical\/records\/new/);
    await expect(reasonInput).toHaveValue('Routine checkup after morning gallop session');
  });

  test('veterinarian can access medical record creation form', async ({ page }) => {
    await page.goto('/medical/records/new');
    await expect(page.getByRole('heading', { name: /New Electronic Medical Record/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save.*Draft/i })).toBeVisible();
  });
});

test.describe('Head Trainer Medical Restrictions', () => {
  test.use({ storageState: TRAINER_AUTH });

  test('trainer sees the locks but cannot place one', async ({ page }) => {
    await page.goto('/locks');
    await expect(page.getByRole('heading', { name: 'Training Locks' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Place.*Lock/i })).toHaveCount(0);
  });

  test('P0: Head Trainer cannot see Place Training Lock action', async ({ page }) => {
    await page.goto('/locks');
    await expect(page.getByRole('heading', { name: 'Training Locks' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Place.*Lock/i })).toHaveCount(0);
  });

  test('P0: locked horse heavy workout remains blocked and cannot be restored', async ({ page }) => {
    await page.goto('/training/calendar');
    await page.locator('input[type=date]').first().fill(tomorrowClub());

    const blockedItem = page.getByRole('button', { name: /(Xích Thố|Northern Dancer Legacy).*Blocked/i });
    if ((await blockedItem.count()) > 0) {
      await blockedItem.click();
      const restore = page.getByRole('button', { name: 'Restore' });
      await expect(restore).toBeDisabled();
      await expect(restore).toHaveAttribute('title', 'The horse is still under a Training Lock.');
    } else {
      await page.goto('/training');
      await expect(page.getByRole('row', { name: /Xích Thố|Northern Dancer Legacy/i }).first()).toBeVisible();
    }
  });

  test('trainer (non-Vet) cannot access medical record creation or edit form (client 403)', async ({ page }) => {
    await page.goto('/medical/records/new');
    await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Medical Record Authoring/i).first()).toBeVisible();

    await page.goto('/medical/records/rec-sample/edit');
    await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
  });

  test('trainer (non-Vet) sees medical records list but cannot see Create Medical Record button', async ({ page }) => {
    await page.goto('/records');
    await expect(page.getByRole('heading', { name: /Electronic Medical Records|Medical Records/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Medical Record/i })).toHaveCount(0);
  });
});

test.describe('Club Manager Medical Restrictions', () => {
  test.use({ storageState: MANAGER_AUTH });

  test('manager sees the locks but cannot place one', async ({ page }) => {
    await page.goto('/locks');
    await expect(page.getByRole('heading', { name: 'Training Locks' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Place.*Lock/i })).toHaveCount(0);
  });

  test('manager (non-Vet) cannot access medical record creation or edit form (client 403)', async ({ page }) => {
    await page.goto('/medical/records/new');
    await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Medical Record Authoring/i).first()).toBeVisible();

    await page.goto('/medical/records/rec-sample/edit');
    await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
  });

  test('manager (non-Vet) sees medical records list but cannot see Create Medical Record button', async ({ page }) => {
    await page.goto('/records');
    await expect(page.getByRole('heading', { name: /Electronic Medical Records|Medical Records/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Medical Record/i })).toHaveCount(0);
  });
});

test.describe('Groom and Owner Medical Restrictions', () => {
  test.describe('Groom', () => {
    test.use({ storageState: GROOM_AUTH });
    test('groom (non-Vet) cannot access medical record creation or edit form (client 403)', async ({ page }) => {
      await page.goto('/medical/records/new');
      await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
      await expect(page.getByText(/Medical Record Authoring/i).first()).toBeVisible();

      await page.goto('/medical/records/rec-sample/edit');
      await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
    });
  });

  test.describe('Owner', () => {
    test.use({ storageState: OWNER_AUTH });
    test('owner (non-Vet) cannot access medical record creation or edit form (client 403)', async ({ page }) => {
      await page.goto('/medical/records/new');
      await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
      await expect(page.getByText(/Medical Record Authoring/i).first()).toBeVisible();

      await page.goto('/medical/records/rec-sample/edit');
      await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
    });
  });

  // TASK-005: Ranh giới quyền tác vụ y tế (chỉ Bác sĩ thú y được lập/sửa bệnh án, non-Vet bị chặn 403)
  const nonVetUsers = [
    { email: 'nam.tran@gmail.com', pass: 'equiflow123' },
    { email: 'viet.do@gmail.com', pass: 'equiflow123' },
    { email: 'ha.ly@gmail.com', pass: 'equiflow123' },
    { email: 'groom@gmail.com', pass: 'EquiFlow@2026' },
  ];

  for (const user of nonVetUsers) {
    test(`${user.email} (non-Vet) cannot access medical record creation or edit form (client 403)`, async ({ page }) => {
      await signIn(page, user.email, user.pass);
      await page.goto('/medical/records/new');
      await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
      await expect(page.getByText(/Medical Record Authoring/i).first()).toBeVisible();

      await page.goto('/medical/records/rec-sample/edit');
      await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
    });

  }

  for (const email of ['nam.tran@gmail.com', 'viet.do@gmail.com']) {
    test(`${email} (non-Vet) sees medical records list but cannot see Create Medical Record button`, async ({ page }) => {
      await signIn(page, email, 'equiflow123');
      await page.goto('/records');
      await expect(page.getByRole('heading', { name: /Electronic Medical Records|Medical Records/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Medical Record/i })).toHaveCount(0);
    });
  }

  test('veterinarian can access medical record creation form', async ({ page }) => {
    await signIn(page, 'chau.le@gmail.com');
    await page.goto('/medical/records/new');
    await expect(page.getByRole('heading', { name: /New Electronic Medical Record/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save.*Draft/i })).toBeVisible();
  });
});

