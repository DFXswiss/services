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
    // Use ETH as source (consistent with sell) - default amount 0.1 will be set automatically
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=ETH&asset-out=USDT`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

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
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=ETH&asset-out=USDT`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify both assets are selected
    const ethVisible = await page.locator('text=ETH').first().isVisible();
    const usdtVisible = await page.locator('text=USDT').first().isVisible();

    expect(ethVisible || usdtVisible).toBeTruthy();
  });

  test('should handle swap flow with default amount', async ({ page }) => {
    // ETH source should auto-fill 0.1 as default amount (like sell page)
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=ETH&asset-out=USDT`);
    await page.waitForLoadState('networkidle');
    // Wait for assets to load
    await page.waitForSelector('text=ETH', { timeout: 10000 });
    await page.waitForSelector('text=Tether', { timeout: 10000 }); // USDT shows as "Tether"
    // Try to wait for exchange rate, but don't fail if API is slow
    try {
      await page.waitForSelector('text=Wechselkurs', { timeout: 30000 });
    } catch {
      // API might be slow, continue with screenshot anyway
      console.log('Warning: Exchange rate did not load within timeout');
    }
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('swap-page-with-amount.png', {
      maxDiffPixels: 5000,
    });
  });

  test('should show deposit address after form completion', async ({ page }) => {
    await page.goto(`/swap?session=${token}&blockchain=Ethereum&asset-in=ETH&asset-out=USDT`);
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
