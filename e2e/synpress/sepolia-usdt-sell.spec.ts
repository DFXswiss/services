/**
 * Sepolia USDT Sell E2E Tests with Real MetaMask
 *
 * Tests using two distinct wallets derived from TEST_SEED:
 *
 * Wallet 1 (0x482c8a499c7ac19925a0D2aA3980E1f3C5F19120): Used for sell-page screenshots
 *   - Captures the sell page and screenshots after attempting USDT selection
 *   - Checks page text for the `Fatal` and `crashed` labels
 *
 * Wallet 2 (0x6aCA95eD0705bAbF3b91fA9212af495510bf8b74): Second-account sell scenario
 *   - Wallet 2 sell scenario is skipped because this Synpress setup uses the first account
 *   - Hook behavior is covered by unit tests; E2E specs capture screens for manual review
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts e2e/synpress/sepolia-usdt-sell.spec.ts
 */

import {
  test,
  expect,
  connectWallet,
  initiateSellTransaction,
  TEST_WALLET_1_ADDRESS,
  TEST_WALLET_2_ADDRESS,
  SEPOLIA_NETWORK,
  SEPOLIA_USDT_CONTRACT,
} from './custom-fixtures';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Attempt to add Sepolia network to MetaMask
 */
async function addSepoliaNetwork(metamaskPage: any): Promise<void> {
  // Try opening network settings
  try {
    // Click on network selector
    const networkSelector = metamaskPage.locator('[data-testid="network-display"]').first();
    if (await networkSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await networkSelector.click();
      await metamaskPage.waitForTimeout(1000);

      // Look for "Add network" button
      const addNetworkBtn = metamaskPage
        .locator('button:has-text("Add network"), button:has-text("Netzwerk hinzufügen")')
        .first();
      if (await addNetworkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addNetworkBtn.click();
        await metamaskPage.waitForTimeout(1000);

        // Check if Sepolia is in popular networks
        const sepoliaPopular = metamaskPage.locator('text=Sepolia').first();
        if (await sepoliaPopular.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sepoliaPopular.click();
          await metamaskPage.waitForTimeout(1000);

          // Approve addition
          const approveBtn = metamaskPage.locator('button:has-text("Approve"), button:has-text("Genehmigen")').first();
          if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await approveBtn.click();
          }
        }
      }
    }
  } catch (e) {
    console.log('Note: Could not auto-add Sepolia network:', e);
  }
}

/**
 * Attempt to switch MetaMask to Sepolia
 */
async function switchToSepolia(metamaskPage: any): Promise<void> {
  try {
    const networkSelector = metamaskPage.locator('[data-testid="network-display"]').first();
    if (await networkSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await networkSelector.click();
      await metamaskPage.waitForTimeout(1000);

      // Look for Sepolia in the list
      const sepoliaOption = metamaskPage.locator('text=Sepolia').first();
      if (await sepoliaOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sepoliaOption.click();
        await metamaskPage.waitForTimeout(1000);
      }
    }
  } catch (e) {
    console.log('Note: Could not switch to Sepolia:', e);
  }
}

/**
 * Attempt to select USDT from the asset selector
 */
async function selectUsdtAsset(page: any): Promise<void> {
  // Try clicking on asset selector (various possible selectors)
  const selectors = ['text=Sepolia Testnet', 'text=ETH', '[data-testid="asset-selector"]', '[class*="asset-select"]'];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.click();
        await page.waitForTimeout(500);
        break;
      }
    } catch {
      continue;
    }
  }

  // Attempt to select USDT from the dropdown
  const usdtOption = page.locator('text=USDT').first();
  try {
    await usdtOption.waitFor({ state: 'visible', timeout: 5000 });
    await usdtOption.click();
    await page.waitForTimeout(1000);
  } catch {
    console.log('USDT option not found in dropdown');
  }
}

/**
 * Wait for page to be fully loaded and ready
 */
async function waitForPageReady(page: any): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// =============================================================================
// WALLET 1 TESTS: sell-page screenshots and a critical-error text check
// =============================================================================

test.describe('Wallet 1 - Sell-Page Screenshots (Real MetaMask)', () => {
  test.beforeAll(async () => {
    console.log('=== WALLET 1 TESTS ===');
    console.log(`Expected address: ${TEST_WALLET_1_ADDRESS}`);
    console.log('Wallet 1 sell-page screenshot scenario');
  });

  test('checks the Wallet 1 address constant', async ({ metamaskPage }) => {
    // Compare the configured address constant with the expected literal
    const addressElement = metamaskPage
      .locator('[data-testid="account-options-menu-button"], [class*="address"]')
      .first();

    // Take screenshot for verification
    await metamaskPage.screenshot({
      path: 'e2e/screenshots/synpress-wallet1-address-verify.png',
    });

    console.log(`Wallet 1 expected: ${TEST_WALLET_1_ADDRESS}`);
    expect(TEST_WALLET_1_ADDRESS.toLowerCase()).toBe('0x482c8a499c7ac19925a0d2aa3980e1f3c5f19120');
  });

  test('captures a sell screenshot after a Sepolia switch attempt', async ({ page, metamask, metamaskPage }) => {
    test.setTimeout(120000);

    // Attempt to switch MetaMask to Sepolia
    await addSepoliaNetwork(metamaskPage);
    await switchToSepolia(metamaskPage);

    // Navigate to the sell page with the Sepolia route parameter
    await page.goto('/sell?blockchain=Sepolia');
    await waitForPageReady(page);

    // Screenshot: Initial page
    await page.screenshot({
      path: 'e2e/screenshots/synpress-wallet1-sepolia-sell-initial.png',
      fullPage: true,
    });

    // Verify page loaded
    const content = await page.textContent('body');
    expect(content).toBeTruthy();

    console.log('Wallet 1 sell-page screenshot captured');
  });

  test('captures sell screenshots after a USDT selection attempt', async ({ page, metamask, metamaskPage }) => {
    test.setTimeout(180000);

    // Attempt to switch MetaMask to Sepolia
    await switchToSepolia(metamaskPage);
    await page.waitForTimeout(2000);

    // Navigate to sell page
    await page.goto('/sell?blockchain=Sepolia');
    await waitForPageReady(page);

    // Connect wallet
    await connectWallet(page, metamask);
    await page.waitForTimeout(3000);

    // Screenshot: After wallet connection
    await page.screenshot({
      path: 'e2e/screenshots/synpress-wallet1-usdt-01-connected.png',
      fullPage: true,
    });

    // Attempt to select the USDT token
    await selectUsdtAsset(page);
    await page.waitForTimeout(2000);

    // Screenshot after attempting USDT selection
    await page.screenshot({
      path: 'e2e/screenshots/synpress-wallet1-usdt-02-asset-selected.png',
      fullPage: true,
    });

    // Enter sell amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await amountInput.fill('10');
      await page.waitForTimeout(2000);
    }

    // Screenshot after attempting amount entry
    await page.screenshot({
      path: 'e2e/screenshots/synpress-wallet1-usdt-03-amount-entered.png',
      fullPage: true,
    });

    // Scroll to transaction button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Screenshot after scrolling to the transaction area
    await page.screenshot({
      path: 'e2e/screenshots/synpress-wallet1-usdt-04-ready-to-transact.png',
      fullPage: true,
    });

    // Click transaction button
    const txButton = page
      .locator(
        'button:has-text("Transaktion"), button:has-text("Sell"), ' +
          'button:has-text("Verkaufen"), button:has-text("Wallet")',
      )
      .first();

    if (await txButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Clicking transaction button...');
      await txButton.click();
      await page.waitForTimeout(5000);

      // The click may open a MetaMask transaction approval prompt
      // Screenshot after clicking
      await page.screenshot({
        path: 'e2e/screenshots/synpress-wallet1-usdt-05-after-tx-click.png',
        fullPage: true,
      });

      // Try to approve in MetaMask if popup appears
      try {
        await metamask.confirmTransaction();
        console.log('MetaMask confirmation prompt accepted');
      } catch (e) {
        console.log('MetaMask confirmation note:', e);
      }
    }

    // Check that page text excludes the Fatal and crashed labels
    const bodyContent = await page.textContent('body');
    const hasCriticalError = bodyContent?.includes('Fatal') || bodyContent?.includes('crashed');
    expect(hasCriticalError).toBeFalsy();

    console.log('Wallet 1 sell screenshots captured after attempting USDT selection');
  });
});

// =============================================================================
// WALLET 2 TESTS: second-account sell scenario (skipped)
// =============================================================================

test.describe('Wallet 2 - Second-Account Scenario (Skipped)', () => {
  test.beforeAll(async () => {
    console.log('=== WALLET 2 TESTS ===');
    console.log(`Expected address: ${TEST_WALLET_2_ADDRESS}`);
    console.log('Wallet 2 second-account sell scenario');
  });

  test('checks the Wallet 2 address constant', async ({}) => {
    // Compare the configured address constant with the expected literal
    console.log(`Wallet 2 expected: ${TEST_WALLET_2_ADDRESS}`);
    expect(TEST_WALLET_2_ADDRESS.toLowerCase()).toBe('0x6aca95ed0705babf3b91fa9212af495510bf8b74');
  });

  test.skip('Wallet 2 second-account scenario', async ({ page, metamask, metamaskPage }) => {
    /**
     * NOTE: This test requires MetaMask to be configured with Wallet 2's derivation path
     * The current Synpress setup only supports the default (first) wallet.
     *
     * To run this scenario:
     * 1. Configure MetaMask with the second account (m/44'/60'/0'/0/0)
     * 2. Or use a separate browser profile with Wallet 2
     *
     * For now, this test is skipped as it requires manual wallet switching.
     * The sponsored-transaction path was removed; unit tests cover the regular ERC-20 transfer
     * helper, and the full-stack test covers the MetaMask transfer request. E2E specs capture screenshots.
     */
    test.setTimeout(180000);

    // This would need MetaMask configured with Wallet 2
    console.log('Wallet 2 sell scenario requires second-account configuration');
    console.log(`Wallet 2 address: ${TEST_WALLET_2_ADDRESS}`);
    console.log('Wallet 2 is reserved for the second-account scenario');

    // Navigate to sell page
    await page.goto('/sell?blockchain=Sepolia');
    await waitForPageReady(page);

    // This skipped scenario does not inspect the page state or wallet capabilities.

    expect(true).toBeTruthy();
  });
});

// =============================================================================
// SELL-PAGE SCREENSHOTS AND TEXT CHECKS
// =============================================================================

test.describe('Sepolia Sell-Page Screenshots and Text Checks', () => {
  test('captures a sell-page screenshot for manual inspection', async ({ page }) => {
    await page.goto('/sell?blockchain=Sepolia');
    await waitForPageReady(page);

    const content = await page.textContent('body');
    // Confirm that the page has some content
    expect(content).toBeTruthy();

    // Screenshot
    await page.screenshot({
      path: 'e2e/screenshots/synpress-sepolia-network-available.png',
      fullPage: true,
    });
  });

  test('captures the sell page after attempting to locate USDT', async ({ page, metamask }) => {
    await page.goto('/sell?blockchain=Sepolia');
    await waitForPageReady(page);

    // Connect wallet first
    await connectWallet(page, metamask);
    await page.waitForTimeout(3000);

    // Try to find USDT in asset list
    const usdtVisible = await page
      .locator('text=USDT')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Screenshot
    await page.screenshot({
      path: 'e2e/screenshots/synpress-sepolia-usdt-available.png',
      fullPage: true,
    });

    console.log(`USDT visible in asset list: ${usdtVisible}`);
    expect(page).toBeTruthy();
  });

  test('checks page text for the Fatal and crashed labels', async ({ page, metamask, metamaskPage }) => {
    // Navigate to the sell page with the Sepolia route parameter
    await page.goto('/sell?blockchain=Sepolia');
    await waitForPageReady(page);

    // Connect wallet
    await connectWallet(page, metamask);
    await page.waitForTimeout(3000);

    // Check that page text excludes the Fatal and crashed labels

    const content = await page.textContent('body');
    const hasCriticalError = content?.includes('Fatal') || content?.includes('crashed');
    expect(hasCriticalError).toBeFalsy();

    // Screenshot
    await page.screenshot({
      path: 'e2e/screenshots/synpress-sepolia-network-mismatch.png',
      fullPage: true,
    });
  });
});
