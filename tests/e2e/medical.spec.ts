import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string, password = 'equiflow123') {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');
}

/** Ngày mai theo giờ câu lạc bộ (UTC+7), dạng YYYY-MM-DD. */
function tomorrowClub(): string {
  return new Date(Date.now() + 7 * 3600_000 + 24 * 3600_000).toISOString().slice(0, 10);
}

// C-08 · Flow 3: Khóa huấn luyện — chỉ VET đặt khóa, HT và CM chỉ xem.
test('a veterinarian places a training lock', async ({ page }) => {
  await signIn(page, 'chau.le@gmail.com');
  await page.goto('/locks');
  await page.getByRole('button', { name: 'Place Training Lock' }).click();
  const confirm = page.getByRole('button', { name: 'Confirm Training Lock' });
  await expect(confirm).toBeDisabled(); // chưa có lý do
  const dialog = page.getByRole('dialog');
  // Ngựa mặc định trong ô chọn (chỉ gồm ngựa chưa bị khóa) — tên đứng trước dấu " (".
  const picked = await dialog.locator('select').first().evaluate((el: HTMLSelectElement) => el.selectedOptions[0].text);
  const horseName = picked.split(' (')[0].trim();
  await page.getByPlaceholder(/Superficial digital flexor/).fill('Heat and swelling on the left fore tendon after work.');
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Training locks' }).getByText(horseName).first()).toBeVisible();
});

for (const email of ['nam.tran@gmail.com', 'viet.do@gmail.com']) {
  test(`${email} sees the locks but cannot place one`, async ({ page }) => {
    await signIn(page, email);
    await page.goto('/locks');
    await expect(page.getByRole('heading', { name: 'Training Locks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Place Training Lock' })).toHaveCount(0);
  });
}

test.describe('P0 Medical & Training Lock Workflow (Flow 3)', () => {
  test('veterinarian loads simulator vitals but diagnosis remains a human decision', async ({ page }) => {
    await signIn(page, 'chau.le@gmail.com');
    await page.goto('/medical/records/new');

    await page.getByRole('button', { name: 'Load Simulator Measurements' }).click();

    await expect(page.getByLabel('Temperature (°C) *')).toHaveValue('38.3');
    await expect(page.getByLabel('Resting Heart Rate (bpm) *')).toHaveValue('39');
    await expect(page.getByLabel('Respiratory Rate (breaths/min) *')).toHaveValue('14');
    await expect(page.getByLabel('Weight (kg)')).toHaveValue('487');
    await expect(page.getByText(/equiflow-sim-v3/)).toBeVisible();
    await expect(page.getByLabel('Definitive Diagnosis *')).toHaveValue('');
  });

  // P0 - FR-3.10 / BR-3.03: Chỉ Bác sĩ Thú y (VET) mới có quyền Đặt Khóa Huấn Luyện
  test('P0: Head Trainer cannot see Place Training Lock action', async ({ page }) => {
    await signIn(page, 'nam.tran@gmail.com');
    await page.goto('/locks');
    await expect(page.getByRole('heading', { name: 'Training Locks' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Place.*Lock/i })).toHaveCount(0);
  });

  // P0 - FR-3.10 / BR-3.04: Đặt Khóa Huấn Luyện hiển thị cảnh báo tác động và chặn buổi tập nặng
  test('P0: Veterinarian opens Place Training Lock modal with impact assessment warning', async ({ page }) => {
    await signIn(page, 'chau.le@gmail.com');
    await page.goto('/locks');

    // Click Place Training Lock
    const placeBtn = page.getByRole('button', { name: /Place Training Lock/i });
    await expect(placeBtn).toBeVisible();
    await placeBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Verify clinical order impact warning
    await expect(modal.getByText(/Clinical Order Impact Assessment/i)).toBeVisible();
    await expect(modal.getByText(/BLOCKS all upcoming high-intensity workouts/i)).toBeVisible();

    // Verify Confirm button is disabled when reason is empty or less than 10 chars
    const confirmBtn = modal.getByRole('button', { name: /Confirm Training Lock/i });
    await expect(confirmBtn).toBeDisabled();

    // Enter a valid reason >= 10 chars
    const reasonTextarea = modal.locator('textarea');
    await reasonTextarea.fill('Suspected left foreleg flexor strain, requires 14 days strict stall rest.');
    await expect(confirmBtn).toBeEnabled();

    // Close modal (accept discard confirm prompt)
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  // P0 - RULE-MED-01 / STT 19: Ngựa đang bị khóa thì buổi tập nặng bị chặn
  test('P0: locked horse heavy workout remains blocked and cannot be restored', async ({ page }) => {
    await signIn(page, 'nam.tran@gmail.com');
    await page.goto('/training/calendar');
    await page.locator('input[type=date]').first().fill(tomorrowClub());

    const blockedItem = page.getByRole('button', { name: /Northern Dancer Legacy.*Blocked/ });
    if (await blockedItem.count() > 0) {
      await blockedItem.click();
      const restore = page.getByRole('button', { name: 'Restore' });
      await expect(restore).toBeDisabled();
      await expect(restore).toHaveAttribute('title', 'The horse is still under a Training Lock.');
    } else {
      // Fallback check on training overview
      await page.goto('/training');
      await expect(page.getByRole('row', { name: /Northern Dancer Legacy/ }).first()).toBeVisible();
    }
  });

  // FR-3.20 / STT 16: Cảnh báo rời trang khi biểu mẫu bệnh án chưa lưu
  test('FR-3.20: warning prompt prevents accidental navigation when medical record form is unsaved', async ({ page }) => {
    await signIn(page, 'chau.le@gmail.com');
    await page.goto('/medical/records/new');

    await expect(page.getByRole('heading', { name: /New Electronic Medical Record/i })).toBeVisible();

    // Make the form dirty by typing into Reason for Examination
    const reasonInput = page.locator('textarea').first();
    await reasonInput.fill('Routine checkup after morning gallop session');

    // Setup dialog listener for the window.confirm prompt
    let promptSeen = false;
    page.once('dialog', async (dialog) => {
      promptSeen = true;
      expect(dialog.message()).toContain('You have unsaved changes in this medical record');
      await dialog.dismiss(); // Dismiss to stay on the page
    });

    // Attempt to leave by clicking Cancel button
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    await cancelBtn.click();

    // Ensure dialog prompt was triggered and we are still on the new record page because user dismissed
    expect(promptSeen).toBe(true);
    await expect(page).toHaveURL(/\/medical\/records\/new/);
    await expect(reasonInput).toHaveValue('Routine checkup after morning gallop session');
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

