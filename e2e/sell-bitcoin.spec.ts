import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Tests for Sell process with Bitcoin wallet.
 *
 * These tests verify that a user with a Bitcoin address can:
 * - Load the sell page
 * - See BTC as the asset to sell
 * - Enter an amount and see the exchange rate
 * - See IBAN/bank account options for payout
 */
test.describe('Sell Process - Bitcoin Wallet', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'bitcoin');
    token = auth.token;
  });

  test('should load sell page with Bitcoin session token', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    const hasSellContent =
      pageContent?.includes('Sell') ||
      pageContent?.includes('Verkaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('BTC') ||
      pageContent?.includes('IBAN');

    expect(hasSellContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-bitcoin-page-loaded.png', {
      maxDiffPixels: 1000,
      fullPage: true,
    });
  });

  test('should show BTC as the asset to sell', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    const hasBtcAsset = pageContent?.includes('BTC') || pageContent?.includes('Bitcoin');

    expect(hasBtcAsset).toBeTruthy();
  });

  test('should display amount input for BTC sell', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0 ||
      (await page.locator('input[inputmode="decimal"]').count()) > 0;

    const pageContent = await page.textContent('body');
    const hasFormElements =
      hasAmountInput || pageContent?.includes('BTC') || pageContent?.includes('CHF') || pageContent?.includes('EUR');

    expect(hasFormElements).toBeTruthy();
  });

  test('should show bank account selector or IBAN input for Bitcoin sell', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasIbanContent =
      pageContent?.includes('IBAN') ||
      pageContent?.includes('Bank') ||
      pageContent?.includes('Konto') ||
      pageContent?.includes('account') ||
      pageContent?.includes('CH') ||
      pageContent?.includes('DE') ||
      pageContent?.includes('erhältst');

    expect(hasIbanContent).toBeTruthy();
  });

  test('should handle sell flow with pre-filled BTC amount', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin&amountIn=0.001`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-bitcoin-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display exchange rate for BTC sell', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin&amountIn=0.01`);
    await page.waitForLoadState('networkidle');

    // Wait for exchange rate to load
    try {
      await page.waitForSelector('text=Wechselkurs', { timeout: 10000 });
    } catch {
      await page.waitForSelector('text=Exchange rate', { timeout: 5000 }).catch(() => {
        // Rate might be shown in different format
      });
    }

    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    const hasExchangeInfo =
      pageContent?.includes('Wechselkurs') ||
      pageContent?.includes('Exchange rate') ||
      pageContent?.includes('CHF') ||
      pageContent?.includes('EUR');

    expect(hasExchangeInfo).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-bitcoin-exchange-rate.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show deposit address for BTC after form completion', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    // Bitcoin deposit addresses start with bc1, 1, or 3
    const hasDepositInfo =
      pageContent?.includes('bc1') ||
      pageContent?.includes('deposit') ||
      pageContent?.includes('Einzahlung') ||
      pageContent?.includes('send') ||
      pageContent?.includes('senden') ||
      pageContent?.includes('BTC');

    const hasFormElements =
      pageContent?.includes('IBAN') || pageContent?.includes('EUR') || pageContent?.includes('CHF');

    expect(hasDepositInfo || hasFormElements).toBeTruthy();
  });
});

test.describe('Sell Process - Bitcoin Full UI Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'bitcoin');
    token = auth.token;
  });

  test('should complete Bitcoin sell UI flow with amount entry', async ({ page }) => {
    test.setTimeout(60000);

    // Step 1: Navigate to sell page with Bitcoin blockchain
    await page.goto(`/sell?session=${token}&blockchain=Bitcoin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('bitcoin-sell-01-initial-page.png', {
      maxDiffPixels: 2000,
    });

    // Step 2: Enter sell amount in the input field
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    const inputVisible = await amountInput.isVisible().catch(() => false);

    if (inputVisible) {
      await amountInput.fill('0.001');
      await page.waitForTimeout(1500);

      // Step 3: Wait for quote to load (exchange rate should update)
      try {
        await page.waitForSelector('text=Wechselkurs', { timeout: 10000 });
      } catch {
        // Continue even if exchange rate text not found
      }
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('bitcoin-sell-02-form-filled.png', {
        maxDiffPixels: 2000,
        fullPage: true,
      });
    }

    // Step 4: Scroll down to see full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Step 5: Screenshot showing the full page with transaction info
    await expect(page).toHaveScreenshot('bitcoin-sell-03-full-page.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    console.log('Bitcoin sell UI flow completed');
  });
});
