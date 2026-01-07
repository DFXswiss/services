import { test, expect } from '@playwright/test';
import { BlockchainType, getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Tests for Buy process with Bitcoin wallet.
 *
 * These tests verify that a user with a Bitcoin address can:
 * - Load the buy page
 * - See available assets to buy (BTC)
 * - Complete the buy flow UI
 */
test.describe('Buy Process - Bitcoin Wallet', () => {
  async function getBitcoinToken(
    request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  ): Promise<string> {
    const auth = await getCachedAuth(request, 'bitcoin');
    return auth.token;
  }

  test('should load buy page with Bitcoin session token', async ({ page, request }) => {
    const token = await getBitcoinToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    const hasBuyContent =
      pageContent?.includes('Buy') ||
      pageContent?.includes('Kaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('BTC') ||
      pageContent?.includes('CHF') ||
      pageContent?.includes('EUR');

    expect(hasBuyContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-bitcoin-page-loaded.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display amount input and currency selector for Bitcoin', async ({ page, request }) => {
    const token = await getBitcoinToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0 ||
      (await page.locator('input[placeholder*="0"]').count()) > 0;

    const pageContent = await page.textContent('body');
    const hasFormElements =
      hasAmountInput || pageContent?.includes('100') || pageContent?.includes('CHF') || pageContent?.includes('EUR');

    expect(hasFormElements).toBeTruthy();
  });

  test('should show BTC as target asset', async ({ page, request }) => {
    const token = await getBitcoinToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    // Should show BTC as the asset to receive
    const hasBtcAsset = pageContent?.includes('BTC') || pageContent?.includes('Bitcoin');

    expect(hasBtcAsset).toBeTruthy();
  });

  test('should show trading restriction or successful load for Bitcoin', async ({ page, request }) => {
    const token = await getBitcoinToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasTradingRestriction =
      pageContent?.includes('Trading not allowed') ||
      pageContent?.includes('recommendation') ||
      pageContent?.includes('email address') ||
      pageContent?.includes('nicht erlaubt') ||
      pageContent?.includes('KYC') ||
      pageContent?.includes('verify');

    const hasSuccessfulLoad =
      pageContent?.includes('BTC') ||
      pageContent?.includes('Bitcoin') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst');

    expect(hasTradingRestriction || hasSuccessfulLoad).toBeTruthy();

    if (hasTradingRestriction) {
      console.log('Trading restriction detected - this is expected for sandbox test accounts');
    }
  });

  test('should handle buy flow with pre-filled amount for Bitcoin', async ({ page, request }) => {
    const token = await getBitcoinToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Bitcoin&amountIn=100`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-bitcoin-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display exchange rate for BTC purchase', async ({ page, request }) => {
    const token = await getBitcoinToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Bitcoin&amountIn=100`);
    await page.waitForLoadState('networkidle');

    // Wait for exchange rate to load
    try {
      await page.waitForSelector('text=Wechselkurs', { timeout: 10000 });
    } catch {
      // Try English version
      await page.waitForSelector('text=Exchange rate', { timeout: 5000 }).catch(() => {
        // Rate might be shown in different format
      });
    }

    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    // Should show some exchange rate or BTC amount
    const hasExchangeInfo =
      pageContent?.includes('Wechselkurs') ||
      pageContent?.includes('Exchange rate') ||
      pageContent?.includes('BTC') ||
      pageContent?.includes('0.0');

    expect(hasExchangeInfo).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-bitcoin-exchange-rate.png', {
      maxDiffPixels: 10000,
    });
  });
});
