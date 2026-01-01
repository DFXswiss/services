import { test, expect } from '@playwright/test';

test.describe('Payment Links', () => {
  test('should load payment link page', async ({ page }) => {
    await page.goto('/pl');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load payment link POS page', async ({ page }) => {
    await page.goto('/pl/pos');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load payment link result page', async ({ page }) => {
    await page.goto('/pl/result');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load invoice page', async ({ page }) => {
    await page.goto('/invoice');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load payment routes page', async ({ page }) => {
    await page.goto('/routes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Transaction Pages', () => {
  test('should load transaction list page', async ({ page }) => {
    await page.goto('/tx');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load blockchain transaction page', async ({ page }) => {
    await page.goto('/blockchain/tx');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Special Pages', () => {
  test('should load SEPA page', async ({ page }) => {
    await page.goto('/sepa');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load stickers page', async ({ page }) => {
    await page.goto('/stickers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load safe page', async ({ page }) => {
    await page.goto('/safe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load realunit page', async ({ page }) => {
    await page.goto('/realunit');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('URL Parameter Handling', () => {
  test('should handle mode parameter', async ({ page }) => {
    await page.goto('/?mode=buy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle blockchain parameter', async ({ page }) => {
    await page.goto('/?blockchain=Bitcoin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle language parameter', async ({ page }) => {
    await page.goto('/?lang=de');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle combined parameters', async ({ page }) => {
    await page.goto('/?mode=sell&blockchain=Ethereum&lang=en');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
