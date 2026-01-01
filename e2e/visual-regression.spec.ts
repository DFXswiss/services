import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

// Public pages (no auth required)
const publicPages = [
  { path: '/', name: 'homepage' },
  { path: '/login', name: 'login' },
  { path: '/support', name: 'support' },
];

// Protected pages (auth required)
const protectedPages = [
  { path: '/buy', name: 'buy' },
  { path: '/sell', name: 'sell' },
  { path: '/swap', name: 'swap' },
  { path: '/account', name: 'account' },
  { path: '/settings', name: 'settings' },
  { path: '/kyc', name: 'kyc' },
];

test.describe('Visual Regression - Public Pages', () => {
  for (const { path, name } of publicPages) {
    test(`visual regression - ${name} page`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${name}-page.png`, {
        maxDiffPixels: 1000,
        fullPage: true,
      });
    });
  }
});

test.describe('Visual Regression - Protected Pages', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  for (const { path, name } of protectedPages) {
    test(`visual regression - ${name} page`, async ({ page }) => {
      await page.goto(`${path}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${name}-page.png`, {
        maxDiffPixels: 1000,
        fullPage: true,
      });
    });
  }
});
