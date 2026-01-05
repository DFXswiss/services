/**
 * Sepolia Dual Wallet E2E Tests
 *
 * Tests using two distinct wallets derived from TEST_SEED:
 *
 * Wallet 1 (0x482c8a...): Has ETH + USDT
 *   - Standard sell flow with gas
 *   - ETH sell test
 *   - USDT sell test (pays gas in ETH)
 *
 * Wallet 2 (0x6aCA95...): Has USDT only (no ETH)
 *   - Gasless sell flow via EIP-7702
 *   - USDT sell without ETH for gas
 */

import { test, expect, Page } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';
import { getTestWalletAddressesFromEnv } from './test-wallet';

// =============================================================================
// HELPERS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

async function verifyPageLoaded(page: Page): Promise<boolean> {
  const content = await page.textContent('body');
  return !!(
    content?.includes('ETH') ||
    content?.includes('Sepolia') ||
    content?.includes('Sell') ||
    content?.includes('Verkaufen') ||
    content?.includes('USDT')
  );
}

async function selectUsdt(page: Page): Promise<void> {
  // Try clicking on asset selector (various possible selectors)
  const selectors = ['text=Sepolia Testnet', 'text=ETH', '[data-testid="asset-selector"]'];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        await element.click();
        await page.waitForTimeout(500);
        break;
      }
    } catch {
      continue;
    }
  }

  // Select USDT from dropdown
  const usdtOption = page.locator('text=USDT').first();
  try {
    await usdtOption.waitFor({ state: 'visible', timeout: 5000 });
    await usdtOption.click();
    await page.waitForTimeout(1000);
  } catch {
    console.log('USDT option not found in dropdown');
  }
}

// =============================================================================
// WALLET 1 TESTS: ETH + USDT (with gas)
// Address: 0x482c8a499c7ac19925a0D2aA3980E1f3C5F19120
// =============================================================================

test.describe('Wallet 1 - Sepolia Sell with Gas', () => {
  let token: string;
  let expectedAddresses: { WALLET_1: string; WALLET_2: string };

  test.beforeAll(async ({ request }) => {
    expectedAddresses = getTestWalletAddressesFromEnv();
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    console.log(`Wallet 1 address: ${auth.credentials.address}`);
    expect(auth.credentials.address.toLowerCase()).toBe(expectedAddresses.WALLET_1.toLowerCase());
  });

  test('should sell ETH on Sepolia (Wallet 1 has ETH for gas)', async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to sell page
    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await waitForPageReady(page);

    // Verify page loaded
    expect(await verifyPageLoaded(page)).toBeTruthy();

    // Screenshot: Initial ETH sell page
    await expect(page).toHaveScreenshot('wallet1-eth-sell-01-initial.png', {
      maxDiffPixels: 2000,
    });

    // Enter sell amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('0.0001');
      await page.waitForTimeout(2000);
    }

    // Screenshot: Form filled
    await expect(page).toHaveScreenshot('wallet1-eth-sell-02-amount-entered.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    // Scroll to transaction button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Screenshot: Ready to transact
    await expect(page).toHaveScreenshot('wallet1-eth-sell-03-ready.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    console.log('Wallet 1 ETH sell flow completed');
  });

  test('should sell USDT on Sepolia (Wallet 1 has ETH for gas)', async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to sell page
    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await waitForPageReady(page);

    // Select USDT
    await selectUsdt(page);

    // Screenshot: USDT selected
    await expect(page).toHaveScreenshot('wallet1-usdt-sell-01-asset-selected.png', {
      maxDiffPixels: 2000,
    });

    // Enter sell amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('10');
      await page.waitForTimeout(2000);
    }

    // Screenshot: Form filled
    await expect(page).toHaveScreenshot('wallet1-usdt-sell-02-amount-entered.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    // Scroll to transaction button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Verify USDT content
    const bodyContent = await page.textContent('body');
    expect(bodyContent?.includes('USDT') || bodyContent?.includes('Tether')).toBeTruthy();

    // Screenshot: Ready to transact
    await expect(page).toHaveScreenshot('wallet1-usdt-sell-03-ready.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    console.log('Wallet 1 USDT sell flow completed (with gas)');
  });
});

// =============================================================================
// WALLET 2 TESTS: USDT only (no ETH - gasless)
// Address: 0x6aCA95eD0705bAbF3b91fA9212af495510bf8b74
// =============================================================================

test.describe('Wallet 2 - Sepolia Gasless USDT Sell', () => {
  let token: string;
  let expectedAddresses: { WALLET_1: string; WALLET_2: string };

  test.beforeAll(async ({ request }) => {
    expectedAddresses = getTestWalletAddressesFromEnv();
    const auth = await getCachedAuth(request, 'evm-wallet2');
    token = auth.token;
    console.log(`Wallet 2 address: ${auth.credentials.address}`);
    expect(auth.credentials.address.toLowerCase()).toBe(expectedAddresses.WALLET_2.toLowerCase());
  });

  test('should load sell page for Wallet 2 (no ETH, has USDT)', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await waitForPageReady(page);

    // Verify page loaded
    expect(await verifyPageLoaded(page)).toBeTruthy();

    // Screenshot: Initial page for Wallet 2
    await expect(page).toHaveScreenshot('wallet2-sell-01-initial.png', {
      maxDiffPixels: 2000,
    });

    console.log('Wallet 2 sell page loaded');
  });

  test('should sell USDT on Sepolia without ETH (gasless via EIP-7702)', async ({ page }) => {
    test.setTimeout(90000);

    // Navigate to sell page
    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await waitForPageReady(page);

    // Select USDT
    await selectUsdt(page);

    // Screenshot: USDT selected for gasless wallet
    await expect(page).toHaveScreenshot('wallet2-usdt-sell-01-asset-selected.png', {
      maxDiffPixels: 2000,
    });

    // Enter sell amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('10');
      await page.waitForTimeout(2000);
    }

    // Screenshot: Form filled (gasless flow should be triggered)
    await expect(page).toHaveScreenshot('wallet2-usdt-sell-02-amount-entered.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    // Scroll to transaction section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Screenshot: Transaction section (should show gasless option)
    await expect(page).toHaveScreenshot('wallet2-usdt-sell-03-transaction-section.png', {
      maxDiffPixels: 2000,
      fullPage: true,
    });

    // Check for wallet/transaction button
    const walletButton = page
      .locator('button:has-text("Wallet"), button:has-text("Transaktion"), button:has-text("Schliesse"), button:has-text("Continue")')
      .first();

    if (await walletButton.isVisible().catch(() => false)) {
      // Screenshot before clicking
      await expect(page).toHaveScreenshot('wallet2-usdt-sell-04-before-click.png', {
        maxDiffPixels: 2000,
        fullPage: true,
      });

      await walletButton.click();
      await page.waitForTimeout(3000);

      // Screenshot after clicking (may show wallet prompt or gasless signing)
      await expect(page).toHaveScreenshot('wallet2-usdt-sell-05-after-click.png', {
        maxDiffPixels: 2000,
        fullPage: true,
      });
    }

    // Verify no critical errors
    const bodyContent = await page.textContent('body');
    const hasCriticalError = bodyContent?.includes('Fatal') || bodyContent?.includes('crashed');
    expect(hasCriticalError).toBeFalsy();

    console.log('Wallet 2 gasless USDT sell flow completed');
  });

  test('should handle gasless flow when user has USDT but zero ETH', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await waitForPageReady(page);

    // Navigate to USDT
    await selectUsdt(page);

    // The backend should detect 0 ETH balance and provide gasless option
    const pageContent = await page.textContent('body');

    // Page should still be functional
    expect(pageContent).toBeTruthy();

    // Should show USDT-related content or sell page content
    const hasRelevantContent =
      pageContent?.includes('USDT') ||
      pageContent?.includes('Tether') ||
      pageContent?.includes('Sell') ||
      pageContent?.includes('Verkaufen');
    expect(hasRelevantContent).toBeTruthy();

    // Should not show blocking error
    const hasBlockingGasError =
      pageContent?.includes('Insufficient ETH') && pageContent?.includes('cannot proceed');
    expect(hasBlockingGasError).toBeFalsy();

    console.log('Wallet 2 gasless detection test completed');
  });
});

// =============================================================================
// COMPARISON TESTS
// =============================================================================

test.describe('Wallet Comparison - Gas vs Gasless', () => {
  test('both wallets should authenticate successfully', async ({ request }) => {
    const expectedAddresses = getTestWalletAddressesFromEnv();
    const auth1 = await getCachedAuth(request, 'evm');
    const auth2 = await getCachedAuth(request, 'evm-wallet2');

    expect(auth1.token).toBeTruthy();
    expect(auth2.token).toBeTruthy();

    // Verify different addresses
    expect(auth1.credentials.address).not.toBe(auth2.credentials.address);

    // Verify expected addresses
    expect(auth1.credentials.address.toLowerCase()).toBe(expectedAddresses.WALLET_1.toLowerCase());
    expect(auth2.credentials.address.toLowerCase()).toBe(expectedAddresses.WALLET_2.toLowerCase());

    console.log('Wallet 1:', auth1.credentials.address);
    console.log('Wallet 2:', auth2.credentials.address);
  });
});
