import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.removeItem('equiflow_mock_tournaments');
  });
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('equiflow123');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Tournament lifecycle and controls (TASK-003)', () => {
  test('manager views tabs, status controls, and cannot permanently delete cancelled/registered events', async ({
    page,
  }) => {
    await signIn(page, 'viet.do@gmail.com');
    await page.goto('/racing');
    await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

    // Verify filter tabs include CLOSED_REGISTRATION
    await expect(page.getByRole('tab', { name: /All Events|Tất cả/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /Registration Closed|Đã đóng đăng ký/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /Cancelled|Đã hủy/i }).first()).toBeVisible();

    // 1. Check open registration event with entries: Grand Autumn Cup 2026
    const grandAutumnCard = page.locator('section').filter({ hasText: 'Grand Autumn Cup 2026' }).first();
    await expect(grandAutumnCard).toBeVisible();
    // It has entries, so "Delete" button must NOT be visible
    await expect(grandAutumnCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
    // It should have Close Registration and Cancel Event buttons
    await expect(grandAutumnCard.getByRole('button', { name: /Đóng đăng ký|Close Registration/i })).toBeVisible();
    await expect(grandAutumnCard.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toBeVisible();

    // 2. Check cancelled event: Phu Tho Summer Classic 2026
    await page.getByRole('tab', { name: /Cancelled|Đã hủy/i }).first().click();
    const cancelledCard = page.locator('section').filter({ hasText: 'Phu Tho Summer Classic 2026' }).first();
    await expect(cancelledCard).toBeVisible();
    // Cancelled event must NOT have delete button (must be preserved for audit)
    await expect(cancelledCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
    // Cancelled event is terminal: must NOT have reopen button (per CR-006)
    await expect(cancelledCard.getByRole('button', { name: /Mở lại giải|Reopen/i })).toHaveCount(0);

    // 3. Check unused upcoming event: National Endurance Derby 2026
    await page.getByRole('tab', { name: /Upcoming|Sắp diễn ra/i }).first().click();
    const upcomingCard = page.locator('section').filter({ hasText: 'National Endurance Derby 2026' }).first();
    await expect(upcomingCard).toBeVisible();
    // It has 0 entries and is UPCOMING, so limited unused delete button is available
    const deleteBtn = upcomingCard.getByRole('button', { name: /Xóa giải chưa dùng|Delete Unused Event/i });
    await expect(deleteBtn).toBeVisible();

    // 4. Test Closing registration
    await page.getByRole('tab', { name: /Open for Registration|Đang mở đăng ký/i }).first().click();
    const openCard = page.locator('section').filter({ hasText: 'Grand Autumn Cup 2026' }).first();
    await openCard.getByRole('button', { name: /Đóng đăng ký|Close Registration/i }).click();

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
    const closedCard = page.locator('section').filter({ hasText: 'Grand Autumn Cup 2026' }).first();
    await expect(closedCard).toBeVisible();
    // Closed registration cannot reopen: must NOT have reopen button (per CR-006)
    await expect(closedCard.getByRole('button', { name: /Mở lại đăng ký|Reopen Registration/i })).toHaveCount(0);
    await expect(closedCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
    // Closed registration can be cancelled
    await expect(closedCard.getByRole('button', { name: /Hủy giải đua|Cancel Event/i })).toBeVisible();
  });

  test('head trainer can register horses, scratch with reason, and view published completed results, but has no result-entry or lifecycle mutation controls', async ({
    page,
  }) => {
    await signIn(page, 'nam.tran@gmail.com');
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
    const upcomingCard = page.locator('section').filter({ hasText: 'National Endurance Derby 2026' }).first();
    await expect(upcomingCard).toBeVisible();
    await expect(upcomingCard.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i })).toHaveCount(0);

    // 2. Head Trainer can see Register Horse button on OPEN_REGISTRATION event
    const openTab = page.getByRole('tab', { name: /Open for Registration|Đang mở đăng ký/i }).first();
    await openTab.click();
    await expect(openTab).toHaveAttribute('aria-selected', 'true');
    const card = page.locator('section').filter({ hasText: 'Grand Autumn Cup 2026' }).first();
    await expect(card.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i })).toBeVisible();

    // Open modal to register an eligible horse
    await card.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i }).click();
    const regModal = page.getByRole('dialog');
    await expect(regModal).toBeVisible();
    await expect(regModal.getByText(/Register Horse for Tournament|Eligible Horses/i).first()).toBeVisible();

    // Select first eligible horse and confirm registration (must fail explicitly if unavailable)
    const radio = regModal.locator('input[type="radio"]:not([disabled])').first();
    await expect(radio, 'Expected at least one eligible horse available for tournament registration').toBeVisible();
    await radio.check();
    const notesInput = regModal.locator('textarea');
    if (await notesInput.count() > 0) {
      await notesInput.fill('E2E registration test note');
    }
    await regModal.getByRole('button', { name: /Confirm Registration|Đăng ký ngay/i }).click();
    await expect(regModal).toBeHidden();

    // 3. Test Scratch flow: Reopen modal on Grand Autumn Cup 2026 to scratch a registered horse with reason
    const activeCard = page.locator('section').filter({ hasText: 'Grand Autumn Cup 2026' }).first();
    await expect(activeCard).toBeVisible();
    await activeCard.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i }).click();
    await expect(regModal).toBeVisible();
    const scratchBtn = regModal.getByRole('button', { name: /Rút ngựa|Scratch/i }).first();
    await expect(scratchBtn).toBeVisible();
    await scratchBtn.click();

    // Enter required scratch reason
    const scratchReasonInput = regModal.locator('input[type="text"]').first();
    await expect(scratchReasonInput).toBeVisible();
    await scratchReasonInput.fill('Chấn thương gân chân trước cần điều trị thú y');
    await regModal.getByRole('button', { name: /Xác nhận rút|Confirm Scratch/i }).click();

    // Verify scratched badge and reason are displayed
    await expect(regModal.getByText(/Đã rút|Scratched/i).first()).toBeVisible();
    await expect(regModal.getByText(/Chấn thương gân chân trước/i).first()).toBeVisible();

    await regModal.getByRole('button', { name: /Cancel|Hủy|Đóng|Close/i }).first().click();
    await expect(regModal).toBeHidden();

    // 4. Head Trainer CANNOT see Record Results button on active tournament (per CR-008, CR-009)
    await expect(activeCard.getByRole('button', { name: /Record Results|Ghi nhận kết quả/i })).toHaveCount(0);

    // 5. Head Trainer can view published results of a COMPLETED event in read-only mode
    await page.getByRole('tab', { name: /Completed|Đã hoàn thành/i }).first().click();
    const completedCard = page.locator('section').filter({ hasText: 'Saigon Spring Sprint 2026' }).first();
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
    await signIn(page, 'nam.tran@gmail.com');
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
    const openCard = page.locator('section').filter({ hasText: 'Grand Autumn Cup 2026' }).first();
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

  test('club manager records draft results and locks official race results, transitioning tournament to COMPLETED (CR-007, CR-008, CR-009)', async ({
    page,
  }) => {
    await signIn(page, 'viet.do@gmail.com');
    await page.goto('/racing');
    await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

    // Navigate to Registration Closed tab where post-race CLOSED_REGISTRATION fixture exists (per CR-009)
    await page.getByRole('tab', { name: /Registration Closed|Đã đóng đăng ký/i }).first().click();
    const card = page.locator('section').filter({ hasText: 'Mekong Autumn Stakes 2026' }).first();
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

    // Wait for registrations to load into table
    await expect(resModal.locator('input[type="number"]').first()).toBeVisible();

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
    const completedCard = page.locator('section').filter({ hasText: 'Mekong Autumn Stakes 2026' }).first();
    await expect(completedCard).toBeVisible();
    // Completed event is terminal: no delete, no reopen, view results only
    await expect(completedCard.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
    await expect(completedCard.getByRole('button', { name: /Mở lại/i })).toHaveCount(0);
    await expect(completedCard.getByRole('button', { name: /View Results|Xem kết quả|⏱️/i })).toBeVisible();
  });
});
