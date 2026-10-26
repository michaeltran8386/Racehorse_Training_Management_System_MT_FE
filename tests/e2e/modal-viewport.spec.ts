import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('trainer@gmail.com');
  await page.locator('input[type=password]').fill('EquiFlow@2026');
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL('/dashboard');
}

const VIEWPORTS = [
  { name: '1366x768 (Desktop Standard)', width: 1366, height: 768 },
  { name: '1280x720 (Desktop Compact)', width: 1280, height: 720 },
  { name: '390x844 (Mobile iPhone 12/13/14)', width: 390, height: 844 },
];

test.use({ baseURL: 'http://localhost:5173' });

test.describe('RaceRegistrationModal Viewport & Responsive Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`Modal header/footer pinned, actions visible and only body scrolls at ${vp.name} (zoom 100%)`, async ({
      page,
    }) => {
      // Set exact viewport and 100% zoom (deviceScaleFactor = 1)
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await signIn(page);
      await page.goto('/racing');
      await expect(page.getByRole('heading', { name: /Tournaments & Entries|Giải đấu/i }).first()).toBeVisible();

      // Switch to Open for Registration tab
      const openTab = page.getByRole('tab', { name: /Open for Registration|Đang mở đăng ký/i }).first();
      await openTab.click();
      await expect(openTab).toHaveAttribute('aria-selected', 'true');

      // Open registration modal on active tournament card
      const card = page.locator('section').filter({ hasText: /Grand Autumn Cup 2026|Saigon Spring Sprint 2026/i }).first();
      await expect(card).toBeVisible();
      const regBtn = card.getByRole('button', { name: /Register Horse|Đăng ký ngựa/i });
      await expect(regBtn).toBeVisible();
      await regBtn.click();

      // Modal dialog is present
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // 1. Verify modal dialog fits within viewport
      const dialogBox = await dialog.boundingBox();
      console.log(`[${vp.name}] dialogBox: y=${dialogBox?.y}, h=${dialogBox?.height}, vp.h=${vp.height}`);
      expect(dialogBox).not.toBeNull();
      expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(vp.height + 4);

      // 2. Verify modal header is visible and within viewport
      const head = dialog.locator('header').first();
      await expect(head).toBeVisible();
      const headBox = await head.boundingBox();
      expect(headBox).not.toBeNull();
      expect(headBox!.y).toBeGreaterThanOrEqual(0);
      expect(headBox!.y + headBox!.height).toBeLessThanOrEqual(vp.height);

      // 3. Verify modal footer is visible and strictly within viewport (pinned, no zooming required)
      const foot = dialog.locator('footer').first();
      await expect(foot).toBeVisible();
      const footBox = await foot.boundingBox();
      expect(footBox).not.toBeNull();
      expect(footBox!.y).toBeGreaterThan(0);
      expect(footBox!.y + footBox!.height).toBeLessThanOrEqual(vp.height + 4);

      // 4. Verify footer action buttons are visible and inside footer bounding box
      const cancelBtn = foot.getByRole('button', { name: /Cancel|Hủy|Đóng|Close/i }).first();
      await expect(cancelBtn).toBeVisible();
      const cancelBox = await cancelBtn.boundingBox();
      expect(cancelBox).not.toBeNull();
      expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(vp.height + 4);

      const confirmBtn = foot.getByRole('button', { name: /Confirm Registration|Đăng ký/i }).first();
      if (await confirmBtn.count() > 0) {
        await expect(confirmBtn).toBeVisible();
        const confirmBox = await confirmBtn.boundingBox();
        expect(confirmBox).not.toBeNull();
        expect(confirmBox!.y + confirmBox!.height).toBeLessThanOrEqual(vp.height + 4);
      }

      // 5. Verify only modal body is a scroll container (no nested list scrollbars)
      const scrollInfo = await dialog.evaluate((el) => {
        const bodyEl = el.querySelector('div[class*="body"]');
        const nestedScrollables = Array.from(el.querySelectorAll('div')).filter((d) => {
          if (d === bodyEl) return false;
          const style = window.getComputedStyle(d);
          return style.overflowY === 'auto' || style.overflowY === 'scroll';
        });
        return {
          bodyFound: !!bodyEl,
          bodyScrollHeight: bodyEl ? bodyEl.scrollHeight : 0,
          bodyClientHeight: bodyEl ? bodyEl.clientHeight : 0,
          nestedScrollablesCount: nestedScrollables.length,
        };
      });

      expect(scrollInfo.bodyFound).toBe(true);
      // No nested scroll regions should exist inside the modal dialog
      expect(scrollInfo.nestedScrollablesCount).toBe(0);

      // Close modal cleanly
      await cancelBtn.click();
      await expect(dialog).toBeHidden();
    });
  }
});
