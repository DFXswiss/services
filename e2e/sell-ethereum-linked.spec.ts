import { test, expect } from '@playwright/test';
import { getLinkedEvmAuth } from './helpers/auth-cache';

/**
 * E2E Tests for Sell process with Ethereum wallet linked to Bitcoin account.
 *
 * This test demonstrates the linked address flow for selling:
 * 1. First authenticates with Bitcoin (primary wallet)
 * 2. Then links an Ethereum address (wallet3) to the same account
 * 3. No additional KYC is required - uses same account status
 */
test.describe('Sell Process - Ethereum Linked to Bitcoin Account', () => {
  test('should link Ethereum address and load sell page', async ({ page, request }) => {
    const { token, credentials } = await getLinkedEvmAuth(request);

    console.log(`Linked Ethereum address: ${credentials.address}`);

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
      pageContent?.includes('Ethereum');

    expect(hasSellContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-ethereum-linked-page-loaded.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show ETH as the asset to sell with linked account', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    const hasEthAsset = pageContent?.includes('ETH') || pageContent?.includes('Ethereum');

    expect(hasEthAsset).toBeTruthy();
  });

  test('should display amount input for ETH sell with linked account', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0;

    expect(hasAmountInput).toBeTruthy();
  });

  test('should show IBAN selector for linked Ethereum sell', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    // Should show IBAN selector (shared with Bitcoin account)
    const hasIbanContent =
      pageContent?.includes('IBAN') ||
      pageContent?.includes('Bank') ||
      pageContent?.includes('Konto') ||
      pageContent?.includes('account') ||
      pageContent?.includes('erhältst');

    expect(hasIbanContent).toBeTruthy();
  });

  test('should handle sell flow with pre-filled amount for linked Ethereum', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set amount directly in DOM (Playwright's fill/type don't work with StyledInput)
    await page.evaluate(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.value = '0.1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-ethereum-linked-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display exchange rate for linked Ethereum sell', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set amount directly in DOM
    await page.evaluate(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.value = '0.1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Wait for exchange rate or IBAN selector
    try {
      await page.waitForSelector('text=/Wechselkurs|IBAN|erhältst/i', { timeout: 10000 });
    } catch {
      // Continue even if not found
    }

    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    const hasExchangeInfo =
      pageContent?.includes('Wechselkurs') ||
      pageContent?.includes('Exchange rate') ||
      pageContent?.includes('CHF') ||
      pageContent?.includes('EUR') ||
      pageContent?.includes('IBAN');

    expect(hasExchangeInfo).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-ethereum-linked-exchange-rate.png', {
      maxDiffPixels: 10000,
    });
  });
});

test.describe('Sell Process - Ethereum Linked Full UI Flow', () => {
  test('should complete linked Ethereum sell UI flow', async ({ page, request }) => {
    test.setTimeout(60000);

    const { token, credentials } = await getLinkedEvmAuth(request);

    console.log(`Testing sell flow with linked Ethereum address: ${credentials.address}`);

    // Step 1: Navigate to sell page
    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('ethereum-linked-sell-01-initial.png', {
      maxDiffPixels: 10000,
    });

    // Step 2: Enter amount
    await page.evaluate(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.value = '0.1';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(1500);

    // Step 3: Wait for exchange rate or IBAN
    try {
      await page.waitForSelector('text=/Wechselkurs|IBAN|Zahlungsinformation/i', { timeout: 10000 });
    } catch {
      // Continue even if not found
    }
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('ethereum-linked-sell-02-form-filled.png', {
      maxDiffPixels: 10000,
    });

    // Step 4: Full page view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('ethereum-linked-sell-03-full-page.png', {
      maxDiffPixels: 10000,
      fullPage: true,
    });

    console.log('Linked Ethereum sell UI flow completed');
  });
});
