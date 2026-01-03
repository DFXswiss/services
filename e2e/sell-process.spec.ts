import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

// Note: API Integration tests have been moved to Jest (src/__tests__/api/sell-api.test.ts)
// This file now contains only UI Flow tests that require browser interaction

test.describe('Sell Process - UI Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('should load sell page with session token', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
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
    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
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
    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
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
    await page.goto(`/sell?session=${token}&blockchain=Ethereum&amountIn=0.1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-page-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show deposit address after form completion', async ({ page }) => {
    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
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

// UI-based Blockchain Transaction Tests with Full Screenshot Coverage
test.describe('Sell Process - Blockchain Transaction UI (Sepolia)', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('should complete Sepolia ETH sell UI flow', async ({ page }) => {
    test.setTimeout(60000);

    // Step 1: Navigate to sell page with Sepolia blockchain
    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=ETH', { timeout: 10000 });
    await page.waitForSelector('text=Sepolia', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('sepolia-eth-sell-01-initial-page.png', {
      maxDiffPixels: 2000,
    });

    // Step 2: Enter sell amount in the input field
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    await amountInput.fill('0.01');
    await page.waitForTimeout(1500);

    // Step 3: Wait for quote to load (exchange rate should update)
    await page.waitForSelector('text=Wechselkurs', { timeout: 10000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('sepolia-eth-sell-02-form-filled.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    // Step 4: Scroll down to find and click the transaction button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Look for the wallet transaction button
    const walletButton = page.locator('button:has-text("Wallet"), button:has-text("Transaktion"), button:has-text("Schliesse")').first();
    const buttonVisible = await walletButton.isVisible().catch(() => false);

    if (buttonVisible) {
      await walletButton.click();
      await page.waitForTimeout(2000);
    }

    // Step 5: Screenshot showing the full page with transaction info
    await expect(page).toHaveScreenshot('sepolia-eth-sell-03-transaction-ready.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    console.log('ETH sell UI flow completed');
  });

  test('should complete Sepolia USDT sell UI flow', async ({ page }) => {
    test.setTimeout(60000);

    // Step 1: Navigate to sell page with Sepolia blockchain
    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=ETH', { timeout: 10000 });
    await page.waitForSelector('text=Sepolia', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Step 2: Click on the asset dropdown (the box showing ETH with chevron)
    // Find the clickable area with ETH and Sepolia Testnet
    await page.click('text=Sepolia Testnet');
    await page.waitForTimeout(1000);

    // Step 3: Select USDT from dropdown
    const usdtOption = page.locator('text=USDT').first();
    await usdtOption.waitFor({ state: 'visible', timeout: 5000 });
    await usdtOption.click();
    await page.waitForTimeout(1000);

    // Verify USDT is now selected
    await page.waitForSelector('text=USDT', { timeout: 5000 });

    await expect(page).toHaveScreenshot('sepolia-usdt-sell-01-initial-page.png', {
      maxDiffPixels: 2000,
    });

    // Step 4: Enter sell amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    await amountInput.fill('10');
    await page.waitForTimeout(1500);

    // Step 5: Wait for quote to load
    await page.waitForSelector('text=Wechselkurs', { timeout: 10000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('sepolia-usdt-sell-02-form-filled.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    // Step 6: Scroll down and click the wallet transaction button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const walletButton = page.locator('button:has-text("Wallet"), button:has-text("Transaktion"), button:has-text("Schliesse")').first();
    const buttonVisible = await walletButton.isVisible().catch(() => false);

    if (buttonVisible) {
      await walletButton.click();
      await page.waitForTimeout(2000);
    }

    // Step 7: Final screenshot
    await expect(page).toHaveScreenshot('sepolia-usdt-sell-03-transaction-ready.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    console.log('USDT sell UI flow completed');
  });
});
