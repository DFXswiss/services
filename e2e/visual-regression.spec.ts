import { test, expect } from '@playwright/test';

test.describe('Visual Regression - All Pages', () => {
  const pages = [
    { path: '/', name: 'homepage' },
    { path: '/buy', name: 'buy' },
    { path: '/sell', name: 'sell' },
    { path: '/swap', name: 'swap' },
    { path: '/login', name: 'login' },
    { path: '/support', name: 'support' },
    { path: '/account', name: 'account' },
    { path: '/settings', name: 'settings' },
    { path: '/kyc', name: 'kyc' },
  ];

  for (const { path, name } of pages) {
    test(`visual regression - ${name} page`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Warte auf potentielle Animationen
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`${name}-page.png`, {
        maxDiffPixels: 1000,
        fullPage: true,
      });
    });
  }
});
