import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const path = process.env.RAJVYA_ACCOUNTS_FILE ?? '.local/demo-accounts.json';
test('customer can switch to the assigned owner account from the access screen', async ({
  page,
}) => {
  test.skip(!fs.existsSync(path), 'Assigned account fixtures required.');
  const accounts: { role: string; email: string; password: string }[] = JSON.parse(
    fs.readFileSync(path, 'utf8'),
  );
  const customer = accounts.find((a) => a.role === 'customer')!;
  const owner = accounts.find((a) => a.role === 'owner')!;
  await page.goto('/login');
  await page.getByLabel('Email address').fill(customer.email);
  await page.getByLabel('Password', { exact: true }).fill(customer.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Owner access required.' })).toBeVisible();
  expect((await page.request.get('/api/admin')).status()).toBe(403);
  await page.getByRole('link', { name: 'Sign in with owner account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Owner & staff sign in' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with a fresh demo identity' }),
  ).toHaveCount(0);
  await page.getByLabel('Email address').fill(customer.email);
  await page.getByLabel('Password', { exact: true }).fill(customer.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText(
    'This is a customer account.',
  );
  expect((await page.request.get('/api/admin')).status()).toBe(403);
  await page.getByLabel('Email address').fill(owner.email);
  await page.getByLabel('Password', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  expect((await page.request.get('/api/admin')).status()).toBe(200);
});

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
    let publishedId: string | undefined;
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    try {
      expect(imageUrl).toMatch(/\.webp$/);
      const image = await page.request.get(imageUrl);
      expect(image.ok()).toBe(true);
      expect(image.headers()['content-type']).toContain('image/webp');
      expect((await image.body()).length).toBeLessThanOrEqual(2 * 1024 * 1024);
      await expect(page.getByRole('heading', { name: 'Review the details' })).toBeVisible();
      await expect(page.getByText('Needs review: purity, netMg, grossMg, huid')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
      await expect(page.getByRole('combobox', { name: 'Purity', exact: true })).toHaveValue('');
      await expect(page.getByLabel('Net weight (g)', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('Stone charge (₹)', { exact: true })).toHaveValue('0');
      await page.getByRole('combobox', { name: 'Purity', exact: true }).selectOption('18K');
      await page.getByLabel('Net weight (g)', { exact: true }).fill('2.1');
      await page.getByLabel('Gross weight (g)', { exact: true }).fill('2.2');
      await page.getByLabel('Weight, purity and charges checked against the product').check();
      await page.getByLabel('HUID checked, or explicitly unavailable in this demo').check();
      const saved = page.waitForResponse((r) => r.url().endsWith('/api/admin/products'));
      await page.getByRole('button', { name: 'Approve & publish' }).click();
      const publication = await saved;
      const result = await publication.json();
      publishedId = result.id;
      expect(publication.ok()).toBe(true);
      expect(result.status).toBe('live');
      const { data, error } = await service
        .from('products')
        .select('embedding_status,stone_paise,purity')
        .eq('id', publishedId)
        .single();
      expect(error).toBeNull();
      expect(data?.embedding_status).toBe('failed');
      expect(data?.stone_paise).toBe(0);
      expect(data?.purity).toBe('18K');
    } finally {
      if (publishedId) {
        const { error } = await service.from('products').delete().eq('id', publishedId);
        expect(error).toBeNull();
      }
      const { error } = await service.storage.from('catalogue').remove([storagePath]);
      expect(error).toBeNull();
    }
  });
});
