import { test, expect } from '@playwright/test';

test.describe('Support System', () => {
  test('should load support page', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to support tickets', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to support issue', async ({ page }) => {
    await page.goto('/support/issue');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to telegram support', async ({ page }) => {
    await page.goto('/support/telegram');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to chat', async ({ page }) => {
    await page.goto('/support/chat');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - support page', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('support-main.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('KYC Flow', () => {
  test('should load KYC page', async ({ page }) => {
    await page.goto('/kyc');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load profile page', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load contact page', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load 2FA page', async ({ page }) => {
    await page.goto('/2fa');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load link page', async ({ page }) => {
    await page.goto('/link');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - KYC page', async ({ page }) => {
    await page.goto('/kyc');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('kyc-main.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Account & Settings', () => {
  test('should load account page', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load mail settings page', async ({ page }) => {
    await page.goto('/settings/mail');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - account page', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('account-main.png', {
      maxDiffPixels: 1000,
    });
  });

  test('visual regression - settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('settings-main.png', {
      maxDiffPixels: 1000,
    });
  });
});
