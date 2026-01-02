import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

let token: string;

test.beforeAll(async ({ request }) => {
  const auth = await getCachedAuth(request, 'evm');
  token = auth.token;
});

test.describe('Public Pages', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixels: 1000,
    });
  });

  test('visual regression - login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Support System', () => {
  test('should load support page', async ({ page }) => {
    await page.goto(`/support?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to support tickets', async ({ page }) => {
    await page.goto(`/support/tickets?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to support issue', async ({ page }) => {
    await page.goto(`/support/issue?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to telegram support', async ({ page }) => {
    await page.goto(`/support/telegram?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to chat', async ({ page }) => {
    await page.goto(`/support/chat?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - support page', async ({ page }) => {
    await page.goto(`/support?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('support-main.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('KYC Flow', () => {
  test('should load KYC page', async ({ page }) => {
    await page.goto(`/kyc?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load profile page', async ({ page }) => {
    await page.goto(`/profile?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load contact page', async ({ page }) => {
    await page.goto(`/contact?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load 2FA page', async ({ page }) => {
    await page.goto(`/2fa?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load link page', async ({ page }) => {
    await page.goto(`/link?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - KYC page', async ({ page }) => {
    await page.goto(`/kyc?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('kyc-main.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Account & Settings', () => {
  test('should load account page', async ({ page }) => {
    await page.goto(`/account?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load settings page', async ({ page }) => {
    await page.goto(`/settings?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load mail settings page', async ({ page }) => {
    await page.goto(`/settings/mail?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('visual regression - account page', async ({ page }) => {
    await page.goto(`/account?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('account-main.png', {
      maxDiffPixels: 1000,
    });
  });

  test('visual regression - settings page', async ({ page }) => {
    await page.goto(`/settings?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('settings-main.png', {
      maxDiffPixels: 1000,
    });
  });
});
