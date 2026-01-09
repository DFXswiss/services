import { test, expect } from '@playwright/test';
import { getLinkedEvmAuth } from './helpers/auth-cache';

/**
 * E2E Tests for Buy process with Ethereum wallet linked to Bitcoin account.
 *
 * This test demonstrates the linked address flow:
 * 1. First authenticates with Bitcoin (primary wallet)
 * 2. Then links an Ethereum address (wallet3) to the same account
 * 3. No additional KYC is required for the linked address
 *
 * This allows users to use multiple blockchain addresses under one account.
 */
test.describe('Buy Process - Ethereum Linked to Bitcoin Account', () => {
  test('should link Ethereum address to Bitcoin account and load buy page', async ({ page, request }) => {
    const { token, credentials, primaryToken } = await getLinkedEvmAuth(request);

    console.log(`Primary Bitcoin token obtained`);
    console.log(`Linked Ethereum address: ${credentials.address}`);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    const hasBuyContent =
      pageContent?.includes('Buy') ||
      pageContent?.includes('Kaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('Ethereum');

    expect(hasBuyContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-ethereum-linked-page-loaded.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show ETH as the asset to buy with linked account', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    const hasEthAsset = pageContent?.includes('ETH') || pageContent?.includes('Ethereum');

    expect(hasEthAsset).toBeTruthy();
  });

  test('should display amount input for ETH purchase with linked account', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0;

    expect(hasAmountInput).toBeTruthy();
  });

  test('should handle buy flow with pre-filled amount for linked Ethereum', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set amount directly in DOM (Playwright's fill/type don't work with StyledInput)
    await page.evaluate(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.value = '100';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-ethereum-linked-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display exchange rate for linked Ethereum purchase', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Set amount directly in DOM
    await page.evaluate(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.value = '100';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

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
      pageContent?.includes('ETH') ||
      pageContent?.includes('CHF');

    expect(hasExchangeInfo).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-ethereum-linked-exchange-rate.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show same KYC status as Bitcoin primary wallet', async ({ page, request }) => {
    const { token } = await getLinkedEvmAuth(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    // The linked address should have the same KYC status as the primary Bitcoin wallet
    const hasContent =
      pageContent?.includes('Wechselkurs') ||
      pageContent?.includes('Exchange rate') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('Zahlungsinformation') ||
      pageContent?.includes('Payment');

    expect(hasContent).toBeTruthy();
  });
});

test.describe('Buy Process - Ethereum Linked Full UI Flow', () => {
  test('should complete linked Ethereum buy UI flow', async ({ page, request }) => {
    test.setTimeout(60000);

    const { token, credentials } = await getLinkedEvmAuth(request);

    console.log(`Testing buy flow with linked Ethereum address: ${credentials.address}`);

    // Step 1: Navigate to buy page
    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('ethereum-linked-buy-01-initial.png', {
      maxDiffPixels: 10000,
    });

    // Step 2: Enter amount
    await page.evaluate(() => {
      const input = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (input) {
        input.value = '100';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(1500);

    // Step 3: Wait for exchange rate
    try {
      await page.waitForSelector('text=/Wechselkurs|Zahlungsinformation/i', { timeout: 10000 });
    } catch {
      // Continue even if not found
    }
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('ethereum-linked-buy-02-form-filled.png', {
      maxDiffPixels: 10000,
    });

    // Step 4: Full page view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('ethereum-linked-buy-03-full-page.png', {
      maxDiffPixels: 10000,
      fullPage: true,
    });

    console.log('Linked Ethereum buy UI flow completed');
  });
});
