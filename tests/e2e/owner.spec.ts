import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const path = process.env.RAJVYA_ACCOUNTS_FILE ?? '.local/demo-accounts.json';
test.describe('private owner workflows', () => {
  test.skip(!fs.existsSync(path), 'Local owner fixtures required; never commit these credentials.');
  test.beforeEach(async ({ page }) => {
    const accounts = JSON.parse(fs.readFileSync(path, 'utf8'));
    const owner = accounts.find((a: any) => a.role === 'owner');
    await page.goto('/login');
    await page.getByLabel('Email address').fill(owner.email);
    await page.getByLabel('Password', { exact: true }).fill(owner.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/account/);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  });
  test('owner dashboard loads live data, rate history and private review tools', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Assistant review mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Rates', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Rate history' })).toBeVisible();
    await expect(page.getByText('₹9,150/g').first()).toBeVisible();
    await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add a piece' })).toBeVisible();
    await page.getByRole('button', { name: 'Review', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Review the details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
    await page.screenshot({ path: '.local/screenshots/catalogue-review.png', fullPage: true });
  });
  test('owner can inspect refund and handoff queues without triggering money movement', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^Refund approvals/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Refund approvals', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Conversations', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Conversations', exact: true })).toBeVisible();
    await page.screenshot({ path: '.local/screenshots/conversations.png', fullPage: true });
  });
  test('photo intake compresses the image and keeps unknown financial fields under review', async ({
    page,
  }) => {
    test.skip(!process.env.RAJVYA_LOCAL_PREVIEW, 'Disposable local storage required.');
    await page.route('**/api/admin/extract', (route) =>
      route.fulfill({
        json: {
          draft: {
            name: 'Photo review fixture',
            category: 'Earrings',
            purity: null,
            netMg: null,
            grossMg: null,
            huid: null,
            uncertainFields: ['purity', 'netMg', 'grossMg', 'huid'],
          },
        },
      }),
    );
    await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
    const uploaded = page.waitForResponse((r) => r.url().endsWith('/api/admin/upload'));
    await page.locator('input[type=file]').first().setInputFiles('public/images/earrings.png');
    const response = await uploaded;
    expect(response.ok()).toBe(true);
    const { imageUrl } = await response.json();
    const storagePath = new URL(imageUrl).pathname.split('/catalogue/')[1];
    try {
      expect(imageUrl).toMatch(/\.webp$/);
      const image = await page.request.get(imageUrl);
      expect(image.ok()).toBe(true);
      expect(image.headers()['content-type']).toContain('image/webp');
      expect((await image.body()).length).toBeLessThanOrEqual(2 * 1024 * 1024);
      await expect(page.getByRole('heading', { name: 'Review the details' })).toBeVisible();
      await expect(page.getByText('Needs review: purity, netMg, grossMg, huid')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
    } finally {
      const { error } = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { persistSession: false } },
      )
        .storage.from('catalogue')
        .remove([storagePath]);
      expect(error).toBeNull();
    }
  });
});
