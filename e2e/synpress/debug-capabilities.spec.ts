/**
 * Debug Test: Check wallet_getCapabilities response from MetaMask
 *
 * This test launches MetaMask, connects to the app, and calls wallet_getCapabilities
 * to see what the wallet actually returns for paymaster support.
 *
 * Run: npx playwright test --config=playwright.synpress.config.ts debug-capabilities.spec.ts
 */

import { test, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const TEST_SEED_2 = process.env.TEST_SEED_2 || '';
const WALLET_PASSWORD = 'Tester@1234';

// Paths - same as gasless-sell-real.spec.ts
const CHROME_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-13.13.1');
const USER_DATA_DIR = path.join(process.cwd(), '.cache-synpress/debug-capabilities');

const BASE_URL = 'http://localhost:3001';

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let appPage: Page;
let metamaskPage: Page;
let extensionId: string;

test.beforeAll(async () => {
  if (!TEST_SEED_2) {
    throw new Error('TEST_SEED_2 not set in .env.test');
  }

  console.log('\n=== DEBUG: wallet_getCapabilities ===\n');

  // Launch browser with MetaMask
  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      `--disable-extensions-except=${METAMASK_PATH}`,
      `--load-extension=${METAMASK_PATH}`,
      '--no-first-run',
      '--disable-popup-blocking',
      '--lang=en-US',
    ],
    locale: 'en-US',
    viewport: { width: 1400, height: 900 },
  });

  // Wait for MetaMask
  await new Promise((r) => setTimeout(r, 3000));

  // Get extension ID
  const bgPages = context.backgroundPages();
  if (bgPages.length > 0) {
    extensionId = bgPages[0].url().match(/chrome-extension:\/\/([a-z0-9]+)/)?.[1] || '';
  }

  if (!extensionId) {
    const workers = context.serviceWorkers();
    if (workers.length > 0) {
      extensionId = workers[0].url().match(/chrome-extension:\/\/([a-z0-9]+)/)?.[1] || '';
    }
  }

  console.log(`Extension ID: ${extensionId}`);
});

test.afterAll(async () => {
  if (context) {
    await context.close();
  }
});

test('1. Setup MetaMask with Wallet 2', async () => {
  metamaskPage = await context.newPage();
  await metamaskPage.goto(`chrome-extension://${extensionId}/home.html`);
  await metamaskPage.waitForLoadState('networkidle');

  // Check if already set up
  const isSetup = await metamaskPage.locator('[data-testid="account-menu-icon"]').isVisible({ timeout: 3000 }).catch(() => false);

  if (isSetup) {
    console.log('MetaMask already set up, unlocking...');
    const passwordInput = metamaskPage.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passwordInput.fill(WALLET_PASSWORD);
      await metamaskPage.locator('button:has-text("Unlock")').click();
      await metamaskPage.waitForTimeout(2000);
    }
  } else {
    console.log('Importing Wallet 2...');
    await importWallet(metamaskPage, TEST_SEED_2, WALLET_PASSWORD);
  }

  console.log('MetaMask ready');
});

test('2. Connect to DFX app', async () => {
  appPage = await context.newPage();

  // Clear storage
  await appPage.goto(BASE_URL);
  await appPage.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to sell page
  await appPage.goto(`${BASE_URL}/sell?blockchain=Sepolia&assets=USDT`);
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(3000);

  // Click wallet login
  const walletTile = appPage.locator('div:has-text("WALLET"):has-text("CRYPTO")').first();
  if (await walletTile.isVisible({ timeout: 5000 }).catch(() => false)) {
    await walletTile.click();
    await appPage.waitForTimeout(2000);
  }

  // Click MetaMask
  const mmOption = appPage.locator('img[src*="metamask"]').first();
  if (await mmOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mmOption.click();
    await appPage.waitForTimeout(2000);
  }

  // Handle MetaMask connection via notification.html
  console.log('Opening MetaMask notification page...');
  const mmNotificationPage = await context.newPage();
  await mmNotificationPage.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmNotificationPage.waitForLoadState('domcontentloaded');
  await mmNotificationPage.waitForTimeout(2000);

  // Handle multi-step connection
  for (let step = 0; step < 5; step++) {
    await mmNotificationPage.waitForTimeout(1000);

    const connectBtn = mmNotificationPage.locator('button:has-text("Connect")').first();
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click({ force: true });
      console.log('   Clicked Connect');
      continue;
    }

    const confirmBtn = mmNotificationPage.locator('button:has-text("Confirm")').first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click({ force: true });
      console.log('   Clicked Confirm');
      continue;
    }

    const signBtn = mmNotificationPage.locator('button:has-text("Sign")').first();
    if (await signBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signBtn.click({ force: true });
      console.log('   Clicked Sign');
      continue;
    }

    break;
  }

  await mmNotificationPage.close().catch(() => {});
  await appPage.waitForTimeout(3000);
  await appPage.bringToFront();

  // Check for another sign request
  const mmNotificationPage2 = await context.newPage();
  await mmNotificationPage2.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmNotificationPage2.waitForLoadState('domcontentloaded');
  await mmNotificationPage2.waitForTimeout(1000);

  const signBtn2 = mmNotificationPage2.locator('button:has-text("Sign")').first();
  if (await signBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signBtn2.click({ force: true });
    console.log('   Clicked Sign (login message)');
  }
  await mmNotificationPage2.close().catch(() => {});

  await appPage.bringToFront();
  await appPage.waitForTimeout(2000);

  console.log('Connected to DFX app');
});

test('3. Call wallet_getCapabilities and log result', async () => {
  console.log('\n=== Calling wallet_getCapabilities ===\n');

  // Navigate to a simple page and inject script to call MetaMask
  await appPage.goto(`${BASE_URL}/sell?blockchain=Sepolia&assets=USDT`);
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(3000);

  // Check if ethereum provider exists
  const hasProvider = await appPage.evaluate(() => !!(window as any).ethereum);
  console.log('Has ethereum provider:', hasProvider);

  if (!hasProvider) {
    console.log('ERROR: No ethereum provider found on page');
    return;
  }

  // First check eth_accounts (non-blocking)
  const accounts = await appPage.evaluate(async () => {
    try {
      return await (window as any).ethereum.request({ method: 'eth_accounts' });
    } catch (e) {
      return [];
    }
  });

  console.log('Connected accounts:', accounts);

  if (!accounts || accounts.length === 0) {
    console.log('No accounts connected - need to connect first');

    // Trigger connection request (will open popup)
    appPage.evaluate(() => {
      (window as any).ethereum.request({ method: 'eth_requestAccounts' }).catch(() => {});
    });

    await appPage.waitForTimeout(2000);

    // Handle MetaMask popup
    const mmNotificationPage3 = await context.newPage();
    await mmNotificationPage3.goto(`chrome-extension://${extensionId}/notification.html`);
    await mmNotificationPage3.waitForLoadState('domcontentloaded');
    await mmNotificationPage3.waitForTimeout(2000);

    console.log('Notification page opened, handling connection...');
    const notifContent = await mmNotificationPage3.textContent('body').catch(() => '');
    console.log('Notification content:', notifContent?.substring(0, 100));

    // Handle all steps
    for (let step = 0; step < 5; step++) {
      await mmNotificationPage3.waitForTimeout(1000);

      const connectBtn = mmNotificationPage3.locator('button:has-text("Connect")').first();
      if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await connectBtn.click({ force: true });
        console.log('   Clicked Connect');
        continue;
      }

      const confirmBtn = mmNotificationPage3.locator('button:has-text("Confirm")').first();
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click({ force: true });
        console.log('   Clicked Confirm');
        continue;
      }

      const signBtn = mmNotificationPage3.locator('button:has-text("Sign")').first();
      if (await signBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await signBtn.click({ force: true });
        console.log('   Clicked Sign');
        break;
      }

      break;
    }

    await mmNotificationPage3.close().catch(() => {});
    await appPage.bringToFront();
    await appPage.waitForTimeout(3000);
  }

  // Now check accounts again
  const accountsAfter = await appPage.evaluate(async () => {
    try {
      return await (window as any).ethereum.request({ method: 'eth_accounts' });
    } catch (e) {
      return [];
    }
  });

  console.log('Accounts after connection:', accountsAfter);

  if (!accountsAfter || accountsAfter.length === 0) {
    console.log('ERROR: Still no accounts connected after connection attempt');
    return;
  }

  const address = accountsAfter[0];
  console.log('Using address:', address);

  // Now call wallet_getCapabilities
  const result = await appPage.evaluate(async (addr) => {
    const ethereum = (window as any).ethereum;

    try {
      // Call wallet_getCapabilities
      const capabilities = await ethereum.request({
        method: 'wallet_getCapabilities',
        params: [addr],
      });

      return {
        address: addr,
        capabilities,
        chainIds: Object.keys(capabilities || {}),
      };
    } catch (error: any) {
      return {
        error: error.message,
        code: error.code,
      };
    }
  }, address);

  console.log('Result:', JSON.stringify(result, null, 2));

  // Check Sepolia specifically
  if (result && !result.error && result.capabilities) {
    const sepoliaHex = '0xaa36a7'; // 11155111 in hex
    const sepoliaCapabilities = result.capabilities[sepoliaHex];

    console.log('\n=== SEPOLIA CAPABILITIES (0xaa36a7) ===');
    console.log(JSON.stringify(sepoliaCapabilities, null, 2));

    if (sepoliaCapabilities?.paymasterService) {
      console.log('\n--- PaymasterService ---');
      console.log('supported:', sepoliaCapabilities.paymasterService.supported);
    } else {
      console.log('\n PaymasterService: NOT FOUND');
      console.log(' This is why gasless transactions are not working!');
      console.log(' MetaMask does not report paymaster support for this wallet.');
    }

    if (sepoliaCapabilities?.atomicBatch) {
      console.log('\n--- AtomicBatch ---');
      console.log('supported:', sepoliaCapabilities.atomicBatch.supported);
    }
  } else if (result.error) {
    console.log('\n ERROR:', result.error);
    if (result.error.includes('not supported') || result.error.includes('Unsupported')) {
      console.log(' MetaMask does not support wallet_getCapabilities!');
      console.log(' This means EIP-5792 gasless transactions cannot work.');
    }
  }

  // Test wallet_sendCalls WITH paymasterService - don't just check capabilities!
  console.log('\n=== Testing wallet_sendCalls WITH paymasterService ===\n');

  // First switch MetaMask to Sepolia (non-blocking)
  console.log('Switching to Sepolia network...');

  // Fire and forget the switch request
  appPage.evaluate(() => {
    (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }],
    }).catch(() => {});
  });

  await appPage.waitForTimeout(2000);

  // Handle network switch approval popup
  const mmSwitchPage = await context.newPage();
  await mmSwitchPage.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmSwitchPage.waitForLoadState('domcontentloaded');
  await mmSwitchPage.waitForTimeout(2000);

  const switchContent = await mmSwitchPage.textContent('body').catch(() => '');
  console.log('Switch popup content:', switchContent?.substring(0, 100));

  const approveBtn = mmSwitchPage.locator('button:has-text("Approve"), button:has-text("Switch network"), button:has-text("Confirm")').first();
  if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await approveBtn.click();
    console.log('Approved network switch');
    await mmSwitchPage.waitForTimeout(2000);
  }
  await mmSwitchPage.close().catch(() => {});

  await appPage.bringToFront();
  await appPage.waitForTimeout(2000);
  console.log('Network switch complete');

  // Get the Pimlico paymaster URL from environment or use test URL
  const PIMLICO_URL = 'https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_test';

  // Start the wallet_sendCalls request (non-blocking) - it will open MetaMask popup
  const sendCallsPromise = appPage.evaluate(async (params) => {
    const { addr, paymasterUrl } = params;
    const ethereum = (window as any).ethereum;

    try {
      // ERC20 transfer(address,uint256) - transfer 0 tokens to self (harmless test)
      const transferData = '0xa9059cbb' +
        addr.slice(2).padStart(64, '0') + // to address (self)
        '0'.padStart(64, '0'); // amount: 0

      const result = await ethereum.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '2.0.0',
          chainId: '0xaa36a7', // Sepolia
          from: addr,
          atomicRequired: false, // Required by MetaMask
          calls: [
            {
              to: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia USDT
              data: transferData,
              value: '0x0',
            }
          ],
          capabilities: {
            paymasterService: {
              url: paymasterUrl,
              optional: true, // MetaMask should accept and try to use paymaster
            }
          }
        }],
      });

      return {
        success: true,
        result,
        message: 'wallet_sendCalls with paymasterService ACCEPTED!'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        isPaymasterError: error.message?.toLowerCase().includes('paymaster'),
        isUserRejection: error.code === 4001,
        isInvalidParams: error.code === -32602,
      };
    }
  }, { addr: address, paymasterUrl: PIMLICO_URL });

  // Wait a bit for MetaMask popup to appear
  await appPage.waitForTimeout(3000);

  // Check MetaMask notification page to see what it shows
  const mmTxPage = await context.newPage();
  await mmTxPage.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmTxPage.waitForLoadState('domcontentloaded');
  await mmTxPage.waitForTimeout(2000);

  const txContent = await mmTxPage.textContent('body').catch(() => '');
  console.log('MetaMask TX page content:');
  console.log(txContent?.substring(0, 500));

  // Take screenshot of what MetaMask shows
  await mmTxPage.screenshot({ path: 'e2e/screenshots/debug-wallet-sendcalls-popup.png' });

  // Check for gasless/sponsored indicators
  const isGasless = txContent?.includes('sponsored') ||
                    txContent?.includes('$0.00') ||
                    txContent?.includes('0 ETH') ||
                    txContent?.includes('No fee') ||
                    txContent?.includes('Free');

  console.log('\n--- MetaMask Popup Analysis ---');
  console.log('Shows gasless/sponsored:', isGasless);
  console.log('Shows gas fee:', txContent?.includes('Network fee') || txContent?.includes('Gas fee'));

  // Reject the transaction (we just want to see if MetaMask accepts the request)
  const rejectBtn = mmTxPage.locator('button:has-text("Reject"), button:has-text("Cancel")').first();
  if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await rejectBtn.click();
    console.log('Rejected test transaction');
  }
  await mmTxPage.close().catch(() => {});

  // Wait for the promise to resolve (with rejection)
  const sendCallsTest = await sendCallsPromise;

  console.log('\nwallet_sendCalls result:');
  console.log(JSON.stringify(sendCallsTest, null, 2));

  if (sendCallsTest.success) {
    console.log('\n✅ SUCCESS! MetaMask accepts wallet_sendCalls with paymasterService!');
    console.log('   The capability check in frontend is TOO STRICT!');
  } else if (sendCallsTest.isUserRejection) {
    console.log('\n⚠️ User rejected - but MetaMask DID show the transaction!');
    console.log('   This means paymasterService IS supported!');
  } else if (sendCallsTest.isPaymasterError) {
    console.log('\n❌ Paymaster-specific error - MetaMask tried but paymaster failed');
  } else {
    console.log('\n❓ Other error:', sendCallsTest.error);
  }

  console.log('\n=== DEBUG COMPLETE ===\n');
});

// Helper: Import wallet
async function importWallet(page: Page, seedPhrase: string, password: string) {
  await page.waitForTimeout(2000);

  // Step 1: Click "I have an existing wallet"
  const existingWalletBtn = page.locator('button:has-text("I have an existing wallet")').first();
  if (await existingWalletBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await existingWalletBtn.click();
    console.log('   Clicked "I have an existing wallet"');
    await page.waitForTimeout(2000);
  }

  // Step 2: Import using Secret Recovery Phrase
  const importBtn = page.locator('button:has-text("Import using Secret Recovery Phrase")').first();
  if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await importBtn.click();
    console.log('   Clicked Import');
    await page.waitForTimeout(2000);
  }

  // Step 3: Check if we're on Analytics or Seed phrase screen
  const pageContent = await page.textContent('body').catch(() => '');

  // If we see "Help improve MetaMask" it's analytics, otherwise it's seed phrase screen
  if (pageContent?.includes('Help improve MetaMask')) {
    // Analytics consent screen
    const continueAnalyticsBtn = page.locator('button:has-text("Continue")').first();
    if (await continueAnalyticsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isEnabled = await continueAnalyticsBtn.isEnabled().catch(() => false);
      if (isEnabled) {
        await continueAnalyticsBtn.click();
        console.log('   Clicked Continue (analytics)');
        await page.waitForTimeout(2000);
      }
    }
  }

  // Step 4: I agree (terms)
  const agreeBtn = page.locator('button:has-text("I agree")').first();
  if (await agreeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await checkbox.click({ force: true });
    }
    await agreeBtn.click();
    console.log('   Clicked I agree');
    await page.waitForTimeout(1000);
  }

  // Step 5: Enter seed phrase (check for textarea or div)
  // MM 13.x shows "Import a wallet" with textarea for seed phrase
  let seedEntered = false;

  // Check if textarea is visible (MM 13.x style)
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textarea.click();
    await page.waitForTimeout(500);
    // Use keyboard type to trigger validation
    await page.keyboard.type(seedPhrase, { delay: 30 });
    console.log('   Entered seed phrase via textarea');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(2000);
    seedEntered = true;
  }

  // Fallback: check for individual word inputs
  if (!seedEntered) {
    const wordInput0 = page.locator('[data-testid="import-srp__srp-word-0"]');
    if (await wordInput0.isVisible({ timeout: 2000 }).catch(() => false)) {
      const words = seedPhrase.split(' ');
      for (let i = 0; i < words.length; i++) {
        await page.locator(`[data-testid="import-srp__srp-word-${i}"]`).fill(words[i]);
      }
      console.log('   Entered seed phrase via individual inputs');
      seedEntered = true;
    }
  }

  // Step 6: Click Continue after seed phrase
  await page.waitForTimeout(2000);
  const confirmSeedBtn = page.locator('[data-testid="import-srp-confirm"], button:has-text("Continue")').first();
  await confirmSeedBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  // Wait for button to become enabled
  for (let i = 0; i < 10; i++) {
    const isEnabled = await confirmSeedBtn.isEnabled().catch(() => false);
    if (isEnabled) {
      await confirmSeedBtn.click();
      console.log('   Clicked Continue (seed)');
      await page.waitForTimeout(2000);
      break;
    }
    await page.waitForTimeout(1000);
  }

  // Step 7: Set password
  const pwInputs = await page.locator('input[type="password"]').all();
  if (pwInputs.length >= 2) {
    await pwInputs[0].fill(password);
    await pwInputs[1].fill(password);
    console.log('   Filled password');
  }

  const termsCheckbox = page.locator('input[type="checkbox"]').first();
  if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await termsCheckbox.click({ force: true });
  }

  const createPwBtn = page.locator('button:has-text("Create password"), button:has-text("Import my wallet")').first();
  if (await createPwBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createPwBtn.click();
    console.log('   Clicked Create password');
  }
  await page.waitForTimeout(5000);

  // Step 8: Complete setup
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2000);

    const accountMenu = page.locator('[data-testid="account-menu-icon"]');
    if (await accountMenu.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('   Wallet setup complete!');
      return;
    }

    const walletReady = page.locator('text=Your wallet is ready');
    if (await walletReady.isVisible({ timeout: 500 }).catch(() => false)) {
      const openWalletBtn = page.locator('[data-testid="onboarding-complete-done"]:not([disabled])');
      try {
        await openWalletBtn.waitFor({ state: 'visible', timeout: 20000 });
        await openWalletBtn.click();
        console.log('   Clicked Open wallet');
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        const extId = currentUrl.match(/chrome-extension:\/\/([a-z0-9]+)/)?.[1];
        if (extId) {
          await page.goto(`chrome-extension://${extId}/home.html`);
          await page.waitForTimeout(3000);
        }
        continue;
      } catch (e) {
        await page.waitForTimeout(5000);
        continue;
      }
    }

    const skipBtns = ['button:has-text("Continue")', 'button:has-text("Got it")', 'button:has-text("Done")', 'button:has-text("Next")'];
    for (const selector of skipBtns) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        if (await btn.isEnabled().catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }
  }
}
