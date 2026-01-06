/**
 * Real Blockchain Transaction E2E Test
 *
 * WICHTIG: Vor dem ersten Testlauf muss das Setup ausgeführt werden:
 *   npx ts-node e2e/synpress/setup-wallet.ts
 *
 * Der Test nutzt den bereits eingerichteten Zustand:
 * - MetaMask ist bereits importiert
 * - Bereits mit DFX verbunden und eingeloggt
 * - Nur MetaMask entsperren nötig!
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts e2e/synpress/sepolia-real-tx.spec.ts
 */

import { test as base, chromium, BrowserContext, Page, expect } from '@playwright/test';
import { MetaMask } from '@synthetixio/synpress/playwright';
import path from 'path';
import fs from 'fs';

// Paths
const CHROME_126_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-11.9.1');

// PRE-CONFIGURED user data directory (created by setup-wallet.ts)
const USER_DATA_DIR = path.join(process.cwd(), '.cache-synpress/user-data-ready');

const WALLET_PASSWORD = 'Tester@1234';
const TEST_AMOUNT = '0.01';

interface TestFixtures {
  context: BrowserContext;
  extensionId: string;
  metamask: MetaMask;
  metamaskPage: Page;
  appPage: Page;
}

export const test = base.extend<TestFixtures>({
  context: async ({}, use) => {
    // Check if setup was run
    const setupMarker = path.join(USER_DATA_DIR, '.setup-complete');
    if (!fs.existsSync(setupMarker)) {
      throw new Error(
        'Wallet not set up! Run first: npx ts-node e2e/synpress/setup-wallet.ts'
      );
    }

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      executablePath: CHROME_126_PATH,
      headless: false,
      args: [
        `--disable-extensions-except=${METAMASK_PATH}`,
        `--load-extension=${METAMASK_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--lang=en-US',
      ],
      locale: 'en-US',
      viewport: { width: 1400, height: 900 },
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    await new Promise((r) => setTimeout(r, 2000));

    let extensionId = '';
    for (const page of context.pages()) {
      const match = page.url().match(/chrome-extension:\/\/([a-z0-9]+)/);
      if (match) {
        extensionId = match[1];
        break;
      }
    }

    if (!extensionId) {
      const bgPages = context.backgroundPages();
      for (const bg of bgPages) {
        const match = bg.url().match(/chrome-extension:\/\/([a-z0-9]+)/);
        if (match) {
          extensionId = match[1];
          break;
        }
      }
    }

    if (!extensionId) {
      throw new Error('MetaMask extension not found');
    }

    console.log(`Extension ID: ${extensionId}`);
    await use(extensionId);
  },

  metamaskPage: async ({ context, extensionId }, use) => {
    let metamaskPage = context.pages().find((p) => p.url().includes('chrome-extension://'));
    if (!metamaskPage) {
      metamaskPage = await context.newPage();
      await metamaskPage.goto(`chrome-extension://${extensionId}/home.html`);
    }
    await metamaskPage.waitForLoadState('domcontentloaded');
    await use(metamaskPage);
  },

  metamask: async ({ context, extensionId, metamaskPage }, use) => {
    // Only unlock - wallet is already imported!
    console.log('Unlocking MetaMask...');
    await unlockMetaMask(metamaskPage, WALLET_PASSWORD);

    const metamask = new MetaMask(context, metamaskPage, WALLET_PASSWORD, extensionId);
    await use(metamask);
  },

  appPage: async ({ context }, use) => {
    const appPage = await context.newPage();
    await use(appPage);
  },
});

/**
 * Unlock MetaMask (wallet already imported)
 */
async function unlockMetaMask(page: Page, password: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Check if locked (password screen)
  const unlockInput = page.locator('input[type="password"]').first();
  if (await unlockInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await unlockInput.fill(password);
    const unlockBtn = page.locator('button:has-text("Unlock")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
    console.log('MetaMask unlocked');
  } else {
    console.log('MetaMask already unlocked');
  }

  // Close any popups
  const closeBtn = page.locator('button[aria-label="Close"], .popover-header__button').first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
  }
}

/**
 * Wait for MetaMask popup
 */
async function waitForPopup(context: BrowserContext, timeoutMs: number = 10000): Promise<Page | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const page of context.pages()) {
      if (page.url().includes('notification.html')) {
        await page.waitForLoadState('domcontentloaded');
        return page;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/**
 * Handle MetaMask popup
 */
async function handlePopup(popup: Page): Promise<string> {
  await popup.waitForTimeout(500);
  const content = await popup.textContent('body').catch(() => '');

  // Approve/Confirm buttons
  const confirmBtn = popup.locator(
    'button:has-text("Confirm"), button:has-text("Approve"), [data-testid="confirm-footer-button"]'
  ).first();

  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
    return 'confirmed';
  }

  return 'no-action';
}

test.describe('Real Sepolia USDT Sell', () => {
  test('should execute sell transaction and verify on Etherscan', async ({ context, appPage }) => {
    test.setTimeout(180000); // 3 minutes

    // Step 1: Navigate directly to sell page (already logged in!)
    console.log('Step 1: Navigate to sell page...');
    await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(2000);

    // Verify we're on sell page (not login)
    const pageContent = await appPage.textContent('body').catch(() => '');
    if (pageContent?.includes('Login to DFX')) {
      throw new Error('Not logged in - run setup-wallet.ts first');
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-01-sell-page.png', fullPage: true });
    console.log('   On sell page');

    // Step 2: Fill amount
    console.log('Step 2: Fill amount...');
    const amountInput = appPage.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await amountInput.fill(TEST_AMOUNT);
    }
    await appPage.waitForTimeout(2000);
    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-02-amount.png', fullPage: true });

    // Step 3: Click transaction button
    console.log('Step 3: Click transaction button...');
    const txBtn = appPage.locator('button:has-text("Complete transaction"), button:has-text("Transaktion")').first();
    await appPage.waitForTimeout(2000);

    if (await txBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      const isDisabled = await txBtn.isDisabled();
      console.log(`   Button disabled: ${isDisabled}`);

      if (!isDisabled) {
        await txBtn.click();
        console.log('   Clicked!');
      } else {
        console.log('   Button is disabled - checking page...');
        const content = await appPage.textContent('body');
        console.log(`   Page content: ${content?.substring(0, 300)}`);
      }
    } else {
      throw new Error('Transaction button not found');
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-03-after-click.png', fullPage: true });

    // Step 4: Handle MetaMask transaction popups
    console.log('Step 4: Handle transaction popups...');
    let txHash: string | null = null;

    for (let i = 0; i < 15; i++) {
      await appPage.waitForTimeout(2000);

      // Check for tx hash on page
      const content = await appPage.textContent('body').catch(() => '');
      const hashMatch = content?.match(/0x[a-fA-F0-9]{64}/);
      if (hashMatch) {
        txHash = hashMatch[0];
        console.log(`   TX Hash found: ${txHash}`);
        break;
      }

      // Check for error
      if (content?.includes('Error') || content?.includes('failed')) {
        console.log('   Error detected on page');
        await appPage.screenshot({ path: `e2e/screenshots/debug/real-tx-error-${i}.png`, fullPage: true });
      }

      // Handle MetaMask popup
      const popup = await waitForPopup(context, 3000);
      if (popup) {
        console.log(`   Popup ${i}: handling...`);
        await popup.screenshot({ path: `e2e/screenshots/debug/real-tx-popup-${i}.png` });
        const result = await handlePopup(popup);
        console.log(`   Popup ${i}: ${result}`);
        await popup.waitForTimeout(500).catch(() => {});
      } else {
        console.log(`   Iteration ${i}: no popup, checking page state...`);

        // Log page state for debugging
        if (i === 5 || i === 10) {
          await appPage.screenshot({ path: `e2e/screenshots/debug/real-tx-state-${i}.png`, fullPage: true });
        }
      }
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-04-final.png', fullPage: true });

    // Step 5: Verify on Etherscan
    if (txHash) {
      console.log('Step 5: Verify on Etherscan...');
      const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
      console.log(`   URL: ${etherscanUrl}`);

      const etherscanPage = await context.newPage();
      await etherscanPage.goto(etherscanUrl);
      await etherscanPage.waitForLoadState('networkidle');
      await etherscanPage.waitForTimeout(5000);
      await etherscanPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-05-etherscan.png', fullPage: true });

      const etherscanContent = await etherscanPage.textContent('body');
      const onChain = etherscanContent?.includes('Success') ||
                      etherscanContent?.includes('Pending') ||
                      etherscanContent?.includes('Block');
      console.log(`   On-chain: ${onChain ? 'YES' : 'NOT YET'}`);

      // Step 6: Verify in frontend /tx
      console.log('Step 6: Verify in frontend...');
      await appPage.goto(`http://localhost:3001/tx/${txHash}`);
      await appPage.waitForLoadState('networkidle');
      await appPage.waitForTimeout(3000);
      await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-06-frontend.png', fullPage: true });
    }

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`TX Hash: ${txHash || 'NOT CAPTURED'}`);

    expect(txHash).toBeTruthy();
  });
});
