import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DFX.swiss/);
  });

  test('should display main content', async ({ page }) => {
    await page.goto('/');
    // Warte bis die App geladen ist
    await page.waitForSelector('#root:not(:has(.loader))');
  });

  test('visual regression - homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixels: 1000,
    });
  });
});
