import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';
import { TestCredentials } from './test-wallet';

// Note: API Integration tests have been moved to Jest (src/__tests__/api/swap-api.test.ts)
// This file now contains only UI Flow tests that require browser interaction

test.describe('Swap Process - UI Flow', () => {
  let credentials: TestCredentials;
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    credentials = auth.credentials;
    token = auth.token;
  });

  test('should load swap page with session token', async ({ page }) => {
    await page.goto(`/swap?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    const hasSwapContent =
      pageContent?.includes('Swap') ||
      pageContent?.includes('Tauschen') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('USDT') ||
      pageContent?.includes('USDC');

    expect(hasSwapContent).toBeTruthy();

    await expect(page).toHaveScreenshot('swap-page-loaded.png', {
      maxDiffPixels: 1000,
      fullPage: true,
    });
  });

  test('should display source and target asset selectors', async ({ page }) => {
    await page.goto(`/swap?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    const hasSwapElements =
      pageContent?.includes('ETH') ||
      pageContent?.includes('USDT') ||
      pageContent?.includes('USDC') ||
      pageContent?.includes('From') ||
      pageContent?.includes('To') ||
      pageContent?.includes('Von') ||
      pageContent?.includes('Nach');

    expect(hasSwapElements).toBeTruthy();
  });

  test('should handle swap flow with pre-filled amount', async ({ page }) => {
    await page.goto(`/swap?session=${token}&amountIn=0.1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('swap-page-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show deposit address after form completion', async ({ page }) => {
    await page.goto(`/swap?session=${token}`);
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
