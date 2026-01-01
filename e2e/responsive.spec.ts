import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('homepage renders correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 12
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });

  test('buy page renders correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('buy-mobile.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });

  test('login page renders correctly on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-mobile.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });

  test('homepage renders correctly on tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 834, height: 1194 }, // iPad Pro 11
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });

  test('buy page renders correctly on tablet', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 834, height: 1194 },
    });
    const page = await context.newPage();
    
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('buy-tablet.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });

  test('homepage renders correctly on desktop', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });

  test('buy page renders correctly on desktop', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    
    await page.goto('/buy');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('buy-desktop.png', {
      maxDiffPixels: 1000,
    });
    
    await context.close();
  });
});
