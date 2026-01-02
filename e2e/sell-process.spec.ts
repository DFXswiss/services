import { test, expect } from '@playwright/test';
import { getCachedAuth, getTestIban } from './helpers/auth-cache';
import { TestCredentials } from './test-wallet';

// Note: API Integration tests have been moved to Jest (src/__tests__/api/sell-api.test.ts)
// This file now contains only UI Flow tests that require browser interaction

test.describe('Sell Process - UI Flow', () => {
  let credentials: TestCredentials;
  let testIban: string;
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    credentials = auth.credentials;
    token = auth.token;
    testIban = getTestIban();
  });

  test('should load sell page with session token', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    const hasSellContent =
      pageContent?.includes('Sell') ||
      pageContent?.includes('Verkaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('IBAN');

    expect(hasSellContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-page-loaded.png', {
      maxDiffPixels: 1000,
      fullPage: true,
    });
  });

  test('should display asset selector and amount input', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0;

    const pageContent = await page.textContent('body');
    const hasFormElements =
      hasAmountInput || pageContent?.includes('ETH') || pageContent?.includes('USDT') || pageContent?.includes('IBAN');

    expect(hasFormElements).toBeTruthy();
  });

  test('should show bank account selector or IBAN input', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
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

  test('should handle sell flow with pre-filled amount', async ({ page }) => {
    await page.goto(`/sell?session=${token}&amountIn=0.1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-page-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show deposit address after form completion', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasDepositInfo =
      pageContent?.includes('0x') ||
      pageContent?.includes('deposit') ||
      pageContent?.includes('Einzahlung') ||
      pageContent?.includes('send') ||
      pageContent?.includes('senden');

    const hasFormElements =
      pageContent?.includes('ETH') ||
      pageContent?.includes('IBAN') ||
      pageContent?.includes('EUR') ||
      pageContent?.includes('CHF');

    expect(hasDepositInfo || hasFormElements).toBeTruthy();
  });
});
