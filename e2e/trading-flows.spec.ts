import { test, expect } from '@playwright/test';

test.describe('Buy Flow', () => {
  test('should load buy page', async ({ page }) => {
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display buy interface elements', async ({ page }) => {
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    
    // Page should have loaded without errors
    const title = await page.title();
    expect(title).toContain('DFX');
  });

  test('visual regression - buy page', async ({ page }) => {
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('buy-flow-page.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Sell Flow', () => {
  test('should load sell page', async ({ page }) => {
    await page.goto('/sell');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display sell interface', async ({ page }) => {
    await page.goto('/sell');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    expect(title).toContain('DFX');
  });

  test('visual regression - sell page', async ({ page }) => {
    await page.goto('/sell');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('sell-flow-page.png', {
      maxDiffPixels: 1000,
    });
  });
});

test.describe('Swap Flow', () => {
  test('should load swap page', async ({ page }) => {
    await page.goto('/swap');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display swap interface', async ({ page }) => {
    await page.goto('/swap');
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    expect(title).toContain('DFX');
  });

  test('visual regression - swap page', async ({ page }) => {
    await page.goto('/swap');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('swap-flow-page.png', {
      maxDiffPixels: 1000,
    });
  });
});
