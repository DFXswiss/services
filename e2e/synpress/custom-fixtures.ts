/**
 * Custom Playwright Fixtures with Chrome 126 + MetaMask Extension Loading
 *
 * This approach bypasses Synpress's built-in cache system which has
 * compatibility issues with Chrome 127+ (Manifest V2 deprecation).
 *
 * Uses Chrome 126 (last version with MV2 support) and manually loads
 * MetaMask 11.9.1 extension via Playwright's launchPersistentContext.
 *
 * The Synpress MetaMask class is still used for wallet interactions,
 * giving us the best of both worlds: reliable extension loading +
 * proven wallet automation.
 */

import { test as base, chromium, BrowserContext, Page } from '@playwright/test';
import { MetaMask } from '@synthetixio/synpress/playwright';
import path from 'path';
import * as dotenv from 'dotenv';
import { HDNodeWallet } from 'ethers';

// Load environment variables from .env.test
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Chrome 126 path (installed via @puppeteer/browsers)
const CHROME_126_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);

// MetaMask extension path (downloaded separately)
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-11.9.1');

// Test wallet credentials from environment
const WALLET_PASSWORD = 'Tester@1234';
const TEST_SEED_PHRASE = process.env.TEST_SEED || 'test test test test test test test test test test test junk';

// Derivation paths
export const EVM_DERIVATION_PATH_WALLET1 = ''; // Default (no derivation, direct from seed)
export const EVM_DERIVATION_PATH_WALLET2 = "m/44'/60'/0'/0/0"; // BIP-44 standard

// Calculate wallet addresses dynamically from seed
function getWalletAddresses(seedPhrase: string): { WALLET_1: string; WALLET_2: string } {
  const hdNode = HDNodeWallet.fromPhrase(seedPhrase);
  const wallet2 = hdNode.derivePath(EVM_DERIVATION_PATH_WALLET2.replace('m/', ''));
  return {
    WALLET_1: hdNode.address,
    WALLET_2: wallet2.address,
  };
}

// Test wallet addresses (dynamically calculated)
const walletAddresses = getWalletAddresses(TEST_SEED_PHRASE);
export const TEST_WALLET_1_ADDRESS = walletAddresses.WALLET_1; // Has ETH + USDT
export const TEST_WALLET_2_ADDRESS = walletAddresses.WALLET_2; // Has USDT only (gasless)

// Legacy export for compatibility
export const TEST_WALLET_ADDRESS = TEST_WALLET_1_ADDRESS;

// Chain configurations for multi-chain testing
export const SUPPORTED_CHAINS = [
  { name: 'Ethereum', chainId: 1, chainHex: '0x1' },
  { name: 'Optimism', chainId: 10, chainHex: '0xa' },
  { name: 'Polygon', chainId: 137, chainHex: '0x89' },
  { name: 'Arbitrum', chainId: 42161, chainHex: '0xa4b1' },
  { name: 'Base', chainId: 8453, chainHex: '0x2105' },
  { name: 'BinanceSmartChain', chainId: 56, chainHex: '0x38' },
  { name: 'Gnosis', chainId: 100, chainHex: '0x64' },
  { name: 'Sepolia', chainId: 11155111, chainHex: '0xaa36a7' },
];

// Sepolia network configuration for MetaMask
export const SEPOLIA_NETWORK = {
  networkName: 'Sepolia',
  rpcUrl: 'https://sepolia.gateway.tenderly.co',
  chainId: 11155111,
  symbol: 'ETH',
  blockExplorer: 'https://sepolia.etherscan.io',
};

// Sepolia USDT contract address
export const SEPOLIA_USDT_CONTRACT = '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06';

interface CustomFixtures {
  context: BrowserContext;
  extensionId: string;
  metamask: MetaMask;
  metamaskPage: Page;
}

export const test = base.extend<CustomFixtures>({
  // Override the default context with a persistent context that loads MetaMask
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      executablePath: CHROME_126_PATH,
      headless: false,
      args: [
        `--disable-extensions-except=${METAMASK_PATH}`,
        `--load-extension=${METAMASK_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-sync',
        // Force English language for MetaMask (Synpress expects English UI)
        '--lang=en-US',
        '--accept-lang=en-US,en',
      ],
      locale: 'en-US',
      viewport: { width: 1280, height: 720 },
    });

    await use(context);
    await context.close();
  },

  // Get the extension ID - try multiple approaches
  extensionId: async ({ context }, use) => {
    // Wait for MetaMask to initialize
    await new Promise((r) => setTimeout(r, 3000));

    let extensionId = '';

    // Try background pages first
    const bgPages = context.backgroundPages();
    if (bgPages.length > 0) {
      extensionId = bgPages[0].url().split('/')[2];
    }

    // If no background page, check regular pages for extension
    if (!extensionId) {
      const allPages = context.pages();
      for (const p of allPages) {
        if (p.url().includes('chrome-extension://')) {
          extensionId = p.url().split('/')[2];
          break;
        }
      }
    }

    await use(extensionId);
  },

  // Get or create the MetaMask page
  metamaskPage: async ({ context, extensionId }, use) => {
    // Try to find existing MetaMask page
    let metamaskPage = context.pages().find((p) => p.url().includes('chrome-extension://'));

    if (!metamaskPage) {
      // Create new page and navigate to MetaMask home
      metamaskPage = await context.newPage();
      await metamaskPage.goto(`chrome-extension://${extensionId}/home.html`);
    }

    // Wait for MetaMask to load
    await metamaskPage.waitForLoadState('domcontentloaded');

    await use(metamaskPage);
  },

  // Create MetaMask instance with wallet already imported
  metamask: async ({ context, extensionId, metamaskPage }, use) => {
    // Manual wallet setup (more robust than Synpress's importWallet)
    await setupMetaMaskWallet(metamaskPage, TEST_SEED_PHRASE, WALLET_PASSWORD);

    // Now create MetaMask instance for further interactions
    const metamask = new MetaMask(context, metamaskPage, WALLET_PASSWORD, extensionId);

    await use(metamask);
  },
});

export const { expect } = test;

/**
 * Manual MetaMask wallet setup - bilingual (English + German)
 * Works with MetaMask 11.x onboarding flow
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

  // Step 2: Click "Import an existing wallet" (EN + DE)
  const importButtons = [
    'button:has-text("Import an existing wallet")',
    'button:has-text("Existierende Wallet importieren")',
  ];
  for (const selector of importButtons) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(1000);

  // Step 3: Handle analytics (EN + DE)
  const analyticsButtons = [
    'button:has-text("No thanks")',
    'button:has-text("Nein danke")',
    'button:has-text("I agree")',
    'button:has-text("Ich stimme zu")',
  ];
  for (const selector of analyticsButtons) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      break;
    }
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

  // Step 5: Click confirm (EN + DE)
  const confirmButtons = [
    'button:has-text("Confirm Secret Recovery Phrase")',
    'button:has-text("Geheime Wiederherstellungsphrase bestätigen")',
  ];
  for (const selector of confirmButtons) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(1000);

  // Step 6: Password
  const pwInputs = await page.locator('input[type="password"]').all();
  if (pwInputs.length >= 2) {
    await pwInputs[0].fill(password);
    await pwInputs[1].fill(password);

    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await termsCheckbox.click();
    }

    // Import button (EN + DE)
    const importBtns = [
      'button:has-text("Import my wallet")',
      'button:has-text("Meine Wallet importieren")',
    ];
    for (const selector of importBtns) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        break;
      }
    }
  }
  await page.waitForTimeout(2000);

  // Step 7: Handle completion screens (EN + DE)
  const completionButtons = [
    'button:has-text("Got it")',
    'button:has-text("Verstanden")',
    'button:has-text("Next")',
    'button:has-text("Weiter")',
    'button:has-text("Done")',
    'button:has-text("Fertig")',
  ];

  for (let round = 0; round < 5; round++) {
    await page.waitForTimeout(1000);
    for (const selector of completionButtons) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
      }
    }
  }

  // Close any "What's new" popups
  const closeBtn = page.locator('button[aria-label="Close"], .popover-header__button').first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
  }

  await page.waitForTimeout(1000);

  // Enable test networks to access Sepolia
  await enableTestNetworks(page);
}

/**
 * Enable test networks in MetaMask settings
 */
async function enableTestNetworks(page: Page): Promise<void> {
  try {
    // Click network selector
    const networkSelector = page.locator('[data-testid="network-display"], text=Ethereum Mainnet').first();
    if (await networkSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await networkSelector.click();
      await page.waitForTimeout(1000);

      // Find and enable "Show test networks" toggle
      // The toggle in MetaMask 11.x is a div with role="checkbox" or a custom toggle-button
      const toggleSelectors = [
        'div[data-testid="network-display-testnet-toggle"]',
        '[class*="toggle"]',
        'text=Show test networks >> .. >> [role="checkbox"]',
        'text=Show test networks >> .. >> button',
      ];

      for (const selector of toggleSelectors) {
        try {
          const toggle = page.locator(selector).first();
          if (await toggle.isVisible({ timeout: 1000 }).catch(() => false)) {
            await toggle.click();
            await page.waitForTimeout(1000);
            console.log('Clicked test networks toggle');
            break;
          }
        } catch {
          continue;
        }
      }

      // Also try clicking directly on the "Show test networks" text area
      const showTestText = page.locator('text=Show test networks');
      if (await showTestText.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Click on the parent container which should toggle
        await showTestText.click();
        await page.waitForTimeout(1000);
        console.log('Clicked Show test networks text');
      }

      // Wait and check if Sepolia is now visible
      await page.waitForTimeout(1000);

      // Click on Sepolia if visible
      const sepoliaOption = page.locator('text=Sepolia').first();
      if (await sepoliaOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sepoliaOption.click();
        await page.waitForTimeout(1000);
        console.log('Switched to Sepolia network');
      } else {
        // Close network selector if Sepolia not found
        const closeX = page.locator('[aria-label="Close"], button:has-text("×")').first();
        if (await closeX.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeX.click();
        }
        console.log('Sepolia not found in network list');
      }
    }
  } catch (e) {
    console.log('Note: Could not enable test networks:', e);
  }
}

/**
 * Helper to connect wallet to the DFX app
 * DFX uses a custom login flow:
 * 1. Click on "CRYPTO WALLET" card on login page
 * 2. MetaMask popup appears for connection approval
 * 3. MetaMask popup appears for signature (authentication)
 * 4. User is authenticated and redirected
 */
export async function connectWallet(page: Page, metamask: MetaMask): Promise<void> {
  // Check if we're on the login page
  const loginPageVisible = await page.locator('text=Login to DFX').isVisible({ timeout: 3000 }).catch(() => false);

  if (loginPageVisible) {
    console.log('On login page, clicking CRYPTO WALLET card...');

    // Click the CRYPTO WALLET card
    const walletCard = page.locator('text=WALLET').first();
    if (await walletCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await walletCard.click();
      await page.waitForTimeout(2000);

      // MetaMask should pop up for connection
      try {
        console.log('Connecting to dApp via MetaMask...');
        await metamask.connectToDapp();
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('MetaMask connectToDapp note:', e);
      }

      // MetaMask should pop up for signature (DFX auth message)
      try {
        console.log('Signing authentication message...');
        await metamask.confirmSignature();
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('MetaMask signature note:', e);
      }
    }
  } else {
    // Already logged in, try traditional connect button
    const connectButton = page
      .locator('button:has-text("Wallet"), button:has-text("Connect"), button:has-text("Verbinden")')
      .first();

    if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectButton.click();
      await metamask.connectToDapp();
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * Helper to initiate a sell transaction
 */
export async function initiateSellTransaction(page: Page, amount: string): Promise<void> {
  // Find amount input
  const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
  if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await amountInput.fill(amount);
    await page.waitForTimeout(1000);
  }

  // Click transaction button
  const txButton = page
    .locator('button:has-text("Transaktion"), button:has-text("Sell"), button:has-text("Verkaufen")')
    .first();

  if (await txButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await txButton.click();
  }
}
