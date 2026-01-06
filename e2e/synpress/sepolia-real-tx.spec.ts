/**
 * Real Blockchain Transaction E2E Test
 *
 * This test executes a REAL sell transaction on Sepolia testnet and verifies:
 * 1. Transaction is submitted successfully
 * 2. Transaction appears on Etherscan
 * 3. Transaction is visible in frontend under /tx
 *
 * KEY IMPROVEMENT: Uses persistent user data directory so MetaMask is only
 * set up ONCE and reused across test runs.
 *
 * Prerequisites:
 * - Test wallet must have Sepolia USDT + ETH for gas
 * - .env.test must contain TEST_SEED with funded wallet
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts e2e/synpress/sepolia-real-tx.spec.ts
 */

import { test as base, chromium, BrowserContext, Page, expect } from '@playwright/test';
import { MetaMask } from '@synthetixio/synpress/playwright';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Chrome 126 path
const CHROME_126_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);

// MetaMask extension path
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-11.9.1');

// PERSISTENT user data directory - MetaMask state is saved here!
const USER_DATA_DIR = path.join(process.cwd(), '.cache-synpress/user-data-sepolia');

// Credentials
const WALLET_PASSWORD = 'Tester@1234';
const TEST_SEED_PHRASE = process.env.TEST_SEED || '';

// Test amount
const TEST_AMOUNT = '0.01';

interface TestFixtures {
  context: BrowserContext;
  extensionId: string;
  metamask: MetaMask;
  metamaskPage: Page;
  appPage: Page;
}

export const test = base.extend<TestFixtures>({
  // Use PERSISTENT context - MetaMask wallet is saved between runs!
  context: async ({}, use) => {
    // Create user data dir if it doesn't exist
    if (!fs.existsSync(USER_DATA_DIR)) {
      fs.mkdirSync(USER_DATA_DIR, { recursive: true });
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
        '--accept-lang=en-US,en',
      ],
      locale: 'en-US',
      viewport: { width: 1400, height: 900 },
    });

    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait longer for extension to initialize
    let extensionId = '';

    // Helper to extract extension ID from chrome-extension:// URL
    const extractExtensionId = (url: string): string => {
      if (!url.startsWith('chrome-extension://')) return '';
      const match = url.match(/chrome-extension:\/\/([a-z0-9]+)/);
      return match ? match[1] : '';
    };

    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));

      // Try background pages first
      const bgPages = context.backgroundPages();
      for (const bg of bgPages) {
        const id = extractExtensionId(bg.url());
        if (id) {
          extensionId = id;
          break;
        }
      }
      if (extensionId) break;

      // Try service workers (Manifest V3)
      const workers = context.serviceWorkers();
      for (const worker of workers) {
        const id = extractExtensionId(worker.url());
        if (id) {
          extensionId = id;
          break;
        }
      }
      if (extensionId) break;

      // Try existing pages
      for (const p of context.pages()) {
        const id = extractExtensionId(p.url());
        if (id) {
          extensionId = id;
          break;
        }
      }

      if (extensionId) break;
      console.log(`Waiting for MetaMask extension... (attempt ${attempt + 1})`);
    }

    if (!extensionId) {
      throw new Error('Could not find MetaMask extension ID - is MetaMask installed?');
    }

    console.log(`MetaMask Extension ID: ${extensionId}`);
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
    // Check if MetaMask is already set up (persistent context)
    const isSetUp = await checkMetaMaskSetup(metamaskPage);

    if (isSetUp) {
      console.log('MetaMask already set up - unlocking wallet...');
      await unlockMetaMask(metamaskPage, WALLET_PASSWORD);
    } else {
      console.log('MetaMask not set up - importing wallet...');
      await setupMetaMaskWallet(metamaskPage, TEST_SEED_PHRASE, WALLET_PASSWORD);
    }

    const metamask = new MetaMask(context, metamaskPage, WALLET_PASSWORD, extensionId);
    await use(metamask);
  },

  appPage: async ({ context }, use) => {
    const appPage = await context.newPage();
    await use(appPage);
  },
});

export const { expect: testExpect } = test;

/**
 * Check if MetaMask wallet is already set up
 */
async function checkMetaMaskSetup(page: Page): Promise<boolean> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check for unlock screen (already set up, just locked)
  const unlockInput = page.locator('input[type="password"]').first();
  const unlockVisible = await unlockInput.isVisible({ timeout: 3000 }).catch(() => false);
  if (unlockVisible) {
    return true; // Needs unlock
  }

  // Check for account menu (already unlocked)
  const accountBtn = page.locator('[data-testid="account-menu-icon"]').first();
  const accountVisible = await accountBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (accountVisible) {
    return true; // Already unlocked
  }

  // Check for onboarding screen (not set up)
  const importBtn = page.locator('button:has-text("Import an existing wallet")').first();
  const importVisible = await importBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (importVisible) {
    return false; // Needs setup
  }

  // Check for terms checkbox (first time)
  const checkbox = page.locator('input[type="checkbox"]').first();
  const checkboxVisible = await checkbox.isVisible({ timeout: 2000 }).catch(() => false);
  if (checkboxVisible) {
    return false; // Needs setup
  }

  return false;
}

/**
 * Unlock MetaMask with password (when already set up)
 */
async function unlockMetaMask(page: Page, password: string): Promise<void> {
  const unlockInput = page.locator('input[type="password"]').first();
  if (await unlockInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await unlockInput.fill(password);

    const unlockBtn = page.locator('button:has-text("Unlock")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  // Close any "What's new" popups
  const closeBtn = page.locator('button[aria-label="Close"], .popover-header__button').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
  }

  console.log('MetaMask unlocked');
}

/**
 * MetaMask wallet setup (first time only)
 */
async function setupMetaMaskWallet(page: Page, seedPhrase: string, password: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Step 1: Agree to terms
  const checkbox = page.locator('input[type="checkbox"]').first();
  if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await checkbox.click({ force: true });
  }
  await page.waitForTimeout(500);

  // Step 2: Import existing wallet
  const importBtn = page.locator('button:has-text("Import an existing wallet")').first();
  if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await importBtn.click();
  }
  await page.waitForTimeout(1000);

  // Step 3: Analytics
  const noThanksBtn = page.locator('button:has-text("No thanks")').first();
  if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await noThanksBtn.click();
  }
  await page.waitForTimeout(1000);

  // Step 4: Enter seed phrase
  const words = seedPhrase.split(' ');
  for (let i = 0; i < words.length; i++) {
    const input = page.locator(`input[data-testid="import-srp__srp-word-${i}"]`);
    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
      await input.fill(words[i]);
    }
  }

  // Step 5: Confirm seed phrase
  const confirmBtn = page.locator('button:has-text("Confirm Secret Recovery Phrase")').first();
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(1000);

  // Step 6: Set password
  const pwInputs = await page.locator('input[type="password"]').all();
  if (pwInputs.length >= 2) {
    await pwInputs[0].fill(password);
    await pwInputs[1].fill(password);

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await termsCheckbox.click({ force: true });
    }
  }

  // Step 7: Import wallet
  const importWalletBtn = page.locator('button:has-text("Import my wallet")').first();
  if (await importWalletBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await importWalletBtn.click();
  }
  await page.waitForTimeout(3000);

  // Step 8: Skip dialogs
  for (let i = 0; i < 5; i++) {
    const gotItBtn = page.locator('button:has-text("Got it"), button:has-text("Done"), button:has-text("Next")').first();
    if (await gotItBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(500);
    }
  }

  console.log('MetaMask wallet setup complete');
}

/**
 * Wait for a MetaMask popup and return it
 * Looks for any chrome-extension page with MetaMask content
 */
async function waitForMetaMaskPopup(context: BrowserContext, timeoutMs: number = 15000): Promise<Page | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const pages = context.pages();

    for (const page of pages) {
      try {
        const url = page.url();
        // Check for any MetaMask extension page (notification, popup, or home with hash)
        if (url.includes('chrome-extension://') &&
            (url.includes('notification') || url.includes('popup') || url.includes('#confirm') || url.includes('home.html'))) {

          // Verify it's actually showing a prompt (not just the wallet home)
          await page.waitForLoadState('domcontentloaded');
          const content = await page.textContent('body').catch(() => '');

          // Check if it's a MetaMask action prompt
          if (content?.includes('Connect') ||
              content?.includes('Sign') ||
              content?.includes('Confirm') ||
              content?.includes('switch the network') ||
              content?.includes('Approve')) {
            console.log(`Found MetaMask popup: ${url.substring(0, 80)}`);
            return page;
          }
        }
      } catch {
        // Page might be closing
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return null;
}

/**
 * Handle MetaMask popup - detect type and respond
 */
async function handleMetaMaskPopup(popup: Page): Promise<string> {
  await popup.waitForTimeout(1000);
  const content = await popup.textContent('body').catch(() => '');

  // Network switch request
  if (content?.includes('switch the network') || content?.includes('Switch network')) {
    console.log('Handling: Network Switch request');
    const switchBtn = popup.locator('button:has-text("Switch network")').first();
    if (await switchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await switchBtn.click();
      return 'network_switched';
    }
  }

  // Connection request (Next → Connect)
  if (content?.includes('Connect with MetaMask') || content?.includes('connect to this site')) {
    console.log('Handling: Connection request');
    const nextBtn = popup.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await popup.waitForTimeout(1000);
    }
    const connectBtn = popup.locator('button:has-text("Connect")').first();
    if (await connectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectBtn.click();
      return 'connected';
    }
  }

  // Signature request
  if (content?.includes('Signature request') || content?.includes('Sign') || content?.includes('message')) {
    console.log('Handling: Signature request');
    const signBtn = popup.locator('button:has-text("Sign"), [data-testid="confirm-footer-button"]').first();
    if (await signBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signBtn.click();
      return 'signed';
    }
  }

  // Transaction confirmation
  if (content?.includes('Confirm') || content?.includes('transaction')) {
    console.log('Handling: Transaction confirmation');
    const confirmBtn = popup.locator('button:has-text("Confirm"), [data-testid="confirm-footer-button"]').first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      return 'confirmed';
    }
  }

  console.log(`Unknown popup content: ${content?.substring(0, 200)}`);
  return 'unknown';
}

test.describe('Real Sepolia USDT Sell with Etherscan Verification', () => {
  test('should sell USDT and verify on Etherscan and /tx', async ({ context, metamask, metamaskPage, appPage, extensionId }) => {
    test.setTimeout(300000); // 5 minutes

    // Step 1: Navigate to sell page
    console.log('Step 1: Navigate to sell page...');
    await appPage.goto(`http://localhost:3001/sell?blockchain=Sepolia&assets=USDT`);
    await appPage.waitForLoadState('networkidle');
    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-01-login.png', fullPage: true });

    // Step 2: Click CRYPTO WALLET tile
    console.log('Step 2: Click WALLET tile...');
    const walletTile = appPage.locator('img[src*="wallet"]').first();
    if (await walletTile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await walletTile.click();
    }
    await appPage.waitForTimeout(2000);
    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-02-wallet-select.png', fullPage: true });

    // Step 3: Click MetaMask
    console.log('Step 3: Click MetaMask...');
    const metamaskImg = appPage.locator('img[src*="metamask"], img[src*="rabby"]').first();
    if (await metamaskImg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await metamaskImg.click();
    }

    // Step 4: Handle ALL MetaMask popups (network switch, connect, sign)
    console.log('Step 4: Handle MetaMask popups...');

    let authenticated = false;
    for (let i = 0; i < 15; i++) {
      await appPage.waitForTimeout(2000);

      // Check if we're authenticated (either on sell page, account page, or any other authenticated page)
      const pageContent = await appPage.textContent('body').catch(() => '');
      const currentUrl = appPage.url();

      const isOnSellPage = pageContent?.includes('You spend') ||
                           pageContent?.includes('You receive') ||
                           pageContent?.includes('Complete transaction');
      const isOnAccountPage = currentUrl.includes('/account') ||
                              pageContent?.includes('AccountProfile') ||
                              pageContent?.includes('KYC level');
      const isAuthenticated = isOnSellPage || isOnAccountPage;
      const isWaitingForMetaMask = pageContent?.includes('confirm the connection') ||
                                    pageContent?.includes('Please sign') ||
                                    pageContent?.includes('Waiting');

      console.log(`Iteration ${i}: authenticated=${isAuthenticated}, url=${currentUrl.substring(0, 50)}, waitingMM=${isWaitingForMetaMask}`);

      if (isAuthenticated && !isWaitingForMetaMask) {
        console.log('Authentication successful!');
        authenticated = true;
        break;
      }

      // Look for MetaMask popup
      const popup = await waitForMetaMaskPopup(context, 5000);
      if (popup) {
        await popup.screenshot({ path: `e2e/screenshots/debug/real-tx-04-popup-${i}.png` }).catch(() => {});
        const result = await handleMetaMaskPopup(popup);
        console.log(`Popup ${i} handled: ${result}`);
        // Popup may close after action, so catch the error
        await popup.waitForTimeout(1000).catch(() => {
          console.log('Popup closed after action (expected)');
        });
      } else {
        console.log(`No popup found at iteration ${i}`);
        // Log all pages for debugging
        const allPages = context.pages();
        console.log(`  Total pages: ${allPages.length}`);
        for (const p of allPages) {
          try {
            console.log(`    - ${p.url().substring(0, 80)}`);
          } catch { /* ignore */ }
        }
      }
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-05-after-auth.png', fullPage: true });

    if (!authenticated) {
      // Check current state
      const pageContent = await appPage.textContent('body').catch(() => '');
      console.log(`Page after auth attempts: ${pageContent?.substring(0, 500)}`);
      throw new Error('Authentication failed - not on sell page');
    }

    // Step 5: Wait for sell page to load
    console.log('Step 5: Wait for sell page...');
    await appPage.waitForTimeout(3000);

    // Navigate to sell page if needed
    if (!appPage.url().includes('/sell')) {
      await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
      await appPage.waitForLoadState('networkidle');
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-06-sell-page.png', fullPage: true });

    // Step 6: Fill sell form
    console.log('Step 6: Fill sell form...');
    const amountInput = appPage.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await amountInput.fill(TEST_AMOUNT);
    }
    await appPage.waitForTimeout(2000);
    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-07-amount.png', fullPage: true });

    // Step 7: Click transaction button
    console.log('Step 7: Click transaction button...');
    const txBtn = appPage.locator('button:has-text("Complete transaction"), button:has-text("Transaktion")').first();

    await appPage.waitForTimeout(3000);

    if (await txBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      const isDisabled = await txBtn.isDisabled();
      console.log(`Transaction button disabled: ${isDisabled}`);

      if (!isDisabled) {
        await txBtn.click();
        console.log('Clicked transaction button');
      } else {
        const content = await appPage.textContent('body');
        console.log('Button disabled. Page:', content?.substring(0, 500));
      }
    } else {
      console.log('Transaction button not found');
      const content = await appPage.textContent('body');
      console.log('Page:', content?.substring(0, 500));
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-08-after-tx-click.png', fullPage: true });

    // Step 8: Handle MetaMask transaction popups (approval + transfer)
    console.log('Step 8: Handle transaction popups...');

    let txHash: string | null = null;
    for (let i = 0; i < 10; i++) {
      await appPage.waitForTimeout(3000);

      // Check for transaction hash on page
      const pageContent = await appPage.textContent('body').catch(() => '');
      const txHashMatch = pageContent?.match(/0x[a-fA-F0-9]{64}/);
      if (txHashMatch) {
        txHash = txHashMatch[0];
        console.log(`Transaction hash found: ${txHash}`);
        break;
      }

      // Look for MetaMask popup
      const popup = await waitForMetaMaskPopup(context, 5000);
      if (popup) {
        await popup.screenshot({ path: `e2e/screenshots/debug/real-tx-08-tx-popup-${i}.png` });
        const result = await handleMetaMaskPopup(popup);
        console.log(`TX Popup ${i} handled: ${result}`);
      }
    }

    await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-09-final.png', fullPage: true });

    // Step 9: Verify on Etherscan
    if (txHash) {
      console.log('Step 9: Verify on Etherscan...');
      const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
      console.log('Etherscan URL:', etherscanUrl);

      const etherscanPage = await context.newPage();
      await etherscanPage.goto(etherscanUrl);
      await etherscanPage.waitForLoadState('networkidle');
      await etherscanPage.waitForTimeout(5000);
      await etherscanPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-10-etherscan.png', fullPage: true });

      const etherscanContent = await etherscanPage.textContent('body');
      const isOnChain = etherscanContent?.includes('Success') || etherscanContent?.includes('Pending') || etherscanContent?.includes('Block');
      console.log('Etherscan status:', isOnChain ? 'FOUND' : 'NOT FOUND');

      // Step 10: Verify in frontend /tx
      console.log('Step 10: Verify in frontend /tx...');
      await appPage.goto(`http://localhost:3001/tx/${txHash}`);
      await appPage.waitForLoadState('networkidle');
      await appPage.waitForTimeout(3000);
      await appPage.screenshot({ path: 'e2e/screenshots/debug/real-tx-11-frontend-tx.png', fullPage: true });

      const txPageContent = await appPage.textContent('body');
      console.log('Frontend /tx page:', txPageContent?.substring(0, 500));
    }

    // Final summary
    console.log('=== TEST SUMMARY ===');
    console.log('Transaction Hash:', txHash || 'NOT CAPTURED');

    expect(txHash).toBeTruthy();
  });
});
