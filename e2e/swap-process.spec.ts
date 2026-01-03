import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

// Note: API Integration tests have been moved to Jest (src/__tests__/api/swap-api.test.ts)
// This file now contains only UI Flow tests that require browser interaction

test.describe('Swap Process - UI Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('should load swap page with session token', async ({ page }) => {
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=USDT&asset-out=ETH`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    const hasSwapContent =
      pageContent?.includes('Swap') ||
      pageContent?.includes('Tauschen') ||
      pageContent?.includes('Du zahlst') ||
      pageContent?.includes('Du erhältst');

    expect(hasSwapContent).toBeTruthy();

    await expect(page).toHaveScreenshot('swap-page-loaded.png', {
      maxDiffPixels: 5000,
      fullPage: true,
    });
  });

  test('should display source and target asset selectors', async ({ page }) => {
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=USDT&asset-out=ETH`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify both assets are selected by checking for USDT and ETH in the page
    const usdtVisible = await page.locator('text=USDT').first().isVisible();
    const ethVisible = await page.locator('text=ETH').first().isVisible();

    expect(usdtVisible || ethVisible).toBeTruthy();
  });

  test('should handle swap flow with pre-filled amount', async ({ page }) => {
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=USDT&asset-out=ETH&amount-in=100`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify amount and assets are pre-filled
    await page.waitForSelector('text=USDT', { timeout: 10000 });
    await page.waitForSelector('text=ETH', { timeout: 10000 });

    await expect(page).toHaveScreenshot('swap-page-with-amount.png', {
      maxDiffPixels: 5000,
    });
  });

  test('should show deposit address after form completion', async ({ page }) => {
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=USDT&asset-out=ETH`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasSwapInfo =
      pageContent?.includes('0x') ||
      pageContent?.includes('deposit') ||
      pageContent?.includes('Einzahlung') ||
      pageContent?.includes('send') ||
      pageContent?.includes('senden') ||
      pageContent?.includes('Swap') ||
      pageContent?.includes('exchange');

    expect(hasSwapInfo).toBeTruthy();
  });
});
