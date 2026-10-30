import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');

export const AUTH_STATES = {
  manager: path.join(AUTH_DIR, 'manager.json'),
  trainer: path.join(AUTH_DIR, 'trainer.json'),
  vet: path.join(AUTH_DIR, 'vet.json'),
  groom: path.join(AUTH_DIR, 'groom.json'),
  owner: path.join(AUTH_DIR, 'owner.json'),
  groom2: path.join(AUTH_DIR, 'groom2.json'),
  owner2: path.join(AUTH_DIR, 'owner2.json'),
};

const ROLES = [
  { role: 'manager', email: 'manager@gmail.com', file: AUTH_STATES.manager },
  { role: 'trainer', email: 'trainer@gmail.com', file: AUTH_STATES.trainer },
  { role: 'vet', email: 'vet@gmail.com', file: AUTH_STATES.vet },
  { role: 'groom', email: 'groom@gmail.com', file: AUTH_STATES.groom },
  { role: 'owner', email: 'owner@gmail.com', file: AUTH_STATES.owner },
  { role: 'groom2', email: 'groom2@gmail.com', file: AUTH_STATES.groom2 },
  { role: 'owner2', email: 'owner2@gmail.com', file: AUTH_STATES.owner2 },
];

setup.describe('Global Authentication Setup (CR-028)', () => {
  setup.beforeAll(() => {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  });

  for (const { role, email, file } of ROLES) {
    setup(`authenticate as ${role}`, async ({ page }) => {
      await page.goto('/login');
      await page.locator('input[type=email]').fill(email);
      await page.locator('input[type=password]').fill('EquiFlow@2026');

      // Intercept /auth/login response to inspect real HTTP status & dynamic throttler 429
      const loginResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/auth/login') && resp.request().method() === 'POST',
        { timeout: 15000 },
      );
      await page.locator('button[type=submit]').click();
      const loginResponse = await loginResponsePromise;

      if (loginResponse.status() === 429) {
        const retryAfterSec = Number(loginResponse.headers()['retry-after'] || '60');
        expect(Number.isFinite(retryAfterSec) && retryAfterSec > 0 && retryAfterSec <= 60).toBe(true);
        setup.setTimeout(setup.info().timeout + (retryAfterSec + 1) * 1000);
        console.warn(`[auth-setup] Throttler rate limit reached (HTTP 429). Waiting ${retryAfterSec}s per retry-after header...`);
        await page.waitForTimeout((retryAfterSec + 1) * 1000);
        const retryResponsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/auth/login') && resp.request().method() === 'POST',
          { timeout: 15000 },
        );
        await page.locator('button[type=submit]').click();
        expect((await retryResponsePromise).status()).toBe(200);
      } else {
        expect(loginResponse.status()).toBe(200);
      }

      // Ensure navigation away from login page
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15000 });

      // Save authenticated storage state
      await page.context().storageState({ path: file });
    });
  }
});
