import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.resolve(process.cwd(), 'test-results', '.auth');
const MANAGER_AUTH = path.join(AUTH_DIR, 'manager.json');
const TRAINER_AUTH = path.join(AUTH_DIR, 'trainer.json');

function getManagerToken(): string {
  const raw = JSON.parse(fs.readFileSync(MANAGER_AUTH, 'utf-8'));
  const origin = raw.origins?.find((o: any) => o.origin.includes('4173') || o.origin.includes('5173'));
  const tokenItem = origin?.localStorage?.find((i: any) => i.name === 'equiflow.tokens');
  return JSON.parse(tokenItem?.value || '{}').accessToken;
}

async function deleteHorse(page: Page, horseName: string) {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Delete profile' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason for deletion').fill('Created by mistake during the import');
  await dialog.getByLabel(/Type the horse name/).fill(horseName);
  await dialog.getByRole('button', { name: 'Delete profile' }).click();
  await expect(page).toHaveURL('/horses');
}

// Flow 1 DL-1.10 / SC-1.05 / DL-1.11: xóa mềm, Hoàn tác, khôi phục.
test.describe('Horse Lifecycle: Delete, Undo, and Restore', () => {
  test.use({ storageState: MANAGER_AUTH });

  test('manager deletes a horse, undoes it, then restores it from Deleted horses', async ({ page, request }) => {
    const ts = Date.now().toString();
    const token = getManagerToken();

    // Create a dedicated test horse via real Backend API
    const createRes = await request.post('http://localhost:3000/api/horses', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Swift Runner ${ts.slice(-4)}`,
        breed: 'Thoroughbred',
        dob: '2020-01-01',
        gender: 'Stallion',
        color: 'Bay',
      },
    });
    expect(createRes.status()).toBe(201);
    const horseData = (await createRes.json()).data;
    const horseId = horseData.id;
    const horseName = horseData.name;

    // Navigate to created horse profile
    await page.goto(`/horses/${horseId}`);
    await expect(page.getByRole('heading', { name: horseName }).first()).toBeVisible();

    // 1. Delete and Undo
    await deleteHorse(page, horseName);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page).toHaveURL(`/horses/${horseId}`);
    await expect(page.getByRole('heading', { name: horseName }).first()).toBeVisible();

    // 2. Delete and Restore from Deleted horses page
    await deleteHorse(page, horseName);
    await page.getByRole('link', { name: 'Deleted horses' }).click();
    await expect(page).toHaveURL('/horses/deleted');
    await expect(page.getByText('Created by mistake during the import')).toBeVisible();

    // Click Restore on the deleted horse row
    await page.getByRole('button', { name: 'Restore' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Deleted by mistake, restore it');
    await dialog.getByRole('button', { name: 'Restore' }).click();

    // Verify horse is restored
    await page.goto(`/horses/${horseId}`);
    await expect(page.getByRole('heading', { name: horseName }).first()).toBeVisible();
  });
});

test.describe('Horse Management Permissions', () => {
  test.use({ storageState: TRAINER_AUTH });

  test('only the manager can open Deleted horses', async ({ page }) => {
    await page.goto('/horses/deleted');
    await expect(page.getByText('403', { exact: false }).first()).toBeVisible();
  });
});
