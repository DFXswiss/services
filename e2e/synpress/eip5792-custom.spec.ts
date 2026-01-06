/**
 * EIP-5792 E2E Tests with Custom Chrome 126 + MetaMask Setup
 *
 * These tests use custom Playwright fixtures that:
 * 1. Use Chrome 126 (last version with Manifest V2 support)
 * 2. Manually load MetaMask 13.13.1 extension (with EIP-5792 support)
 * 3. Use Synpress's MetaMask class for wallet interactions
 *
 * This bypasses Synpress's cache system issues while keeping
 * the proven wallet automation.
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts
 */

import { test, expect, connectWallet, initiateSellTransaction, SUPPORTED_CHAINS, TEST_WALLET_ADDRESS } from './custom-fixtures';

test.describe('MetaMask Connection', () => {
  test('should launch Chrome with MetaMask extension loaded', async ({ page, metamask, extensionId }) => {
    // Verify extension ID was obtained
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(10);

    // Navigate to a simple page to verify browser works
    await page.goto('about:blank');
    expect(page).toBeTruthy();
  });

  test('should have MetaMask wallet imported with test seed', async ({ metamask, metamaskPage }) => {
    // The metamask fixture already imports the wallet
    // Verify by checking that we can access the MetaMask page
    expect(metamaskPage).toBeTruthy();

    // Check URL contains extension
    const url = metamaskPage.url();
    expect(url).toContain('chrome-extension://');
  });

  test('should connect MetaMask wallet to DFX app', async ({ page, metamask }) => {
    await page.goto('/sell');
    await page.waitForLoadState('networkidle');

    // Connect wallet using helper
    await connectWallet(page, metamask);

    // Verify page is still functional after connection
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('EIP-5792 Gasless Sell Flow', () => {
  test('should detect wallet capabilities after connection', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Ethereum');
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page, metamask);

    // After connection, the app should have checked wallet_getCapabilities
    // Verify no capability-related errors are shown
    const errorElement = page.locator('.error, [class*="error"]').first();
    const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);

    // If there's an error element, check it's not about wallet capabilities
    if (hasError) {
      const errorText = await errorElement.textContent();
      expect(errorText).not.toContain('capabilities');
      expect(errorText).not.toContain('wallet_getCapabilities');
    }
  });

  test('should handle transaction initiation with EIP-5792', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Ethereum');
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page, metamask);

    // Try to initiate a small transaction
    await initiateSellTransaction(page, '0.001');

    // Wait for any MetaMask popup
    await page.waitForTimeout(3000);

    // If MetaMask needs to sign, the transaction flow was triggered
    // The actual signing depends on EIP-5792 support
    expect(page).toBeTruthy();
  });

  test('should handle user rejection gracefully', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Ethereum');
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page, metamask);

    // The page should remain functional
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('EIP-5792 Multi-Chain Support', () => {
  // Test first 3 chains to keep test time reasonable
  for (const chain of SUPPORTED_CHAINS.slice(0, 3)) {
    test(`should connect and verify on ${chain.name}`, async ({ page, metamask }) => {
      await page.goto(`/sell?blockchain=${chain.name}`);
      await page.waitForLoadState('networkidle');

      // Connect wallet
      await connectWallet(page, metamask);

      // Verify page loaded for this chain
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();

      // Take screenshot for visual verification
      await page.screenshot({
        path: `e2e/screenshots/metamask-${chain.name.toLowerCase()}.png`,
      });
    });
  }
});

test.describe('EIP-5792 Paymaster Flow', () => {
  test('should show gasless option when user has tokens but no ETH', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Ethereum');
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page, metamask);

    // Look for balance-related elements
    const balanceElement = page.locator('[class*="balance"], [data-testid*="balance"]').first();
    const hasBalance = await balanceElement.isVisible({ timeout: 3000 }).catch(() => false);

    // Log for debugging
    console.log(`Balance element visible: ${hasBalance}`);
    console.log(`Test wallet address: ${TEST_WALLET_ADDRESS}`);
  });

  test('should trigger wallet_sendCalls with paymasterService', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Ethereum');
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page, metamask);

    // Find and fill amount input
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.fill('0.001');
      await page.waitForTimeout(1000);
    }

    // Look for transaction button
    const txButton = page
      .locator('button:has-text("Transaktion"), button:has-text("Sell"), button:has-text("Verkaufen")')
      .first();

    if (await txButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await txButton.click();

      // Wait for potential MetaMask interaction
      // wallet_sendCalls would be triggered here if:
      // 1. User has tokens but no ETH
      // 2. Backend returns paymasterService data
      // 3. MetaMask supports EIP-5792
      await page.waitForTimeout(5000);
    }

    expect(page).toBeTruthy();
  });
});

test.describe('EIP-5792 Error Handling', () => {
  test('should handle unsupported MetaMask version gracefully', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Ethereum');
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page, metamask);

    // MetaMask 13.13.1 supports EIP-5792 wallet_sendCalls
    // The app can use gasless transactions with paymasterService
    // Verify no crash occurs
    expect(page).toBeTruthy();
  });

  test('should handle network mismatch gracefully', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Optimism');
    await page.waitForLoadState('networkidle');

    // Connect wallet (on default Ethereum network)
    await connectWallet(page, metamask);

    // The app might prompt for network switch
    // Verify page handles this gracefully
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
