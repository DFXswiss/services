/**
 * Complete E2E Test Suite: Sell USDT on Sepolia with Visual Regression
 *
 * Tests both wallets with full screenshot coverage of every process step.
 *
 * Prerequisites:
 * 1. .env.test with TEST_SEED and TEST_SEED_2
 * 2. Both wallets funded with Sepolia ETH and USDT
 * 3. Local frontend running on localhost:3001
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts e2e/synpress/sell-complete.spec.ts
 * Update baselines: npx playwright test --config=playwright.synpress.config.ts --update-snapshots
 */

import { test as base, chromium, BrowserContext, Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.test') });

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
  USER_DATA_DIR: path.join(process.cwd(), '.cache-synpress/user-data-test'),
  WALLET_PASSWORD: 'Tester@1234',
  FRONTEND_URL: 'http://localhost:3001',
  USDT_AMOUNT: '0.01',
  POPUP_TIMEOUT: 10000,
};

// Wallet configurations
const WALLETS = {
  wallet1: {
    seed: process.env.TEST_SEED || '',
    address: '0x482c8a499c7ac19925a0D2aA3980E1f3C5F19120',
    prefix: 'wallet1',
  },
  wallet2: {
    seed: process.env.TEST_SEED_2 || '',
    address: '0xE988cD504F3F2E5c93fF13Eb8A753D8Bc96f0640',
    prefix: 'wallet2',
  },
};

// ============================================================================
// VISUAL REGRESSION OPTIONS
// ============================================================================

const getDynamicMasks = (page: Page) => [
  page.locator('text=/0x[a-fA-F0-9]{4,}/').or(page.locator('[class*="address"]')).or(page.locator('[class*="hash"]')),
  page.locator('text=/\\d+\\.\\d+ EUR/').or(page.locator('text=/\\d+\\.\\d+ CHF/')).or(page.locator('text=/\\d+\\.\\d+ USDT/')),
  page.locator('text=/Transaction hash/').locator('..'),
];

const SCREENSHOT_OPTIONS = {
  fullPage: true,
  maxDiffPixelRatio: 0.05,
  threshold: 0.3,
};

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

  // Network switch - allow Sepolia, refuse unexpected switches to Mainnet
  if (content?.includes('Switch network') || content?.includes('Allow this site to switch') || content?.includes('Add network')) {
    // Always approve switching TO Sepolia or adding Sepolia
    if (content?.includes('Sepolia')) {
      const approveBtn = popup.locator('button:has-text("Switch network"), button:has-text("Approve"), button:has-text("Add network")').first();
      if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveBtn.click();
        // Popup may close after click - ignore timeout errors
        await popup.waitForTimeout(1000).catch(() => {});
        return 'network_switched_to_sepolia';
      }
    }
    // Refuse switching TO Mainnet (from Sepolia)
    if (content?.includes('Ethereum Mainnet') && !content?.includes('Sepolia')) {
      const cancelBtn = popup.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        return 'mainnet_switch_cancelled';
      }
    }
    // Approve other network switches
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
    const proceedLink = popup.locator('text=I want to proceed anyway').first();
    if (await proceedLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await proceedLink.click();
      await popup.waitForTimeout(1000);
    }
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

async function switchToSepolia(page: Page): Promise<void> {
  console.log('   Attempting to switch to Sepolia...');

  // Click network selector
  const networkBtn = page.locator('[data-testid="network-display"]').first();
  if (!(await networkBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    console.log('   Network button not found');
    return;
  }

  await networkBtn.click();
  await page.waitForTimeout(1500);

  // Check if Sepolia is already visible
  let sepoliaBtn = page.locator('text=Sepolia').first();
  if (await sepoliaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sepoliaBtn.click();
    await page.waitForTimeout(1000);
    console.log('   Switched to Sepolia');
    return;
  }

  // Enable test networks using coordinate click (no JS evaluate due to LavaMoat)
  console.log('   Sepolia not visible, enabling test networks...');

  const testNetworksLabel = page.locator('text=Show test networks');
  if (await testNetworksLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await testNetworksLabel.boundingBox();
    if (box) {
      // Click to the right of the label where the toggle should be (about 80px right)
      await page.mouse.click(box.x + box.width + 80, box.y + box.height / 2);
      console.log('   Clicked toggle area via coordinates');
      await page.waitForTimeout(2000);
    }
  }

  // Now try to click Sepolia
  sepoliaBtn = page.locator('text=Sepolia').first();
  if (await sepoliaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await sepoliaBtn.click();
    await page.waitForTimeout(1000);
    console.log('   Switched to Sepolia');
  } else {
    console.log('   Warning: Sepolia still not found in network list');
    await page.keyboard.press('Escape');
  }
}

async function importWallet(page: Page, seedPhrase: string, password: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check if already set up
  const accountBtn = await page.locator('[data-testid="account-menu-icon"]').isVisible({ timeout: 3000 }).catch(() => false);
  if (accountBtn) {
    console.log('   Wallet already imported');
    // Skip manual Sepolia switch - DFX will request network switch during login
    return;
  }

  // Terms checkbox
  const checkbox = page.locator('input[type="checkbox"]').first();
  if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await checkbox.click({ force: true });
  }
  await page.waitForTimeout(500);

  // Import existing wallet
  const importBtn = page.locator('button:has-text("Import an existing wallet")').first();
  if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await importBtn.click();
  }
  await page.waitForTimeout(1000);

  // No thanks (analytics)
  const noThanksBtn = page.locator('button:has-text("No thanks")').first();
  if (await noThanksBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await noThanksBtn.click();
  }
  await page.waitForTimeout(1000);

  // Enter seed phrase
  const words = seedPhrase.split(' ');
  for (let i = 0; i < words.length; i++) {
    const input = page.locator(`input[data-testid="import-srp__srp-word-${i}"]`);
    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
      await input.fill(words[i]);
    }
  }

  // Confirm seed
  const confirmBtn = page.locator('button:has-text("Confirm Secret Recovery Phrase")').first();
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(1000);

  // Set password
  const pwInputs = await page.locator('input[type="password"]').all();
  if (pwInputs.length >= 2) {
    await pwInputs[0].fill(password);
    await pwInputs[1].fill(password);

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await termsCheckbox.click({ force: true });
    }
  }

  // Import wallet
  const importWalletBtn = page.locator('button:has-text("Import my wallet")').first();
  if (await importWalletBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await importWalletBtn.click();
  }
  await page.waitForTimeout(3000);

  // Skip dialogs and popups
  for (let i = 0; i < 10; i++) {
    // Close any modal with X button (What's new, etc.)
    const closeButtons = [
      page.locator('button[aria-label="Close"]'),
      page.locator('[data-testid="popover-close"]'),
      page.locator('.mm-modal-header__button'),
      page.locator('header button').first(),
      page.locator('button:has(svg[name="Close"])'),
    ];

    let closed = false;
    for (const closeBtn of closeButtons) {
      if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        closed = true;
        break;
      }
    }
    if (closed) continue;

    // Try pressing Escape to close modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Skip intro dialogs
    const skipBtn = page.locator('button:has-text("Got it"), button:has-text("Done"), button:has-text("Next")').first();
    if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    break;
  }

  // Skip manual Sepolia switch - DFX will request network switch during login
  console.log('   Wallet setup complete (network will be switched by DFX)');
}

async function setupWalletAndLogin(
  context: BrowserContext,
  seedPhrase: string,
  walletPrefix: string,
): Promise<Page> {
  console.log(`\n=== Setting up ${walletPrefix} ===`);

  // Wait for MetaMask to load
  await new Promise((r) => setTimeout(r, 5000));

  // Find or create MetaMask page
  let metamaskPage = context.pages().find((p) => p.url().includes('chrome-extension://'));
  if (!metamaskPage) {
    const bgPages = context.backgroundPages();
    if (bgPages.length > 0) {
      const extensionId = bgPages[0].url().match(/chrome-extension:\/\/([a-z0-9]+)/)?.[1];
      if (extensionId) {
        metamaskPage = await context.newPage();
        await metamaskPage.goto(`chrome-extension://${extensionId}/home.html`);
      }
    }
  }

  if (!metamaskPage) {
    throw new Error('Could not find MetaMask page');
  }

  await metamaskPage.waitForLoadState('networkidle');
  console.log('   MetaMask loaded');

  // Import wallet
  await importWallet(metamaskPage, seedPhrase, CONFIG.WALLET_PASSWORD);
  console.log('   Wallet imported');

  // Navigate to DFX and login
  const appPage = await context.newPage();
  await appPage.goto(`${CONFIG.FRONTEND_URL}/sell?blockchain=Sepolia`);
  await appPage.waitForLoadState('networkidle');

  // Click WALLET tile
  const walletTile = appPage.locator('img[src*="wallet"]').first();
  if (await walletTile.isVisible({ timeout: 5000 }).catch(() => false)) {
    await walletTile.click();
  }
  await appPage.waitForTimeout(2000);

  // Click MetaMask
  const metamaskImg = appPage.locator('img[src*="metamask"], img[src*="rabby"]').first();
  if (await metamaskImg.isVisible({ timeout: 3000 }).catch(() => false)) {
    await metamaskImg.click();
  }

  // Handle MetaMask popups for login
  for (let i = 0; i < 10; i++) {
    await appPage.waitForTimeout(2000);
    const content = await appPage.textContent('body').catch(() => '');
    if (content?.includes('You spend') || content?.includes('Sell')) break;

    const popup = await waitForPopup(context, 3000);
    if (popup) await handleMetaMaskPopup(popup);
  }

  console.log('   Login complete');
  return appPage;
}

// ============================================================================
// SELL FLOW FUNCTION
// ============================================================================

async function runSellFlow(
  context: BrowserContext,
  appPage: Page,
  walletPrefix: string,
  walletAddress: string,
): Promise<void> {
  console.log(`\n=== Running Sell Flow for ${walletPrefix} ===`);

  // Navigate to USDT sell page
  await appPage.goto(`${CONFIG.FRONTEND_URL}/sell?blockchain=Sepolia&assets=USDT`);
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(2000);

  // Check if we need to login again (session might have expired)
  const pageContent = await appPage.textContent('body').catch(() => '');
  if (pageContent?.includes('Login to DFX') || (pageContent?.includes('WALLET') && pageContent?.includes('E-MAIL'))) {
    console.log('   Session expired, logging in again...');

    // Click WALLET tile (look for text or image)
    const walletTile = appPage.locator('text=WALLET').first();
    if (await walletTile.isVisible({ timeout: 5000 }).catch(() => false)) {
      await walletTile.click();
      await appPage.waitForTimeout(2000);
    }

    // Click MetaMask option
    const metamaskOption = appPage.locator('text=MetaMask, img[alt*="MetaMask"], img[src*="metamask"]').first();
    if (await metamaskOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await metamaskOption.click();
      await appPage.waitForTimeout(1000);
    }

    // Handle MetaMask popups for login
    let loginComplete = false;
    for (let i = 0; i < 15; i++) {
      const popup = await waitForPopup(context, 3000);
      if (popup) {
        const result = await handleMetaMaskPopup(popup);
        console.log(`   Popup ${i}: ${result}`);
      }

      await appPage.waitForTimeout(1000);
      const content = await appPage.textContent('body').catch(() => '');
      if (content?.includes('You spend') || content?.includes('Sell') || content?.includes('sell')) {
        loginComplete = true;
        break;
      }
    }

    if (!loginComplete) {
      console.log('   Warning: Login may not have completed');
    }

    // Navigate again to sell page with USDT
    await appPage.goto(`${CONFIG.FRONTEND_URL}/sell?blockchain=Sepolia&assets=USDT`);
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(3000);
  }

  // Screenshot 01: Sell page
  await expect(appPage).toHaveScreenshot(`${walletPrefix}-01-sell-page.png`, {
    ...SCREENSHOT_OPTIONS,
    mask: getDynamicMasks(appPage),
  });
  console.log('   01: Sell page captured');

  // Step 2: Enter amount
  const amountInput = appPage.locator('input[type="number"], input[inputmode="decimal"]').first();
  await amountInput.waitFor({ state: 'visible', timeout: 10000 });
  await amountInput.fill(CONFIG.USDT_AMOUNT);
  await appPage.waitForTimeout(3000);

  // Screenshot 02: Amount entered
  await expect(appPage).toHaveScreenshot(`${walletPrefix}-02-amount-entered.png`, {
    ...SCREENSHOT_OPTIONS,
    mask: getDynamicMasks(appPage),
  });
  console.log('   02: Amount entered captured');

  // Step 3: Before transaction
  const txBtn = appPage.locator('button:has-text("Complete transaction"), button:has-text("Transaktion")').first();
  await txBtn.waitFor({ state: 'visible', timeout: 10000 });
  expect(await txBtn.isDisabled()).toBe(false);

  // Screenshot 03: Before transaction
  await expect(appPage).toHaveScreenshot(`${walletPrefix}-03-before-transaction.png`, {
    ...SCREENSHOT_OPTIONS,
    mask: getDynamicMasks(appPage),
  });
  console.log('   03: Before transaction captured');

  // Capture TX hash
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
      txHash = await appPage.evaluate(() => (window as any).__lastTxHash);
      if (!txHash) {
        const pageHtml = await appPage.content();
        const hashMatch = pageHtml.match(/0x[a-fA-F0-9]{64}/);
        if (hashMatch) txHash = hashMatch[0];
      }
      break;
    }

    const popup = await waitForPopup(context, 3000);
    if (popup) await handleMetaMaskPopup(popup);
  }

  // Screenshot 04: Transaction success
  await expect(appPage).toHaveScreenshot(`${walletPrefix}-04-transaction-success.png`, {
    ...SCREENSHOT_OPTIONS,
    mask: getDynamicMasks(appPage),
  });
  console.log('   04: Transaction success captured');

  const successText = await appPage.textContent('body').catch(() => '');
  expect(successText).toContain('Nice! You are all set');

  // Step 8: Etherscan verification
  if (txHash) {
    console.log(`   TX Hash: ${txHash}`);
    const etherscanPage = await context.newPage();
    await etherscanPage.goto(`https://sepolia.etherscan.io/tx/${txHash}`);
    await etherscanPage.waitForLoadState('networkidle');
    await etherscanPage.waitForTimeout(3000);

    // Screenshot 05: Etherscan TX page
    await expect(etherscanPage).toHaveScreenshot(`${walletPrefix}-05-etherscan-verification.png`, {
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
    console.log('   05: Etherscan verification captured');

    await etherscanPage.close();
  } else {
    console.log('   No TX hash found - using wallet address fallback');
    const etherscanPage = await context.newPage();
    await etherscanPage.goto(`https://sepolia.etherscan.io/address/${walletAddress}`);
    await etherscanPage.waitForLoadState('networkidle');
    await etherscanPage.waitForTimeout(3000);

    await expect(etherscanPage).toHaveScreenshot(`${walletPrefix}-05-etherscan-verification.png`, {
      ...SCREENSHOT_OPTIONS,
      mask: [
        etherscanPage.locator('a[href*="/tx/0x"]'),
        etherscanPage.locator('a[href*="/address/0x"]'),
        etherscanPage.locator('.showAge'),
      ],
    });

    await etherscanPage.close();
  }

  console.log(`=== ${walletPrefix} Sell Flow Complete ===\n`);
}

// ============================================================================
// TEST SUITE
// ============================================================================

base.describe('Sell Flow Visual Regression', () => {
  base.describe.configure({ mode: 'serial' });

  // Test with Wallet 1
  base('wallet1-sell-usdt-flow', async () => {
    base.setTimeout(300000);

    if (!WALLETS.wallet1.seed) {
      throw new Error('TEST_SEED not set in .env.test');
    }

    // Clean start - remove old user data
    if (fs.existsSync(CONFIG.USER_DATA_DIR)) {
      fs.rmSync(CONFIG.USER_DATA_DIR, { recursive: true });
    }
    fs.mkdirSync(CONFIG.USER_DATA_DIR, { recursive: true });

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

    try {
      const appPage = await setupWalletAndLogin(context, WALLETS.wallet1.seed, 'wallet1');
      await clearPendingPopups(context);
      await runSellFlow(context, appPage, WALLETS.wallet1.prefix, WALLETS.wallet1.address);
    } finally {
      await context.close();
    }
  });

  // Test with Wallet 2
  base('wallet2-sell-usdt-flow', async () => {
    base.setTimeout(300000);

    if (!WALLETS.wallet2.seed) {
      throw new Error('TEST_SEED_2 not set in .env.test');
    }

    // Clean start - remove old user data
    if (fs.existsSync(CONFIG.USER_DATA_DIR)) {
      fs.rmSync(CONFIG.USER_DATA_DIR, { recursive: true });
    }
    fs.mkdirSync(CONFIG.USER_DATA_DIR, { recursive: true });

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

    try {
      const appPage = await setupWalletAndLogin(context, WALLETS.wallet2.seed, 'wallet2');
      await clearPendingPopups(context);
      await runSellFlow(context, appPage, WALLETS.wallet2.prefix, WALLETS.wallet2.address);
    } finally {
      await context.close();
    }
  });
});
