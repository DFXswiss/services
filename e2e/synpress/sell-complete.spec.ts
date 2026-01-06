/**
 * Complete E2E Test Suite: Sell USDT on Sepolia with Visual Regression
 *
 * This test uses Playwright's toHaveScreenshot() for visual regression testing.
 * Baseline screenshots are committed to the repo and compared on each run.
 *
 * Prerequisites:
 * 1. Run setup: npx ts-node e2e/synpress/setup-wallet.ts
 * 2. Ensure test wallet has Sepolia ETH and USDT
 * 3. Local frontend running on localhost:3001
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts e2e/synpress/sell-complete.spec.ts
 * Update baselines: npx playwright test --config=playwright.synpress.config.ts --update-snapshots
 */

import { test as base, chromium, BrowserContext, Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  CHROME_PATH: path.join(
    process.cwd(),
    'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
    'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  ),
  METAMASK_PATH: path.join(process.cwd(), '.cache-synpress/metamask-chrome-11.9.1'),
  USER_DATA_DIR: path.join(process.cwd(), '.cache-synpress/user-data-ready'),
  WALLET_PASSWORD: 'Tester@1234',
  FRONTEND_URL: 'http://localhost:3001',
  USDT_AMOUNT: '0.01',
  POPUP_TIMEOUT: 10000,
};

// ============================================================================
// VISUAL REGRESSION OPTIONS
// ============================================================================

// Elements to mask in screenshots (dynamic content)
const getDynamicMasks = (page: Page) => [
  // Wallet addresses (0x...)
  page.locator('text=/0x[a-fA-F0-9]{4,}/')
    .or(page.locator('[class*="address"]'))
    .or(page.locator('[class*="hash"]')),
  // Exchange rates and amounts
  page.locator('text=/\\d+\\.\\d+ EUR/')
    .or(page.locator('text=/\\d+\\.\\d+ CHF/'))
    .or(page.locator('text=/\\d+\\.\\d+ USDT/')),
  // Transaction hashes
  page.locator('text=/Transaction hash/').locator('..'),
];

const SCREENSHOT_OPTIONS = {
  fullPage: true,
  maxDiffPixelRatio: 0.05, // Allow 5% pixel difference
  threshold: 0.3, // Color threshold
};

// ============================================================================
// TEST FIXTURES
// ============================================================================

interface TestFixtures {
  context: BrowserContext;
  appPage: Page;
}

export const test = base.extend<TestFixtures>({
  context: async ({}, use) => {
    const setupMarker = path.join(CONFIG.USER_DATA_DIR, '.setup-complete');
    if (!fs.existsSync(setupMarker)) {
      throw new Error('Wallet not set up! Run: npx ts-node e2e/synpress/setup-wallet.ts');
    }

    const context = await chromium.launchPersistentContext(CONFIG.USER_DATA_DIR, {
      executablePath: CONFIG.CHROME_PATH,
      headless: false,
      args: [
        `--disable-extensions-except=${CONFIG.METAMASK_PATH}`,
        `--load-extension=${CONFIG.METAMASK_PATH}`,
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

  appPage: async ({ context }, use) => {
    const appPage = await context.newPage();
    await use(appPage);
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function waitForPopup(context: BrowserContext, timeoutMs: number = CONFIG.POPUP_TIMEOUT): Promise<Page | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const page of context.pages()) {
      if (page.url().includes('notification.html')) {
        await page.waitForLoadState('domcontentloaded');
        return page;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function handleMetaMaskPopup(popup: Page): Promise<string> {
  await popup.waitForTimeout(500);
  const content = await popup.textContent('body').catch(() => '');

  // Unlock
  if (content?.includes('Welcome back') || content?.includes('Unlock')) {
    const pwInput = popup.locator('input[type="password"]').first();
    if (await pwInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pwInput.fill(CONFIG.WALLET_PASSWORD);
      await popup.locator('button:has-text("Unlock")').first().click();
      await popup.waitForTimeout(1000);
      return 'unlocked';
    }
  }

  // Connect
  if (content?.includes('Connect with MetaMask') || content?.includes('Connect to')) {
    const nextBtn = popup.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await popup.waitForTimeout(1000);
    }
    const connectBtn = popup.locator('button:has-text("Connect")').first();
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      return 'connected';
    }
  }

  // Network switch
  if (content?.includes('Switch network') || content?.includes('Allow this site to switch')) {
    // Refuse Mainnet switch
    if (content?.includes('Ethereum Mainnet') && content?.includes('Sepolia')) {
      const cancelBtn = popup.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        return 'network_switch_cancelled';
      }
    }
    const switchBtn = popup.locator('button:has-text("Switch network"), button:has-text("Approve")').first();
    if (await switchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await switchBtn.click();
      return 'network_switched';
    }
  }

  // Sign
  if (content?.includes('Sign') && !content?.includes('Confirm')) {
    const signBtn = popup.locator('button:has-text("Sign"), [data-testid="confirm-footer-button"]').first();
    if (await signBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signBtn.click();
      return 'signed';
    }
  }

  // Confirm transaction
  const confirmBtn = popup.locator('button:has-text("Confirm"), [data-testid="confirm-footer-button"]').first();
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Handle gas estimation error
    const proceedLink = popup.locator('text=I want to proceed anyway').first();
    if (await proceedLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await proceedLink.click();
      await popup.waitForTimeout(1000);
    }
    // Wait for button to enable
    for (let i = 0; i < 15; i++) {
      if (!(await confirmBtn.isDisabled().catch(() => true))) {
        await confirmBtn.click();
        return 'confirmed';
      }
      await popup.waitForTimeout(1000);
    }
    return 'confirm_disabled';
  }

  return 'no-action';
}

async function clearPendingPopups(context: BrowserContext): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const popup = await waitForPopup(context, 2000);
    if (!popup) break;
    const rejectBtn = popup.locator('button:has-text("Reject"), button:has-text("Cancel")').first();
    if (await rejectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rejectBtn.click();
      await popup.waitForTimeout(500).catch(() => {});
    }
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Sell Flow Visual Regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('sell-usdt-flow', async ({ context, appPage }) => {
    test.setTimeout(180000);

    // Clear pending popups
    await clearPendingPopups(context);

    // Step 1: Clear session and navigate to login
    await appPage.goto(CONFIG.FRONTEND_URL);
    await appPage.waitForLoadState('networkidle');
    await appPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await appPage.goto(`${CONFIG.FRONTEND_URL}/sell?blockchain=Sepolia`);
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(2000);

    // Visual: Login page
    await expect(appPage).toHaveScreenshot('01-login-page.png', SCREENSHOT_OPTIONS);

    // Step 2: Click WALLET
    const walletTile = appPage.locator('img[src*="wallet"]').first();
    if (await walletTile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await walletTile.click();
      await appPage.waitForTimeout(1000);
    }

    // Visual: Wallet selection
    await expect(appPage).toHaveScreenshot('02-wallet-selection.png', SCREENSHOT_OPTIONS);

    // Step 3: Click MetaMask and handle login popups
    const metamaskImg = appPage.locator('img[src*="metamask"], img[src*="rabby"]').first();
    if (await metamaskImg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await metamaskImg.click();
    }

    // Handle MetaMask popups
    for (let i = 0; i < 10; i++) {
      await appPage.waitForTimeout(2000);
      const content = await appPage.textContent('body').catch(() => '');
      if (content?.includes('You spend') || content?.includes('Sell')) break;

      const popup = await waitForPopup(context, 3000);
      if (popup) await handleMetaMaskPopup(popup);
    }

    // Step 4: Navigate to USDT sell page
    await appPage.goto(`${CONFIG.FRONTEND_URL}/sell?blockchain=Sepolia&assets=USDT`);
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(2000);

    // Visual: Sell page (mask dynamic wallet address)
    await expect(appPage).toHaveScreenshot('03-sell-page.png', {
      ...SCREENSHOT_OPTIONS,
      mask: getDynamicMasks(appPage),
    });

    // Step 5: Enter amount
    const amountInput = appPage.locator('input[type="number"], input[inputmode="decimal"]').first();
    await amountInput.waitFor({ state: 'visible', timeout: 10000 });
    await amountInput.fill(CONFIG.USDT_AMOUNT);
    await appPage.waitForTimeout(3000); // Wait for exchange rate

    // Visual: Amount entered (mask exchange rate)
    await expect(appPage).toHaveScreenshot('04-amount-entered.png', {
      ...SCREENSHOT_OPTIONS,
      mask: getDynamicMasks(appPage),
    });

    // Step 6: Click transaction button
    const txBtn = appPage.locator('button:has-text("Complete transaction"), button:has-text("Transaktion")').first();
    await txBtn.waitFor({ state: 'visible', timeout: 10000 });
    expect(await txBtn.isDisabled()).toBe(false);

    // Visual: Before transaction
    await expect(appPage).toHaveScreenshot('05-before-transaction.png', {
      ...SCREENSHOT_OPTIONS,
      mask: getDynamicMasks(appPage),
    });

    // Capture TX hash by intercepting ethereum.request calls
    let txHash: string | null = null;
    await appPage.evaluate(() => {
      const originalRequest = (window as any).ethereum?.request;
      if (originalRequest) {
        (window as any).ethereum.request = async function (args: any) {
          const result = await originalRequest.call(this, args);
          if (args.method === 'eth_sendTransaction' || args.method === 'eth_sendRawTransaction') {
            (window as any).__lastTxHash = result;
          }
          return result;
        };
      }
    });

    await txBtn.click();

    // Step 7: Handle transaction confirmation
    for (let i = 0; i < 30; i++) {
      await appPage.waitForTimeout(2000);

      const content = await appPage.textContent('body').catch(() => '');
      if (content?.includes('Nice! You are all set')) {
        // Get TX hash from injected variable
        txHash = await appPage.evaluate(() => (window as any).__lastTxHash);
        if (!txHash) {
          // Fallback: try to find in page HTML
          const pageHtml = await appPage.content();
          const hashMatch = pageHtml.match(/0x[a-fA-F0-9]{64}/);
          if (hashMatch) txHash = hashMatch[0];
        }
        break;
      }

      const popup = await waitForPopup(context, 3000);
      if (popup) await handleMetaMaskPopup(popup);
    }

    // Visual: Success page (mask TX hash)
    await expect(appPage).toHaveScreenshot('06-transaction-success.png', {
      ...SCREENSHOT_OPTIONS,
      mask: getDynamicMasks(appPage),
    });

    // Verify transaction was submitted
    const successText = await appPage.textContent('body').catch(() => '');
    expect(successText).toContain('Nice! You are all set');

    // Step 8: Verify on Etherscan with actual TX hash
    if (txHash) {
      console.log('TX Hash extracted:', txHash);
      const etherscanPage = await context.newPage();
      await etherscanPage.goto(`https://sepolia.etherscan.io/tx/${txHash}`);
      await etherscanPage.waitForLoadState('networkidle');
      await etherscanPage.waitForTimeout(3000);

      // Visual: Etherscan TX page
      await expect(etherscanPage).toHaveScreenshot('07-etherscan-verification.png', {
        ...SCREENSHOT_OPTIONS,
        mask: [
          etherscanPage.locator('#spanTxHash'),
          etherscanPage.locator('text=/0x[a-fA-F0-9]{64}/'),
          etherscanPage.locator('a[href*="/address/0x"]'),
          etherscanPage.locator('.showAge'),
          etherscanPage.locator('text=/\\d+ (sec|min|hour|day)s? ago/'),
          etherscanPage.locator('text=/\\d+\\.\\d+ ETH/'),
          etherscanPage.locator('text=/\\d+\\.\\d+ Gwei/'),
        ],
      });

      await etherscanPage.close();
    } else {
      console.log('No TX hash found - using wallet address fallback');
      const WALLET_ADDRESS = '0x482c8a499c7ac19925a0D2aA3980E1f3C5F19120';
      const etherscanPage = await context.newPage();
      await etherscanPage.goto(`https://sepolia.etherscan.io/address/${WALLET_ADDRESS}`);
      await etherscanPage.waitForLoadState('networkidle');
      await etherscanPage.waitForTimeout(3000);

      await expect(etherscanPage).toHaveScreenshot('07-etherscan-verification.png', {
        ...SCREENSHOT_OPTIONS,
        mask: [
          etherscanPage.locator('a[href*="/tx/0x"]'),
          etherscanPage.locator('a[href*="/address/0x"]'),
          etherscanPage.locator('.showAge'),
        ],
      });

      await etherscanPage.close();
    }
  });
});
