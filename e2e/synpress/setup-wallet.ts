/**
 * One-Time Wallet Setup Script
 *
 * This script sets up MetaMask and connects to DFX ONCE.
 * The state is saved in a persistent user data directory.
 * All subsequent tests can reuse this state - they only need to unlock MetaMask.
 *
 * Run: npx ts-node e2e/synpress/setup-wallet.ts
 *
 * After running this script, the following is ready:
 * - MetaMask wallet imported with TEST_SEED
 * - Connected to DFX frontend
 * - Authenticated (signed login message)
 * - Network set to Sepolia
 *
 * Tests can then start from this state and only need to:
 * 1. Unlock MetaMask with password
 * 2. Navigate to the page they want to test
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Paths
const CHROME_126_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-13.13.1');
const USER_DATA_DIR = path.join(process.cwd(), '.cache-synpress/user-data-ready');

// Credentials
const WALLET_PASSWORD = 'Tester@1234';
const TEST_SEED_PHRASE = process.env.TEST_SEED || '';

async function setupWallet() {
  console.log('=== MetaMask + DFX Setup Script ===\n');

  if (!TEST_SEED_PHRASE) {
    console.error('ERROR: TEST_SEED not set in .env');
    process.exit(1);
  }

  // Check if already set up
  const setupMarker = path.join(USER_DATA_DIR, '.setup-complete');
  if (fs.existsSync(setupMarker)) {
    console.log('Setup already complete! User data directory exists.');
    console.log(`Location: ${USER_DATA_DIR}`);
    console.log('\nTo force re-setup, delete the directory:');
    console.log(`rm -rf "${USER_DATA_DIR}"`);
    return;
  }

  // Create fresh user data directory
  if (fs.existsSync(USER_DATA_DIR)) {
    fs.rmSync(USER_DATA_DIR, { recursive: true });
  }
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log('Starting browser with MetaMask...\n');

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

  try {
    // Wait for MetaMask to load
    console.log('1. Waiting for MetaMask to initialize...');
    await new Promise((r) => setTimeout(r, 5000));

    // Find MetaMask page
    let metamaskPage = context.pages().find((p) => p.url().includes('chrome-extension://'));
    if (!metamaskPage) {
      // Get extension ID and navigate
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
    console.log('   MetaMask loaded\n');

    // Step 2: Import wallet
    console.log('2. Importing wallet...');
    await importWallet(metamaskPage, TEST_SEED_PHRASE, WALLET_PASSWORD);
    console.log('   Wallet imported\n');

    // Step 3: Navigate to DFX and login
    console.log('3. Connecting to DFX...');
    const appPage = await context.newPage();
    await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
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
    console.log('   Clicked MetaMask login\n');

    // Step 4: Handle MetaMask popups
    console.log('4. Handling MetaMask popups...');
    for (let i = 0; i < 10; i++) {
      await appPage.waitForTimeout(2000);

      // Check if authenticated
      const url = appPage.url();
      if (url.includes('/account') || url.includes('/sell')) {
        const content = await appPage.textContent('body').catch(() => '');
        if (content?.includes('AccountProfile') || content?.includes('You spend')) {
          console.log('   Authentication successful!\n');
          break;
        }
      }

      // Find and handle popup
      const popup = await findMetaMaskPopup(context);
      if (popup) {
        await handlePopup(popup);
      }
    }

    // Step 5: Verify we're logged in
    console.log('5. Verifying login...');
    await appPage.goto('http://localhost:3001/account');
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(2000);

    const accountContent = await appPage.textContent('body').catch(() => '');
    if (!accountContent?.includes('AccountProfile') && !accountContent?.includes('KYC')) {
      throw new Error('Login verification failed - not on account page');
    }
    console.log('   Logged in successfully!\n');

    // Step 6: Navigate to sell page to verify it works
    console.log('6. Verifying sell page access...');
    await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(2000);

    const sellContent = await appPage.textContent('body').catch(() => '');
    if (!sellContent?.includes('Sell') && !sellContent?.includes('You spend')) {
      throw new Error('Sell page verification failed');
    }
    console.log('   Sell page accessible!\n');

    // Mark setup as complete
    fs.writeFileSync(setupMarker, new Date().toISOString());

    console.log('=== SETUP COMPLETE ===');
    console.log(`User data saved to: ${USER_DATA_DIR}`);
    console.log('\nTests can now use this pre-configured state!');
    console.log('They only need to unlock MetaMask with password.\n');

  } finally {
    await context.close();
  }
}

async function importWallet(page: any, seedPhrase: string, password: string) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check if already set up
  const accountBtn = await page.locator('[data-testid="account-menu-icon"]').isVisible({ timeout: 3000 }).catch(() => false);
  if (accountBtn) {
    console.log('   Wallet already imported');
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

  // Skip dialogs
  for (let i = 0; i < 5; i++) {
    const skipBtn = page.locator('button:has-text("Got it"), button:has-text("Done"), button:has-text("Next")').first();
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
  }
}

async function findMetaMaskPopup(context: any) {
  for (const page of context.pages()) {
    const url = page.url();
    if (url.includes('chrome-extension://') && url.includes('notification')) {
      await page.waitForLoadState('domcontentloaded');
      return page;
    }
  }
  return null;
}

async function handlePopup(popup: any) {
  const content = await popup.textContent('body').catch(() => '');

  if (content?.includes('switch the network')) {
    console.log('   → Switching network...');
    const btn = popup.locator('button:has-text("Switch network")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
    }
  } else if (content?.includes('Connect')) {
    console.log('   → Connecting...');
    const nextBtn = popup.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await popup.waitForTimeout(1000);
    }
    const connectBtn = popup.locator('button:has-text("Connect")').first();
    if (await connectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectBtn.click();
    }
  } else if (content?.includes('Sign')) {
    console.log('   → Signing...');
    const signBtn = popup.locator('button:has-text("Sign"), [data-testid="confirm-footer-button"]').first();
    if (await signBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signBtn.click();
    }
  }

  await popup.waitForTimeout(1000).catch(() => {});
}

// Run setup
setupWallet().catch(console.error);
