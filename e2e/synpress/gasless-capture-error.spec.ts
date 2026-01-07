/**
 * Gasless Transaction Error Capture Test
 *
 * Captures the actual JavaScript error when wallet_sendCalls fails.
 */
import { test, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const TEST_SEED_2 = process.env.TEST_SEED_2 || '';
const WALLET_PASSWORD = 'Tester@1234';

const CHROME_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-13.13.1');
const USER_DATA_DIR = path.join(process.cwd(), '.cache-synpress/gasless-debug-error');

let context: BrowserContext;
let appPage: Page;
let extensionId: string;

test.beforeAll(async () => {
  if (!TEST_SEED_2) throw new Error('TEST_SEED_2 not set');

  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      `--disable-extensions-except=${METAMASK_PATH}`,
      `--load-extension=${METAMASK_PATH}`,
      '--no-first-run',
      '--disable-popup-blocking',
    ],
    locale: 'en-US',
    viewport: { width: 1400, height: 900 },
  });

  await new Promise((r) => setTimeout(r, 3000));

  // Get extension ID
  const workers = context.serviceWorkers();
  if (workers.length > 0) {
    extensionId = workers[0].url().match(/chrome-extension:\/\/([a-z0-9]+)/)?.[1] || '';
  }
  console.log('Extension ID:', extensionId);
});

test.afterAll(async () => {
  await context?.close();
});

test('Capture wallet_sendCalls error', async () => {
  // Setup MetaMask (unlock or import)
  const mmPage = await context.newPage();
  await mmPage.goto(`chrome-extension://${extensionId}/home.html`);
  await mmPage.waitForLoadState('networkidle');

  const passwordInput = mmPage.locator('input[type="password"]').first();
  if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordInput.fill(WALLET_PASSWORD);
    await mmPage.locator('button:has-text("Unlock")').click();
    console.log('Unlocked MetaMask');
    await mmPage.waitForTimeout(2000);
  }
  await mmPage.close();

  // Open app
  appPage = await context.newPage();

  // Capture ALL console messages including errors
  const errors: string[] = [];
  appPage.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('Error') || text.includes('error')) {
      errors.push(`[${msg.type()}] ${text}`);
      console.log('CONSOLE:', msg.type(), text);
    }
  });

  appPage.on('pageerror', (error) => {
    errors.push(`[pageerror] ${error.message}`);
    console.log('PAGE ERROR:', error.message);
  });

  // Intercept wallet RPC calls to see what's being sent
  await appPage.addInitScript(() => {
    const originalRequest = window.ethereum?.request;
    if (originalRequest) {
      (window as any).ethereum.request = async function (args: any) {
        console.log('ETHEREUM RPC:', JSON.stringify(args, null, 2));
        try {
          const result = await originalRequest.call(this, args);
          console.log('ETHEREUM RESULT:', JSON.stringify(result, null, 2));
          return result;
        } catch (error: any) {
          console.error('ETHEREUM ERROR:', error.message, error.code, JSON.stringify(error));
          throw error;
        }
      };
    }
  });

  await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(3000);

  // Connect wallet (simplified - assuming already connected from previous test)
  const walletTile = appPage.locator('img[src*="wallet"]').first();
  if (await walletTile.isVisible({ timeout: 3000 }).catch(() => false)) {
    await walletTile.click();
    await appPage.waitForTimeout(1000);

    const mmOption = appPage.locator('img[src*="metamask"]').first();
    if (await mmOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mmOption.click();
      await appPage.waitForTimeout(2000);

      // Handle MetaMask connection
      const mmNotif = await context.newPage();
      await mmNotif.goto(`chrome-extension://${extensionId}/notification.html`);
      await mmNotif.waitForTimeout(2000);

      for (let i = 0; i < 5; i++) {
        const btn = mmNotif.locator('button:has-text("Connect"), button:has-text("Confirm"), button:has-text("Sign")').first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          console.log('Clicked MetaMask button');
          await mmNotif.waitForTimeout(2000);
        } else {
          break;
        }
      }
      await mmNotif.close().catch(() => {});
    }
  }

  await appPage.bringToFront();
  await appPage.waitForTimeout(3000);

  // Verify connected
  const content = await appPage.textContent('body');
  if (content?.toLowerCase().includes('0xe988')) {
    console.log('Wallet connected: 0xE988...');
  } else {
    console.log('Page content:', content?.substring(0, 200));
  }

  // Navigate to sell page and enter amount
  await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(2000);

  const amountInput = appPage.locator('input[inputmode="decimal"]').first();
  await amountInput.fill('0.01');
  await appPage.waitForTimeout(2000);

  // Intercept the API call to see what gasless data we get
  let apiResponseData: any = null;
  await appPage.route('**/sell/paymentInfos**', async (route) => {
    const response = await route.fetch();
    apiResponseData = await response.json();
    console.log('\n=== API RESPONSE ===');
    console.log('gaslessAvailable:', apiResponseData.gaslessAvailable);
    console.log('eip7702Authorization:', !!apiResponseData.eip7702Authorization);
    console.log('depositTx:', !!apiResponseData.depositTx);
    if (apiResponseData.depositTx?.eip5792) {
      console.log('EIP-5792 paymasterUrl:', apiResponseData.depositTx.eip5792.paymasterUrl);
      console.log('EIP-5792 chainId:', apiResponseData.depositTx.eip5792.chainId);
      console.log('EIP-5792 calls:', JSON.stringify(apiResponseData.depositTx.eip5792.calls, null, 2));
    }
    console.log('===================\n');
    await route.fulfill({ response });
  });

  // Click the Complete button
  console.log('\n>>> CLICKING COMPLETE BUTTON <<<\n');
  errors.length = 0; // Clear previous errors

  const completeBtn = appPage.locator('button:has-text("Complete"), button:has-text("Transaktion")').first();
  await completeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await completeBtn.click();

  // Wait and capture what happens
  await appPage.waitForTimeout(8000);

  // Check for MetaMask popup
  const mmTxPage = await context.newPage();
  await mmTxPage.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmTxPage.waitForTimeout(2000);

  const txContent = await mmTxPage.textContent('body').catch(() => '');
  console.log('\n=== MetaMask Notification ===');
  console.log(txContent?.substring(0, 500));
  await mmTxPage.screenshot({ path: 'e2e/screenshots/error-capture-mm.png' });

  // Try to confirm if there's a button
  const confirmBtn = mmTxPage.locator('button:has-text("Confirm"), button:has-text("Sign")').first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Found Confirm button - clicking');
    await confirmBtn.click();
    await mmTxPage.waitForTimeout(5000);
  } else {
    console.log('No Confirm button found in MetaMask');
  }

  await mmTxPage.close().catch(() => {});
  await appPage.bringToFront();

  // Final state
  await appPage.waitForTimeout(3000);
  const finalContent = await appPage.textContent('body');
  await appPage.screenshot({ path: 'e2e/screenshots/error-capture-final.png' });

  console.log('\n=== CAPTURED ERRORS ===');
  if (errors.length > 0) {
    errors.forEach((e) => console.log(e));
  } else {
    console.log('No JavaScript errors captured');
  }

  console.log('\n=== FINAL PAGE STATE ===');
  if (finalContent?.includes('failed') || finalContent?.includes('wrong')) {
    console.log('TRANSACTION FAILED');
    // Extract error message if visible
    const errorMatch = finalContent?.match(/Transaction failed[^.]*\.?[^.]*\.?/);
    if (errorMatch) {
      console.log('Error text:', errorMatch[0]);
    }
  } else if (finalContent?.includes('success')) {
    console.log('TRANSACTION SUCCESS!');
  }

  // Look for TX hash
  const hashMatch = finalContent?.match(/0x[a-fA-F0-9]{64}/);
  if (hashMatch) {
    console.log('TX Hash:', hashMatch[0]);
    console.log('Etherscan:', `https://sepolia.etherscan.io/tx/${hashMatch[0]}`);
  }

  // Summary
  console.log('\n=== DIAGNOSIS ===');
  if (apiResponseData?.gaslessAvailable) {
    console.log('- API returned gaslessAvailable: true');
  }
  if (apiResponseData?.depositTx?.eip5792) {
    console.log('- API returned EIP-5792 data');
    console.log('- Paymaster URL:', apiResponseData.depositTx.eip5792.paymasterUrl);
  }
  if (errors.some((e) => e.includes('wallet_sendCalls') || e.includes('sendCalls'))) {
    console.log('- ERROR: wallet_sendCalls failed');
  }
  if (errors.some((e) => e.includes('not supported') || e.includes('unsupported'))) {
    console.log('- ERROR: Feature not supported by wallet');
  }
  if (txContent?.includes('Account 1') && !txContent?.includes('Confirm')) {
    console.log('- MetaMask showed no transaction UI (wallet_sendCalls rejected silently)');
  }
});
