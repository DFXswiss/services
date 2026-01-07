/**
 * Gasless Debug: Capture wallet_sendCalls error
 *
 * Uses existing wallet setup from gasless-sell-real tests.
 * Intercepts ethereum.request to capture the exact error when wallet_sendCalls fails.
 */
import { test, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const WALLET_PASSWORD = 'Tester@1234';

const CHROME_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-13.13.1');
// Use the SAME directory as gasless-sell-real tests (wallet already set up)
const USER_DATA_DIR = path.join(process.cwd(), '.cache-synpress/gasless-wallet2');

let context: BrowserContext;
let appPage: Page;
let extensionId: string;

test.beforeAll(async () => {
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

test('Debug wallet_sendCalls with existing wallet', async () => {
  // Unlock MetaMask first
  const mmPage = await context.newPage();
  await mmPage.goto(`chrome-extension://${extensionId}/home.html`);
  await mmPage.waitForLoadState('networkidle');
  await mmPage.waitForTimeout(2000);

  const passwordInput = mmPage.locator('input[type="password"]').first();
  if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordInput.fill(WALLET_PASSWORD);
    await mmPage.locator('button:has-text("Unlock")').click();
    console.log('Unlocked MetaMask');
    await mmPage.waitForTimeout(3000);
  }

  // Check if account is visible
  const accountMenu = mmPage.locator('[data-testid="account-menu-icon"]');
  if (await accountMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('MetaMask is ready');
  }
  await mmPage.close();

  // Open app
  appPage = await context.newPage();

  // CRITICAL: Inject ethereum wrapper BEFORE any page loads
  await appPage.addInitScript(() => {
    // Wait for ethereum to be available, then wrap it
    const wrapEthereum = () => {
      if (!(window as any).ethereum) {
        setTimeout(wrapEthereum, 100);
        return;
      }

      const originalRequest = (window as any).ethereum.request.bind((window as any).ethereum);
      (window as any).ethereum.request = async function (args: { method: string; params?: unknown[] }) {
        console.log(`[ETHEREUM] >>> ${args.method}`, JSON.stringify(args.params || [], null, 2).substring(0, 500));

        try {
          const result = await originalRequest(args);
          console.log(`[ETHEREUM] <<< ${args.method} SUCCESS:`, JSON.stringify(result, null, 2).substring(0, 500));
          return result;
        } catch (error: any) {
          console.error(`[ETHEREUM] <<< ${args.method} ERROR:`, {
            message: error.message,
            code: error.code,
            data: error.data,
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          });
          throw error;
        }
      };
      console.log('[ETHEREUM] Request interceptor installed');
    };

    wrapEthereum();
  });

  // Capture ALL console messages
  const rpcLogs: string[] = [];
  const allLogs: string[] = [];
  appPage.on('console', (msg) => {
    const text = msg.text();
    allLogs.push(`[${msg.type()}] ${text}`);
    if (text.includes('[ETHEREUM]')) {
      rpcLogs.push(text);
      console.log(text);
    }
    // Log errors and warnings immediately
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`CONSOLE ${msg.type().toUpperCase()}:`, text);
    }
  });

  // Capture page errors
  appPage.on('pageerror', (error) => {
    console.log('PAGE ERROR:', error.message);
    allLogs.push(`[pageerror] ${error.message}`);
  });

  // Go to sell page
  await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(3000);

  // IMPORTANT: Remove webpack dev server overlay that blocks clicks
  await appPage.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) {
      overlay.remove();
      console.log('Removed webpack overlay');
    }
    // Also remove any iframe overlays
    document.querySelectorAll('iframe[src="about:blank"]').forEach(el => el.remove());
  });

  // Check for Unauthorized error and clear stale session
  const hasUnauthorized = await appPage.textContent('body').then(t => t?.includes('Unauthorized')).catch(() => false);
  if (hasUnauthorized) {
    console.log('Detected Unauthorized error - clearing session...');
    await appPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Remove overlay again after error
    await appPage.evaluate(() => {
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
      document.querySelectorAll('iframe[src="about:blank"]').forEach(el => el.remove());
    });
    await appPage.reload();
    await appPage.waitForLoadState('networkidle');
    await appPage.waitForTimeout(2000);
    // Remove overlay after reload
    await appPage.evaluate(() => {
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
      document.querySelectorAll('iframe[src="about:blank"]').forEach(el => el.remove());
    });
  }

  // Check if already connected (wallet address visible) - check for both wallets
  let isConnected = false;
  const pageContent = await appPage.textContent('body');
  if (pageContent?.toLowerCase().includes('0xe988') || pageContent?.toLowerCase().includes('0x482c')) {
    console.log('Already connected with wallet');
    isConnected = true;
  } else {
    console.log('Need to connect wallet...');

    // Connect wallet - first click the wallet tile to show wallet options
    const walletTile = appPage.locator('img[src*="wallet"], img[src*="cryptowallet"]').first();
    if (await walletTile.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Remove any overlays before clicking
      await appPage.evaluate(() => {
        document.querySelectorAll('iframe[src="about:blank"]').forEach(el => el.remove());
        const overlay = document.getElementById('webpack-dev-server-client-overlay');
        if (overlay) overlay.remove();
      });

      await walletTile.click({ force: true });
      await appPage.waitForTimeout(1500);

      // Select MetaMask
      const mmOption = appPage.locator('img[src*="metamask"]').first();
      if (await mmOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await mmOption.click({ force: true });
        console.log('Clicked MetaMask option');
        await appPage.waitForTimeout(3000);

        // Handle MetaMask notification popup
        let notifPage: Page | null = null;

        // Wait for notification to appear
        for (let i = 0; i < 10; i++) {
          for (const page of context.pages()) {
            if (page.url().includes('notification.html')) {
              notifPage = page;
              break;
            }
          }
          if (notifPage) break;
          await appPage.waitForTimeout(500);
        }

        // If no notification popup, try opening it directly
        if (!notifPage) {
          notifPage = await context.newPage();
          await notifPage.goto(`chrome-extension://${extensionId}/notification.html`);
          await notifPage.waitForTimeout(2000);
        }

        if (notifPage) {
          // Click through MetaMask buttons
          for (let i = 0; i < 6; i++) {
            try {
              const btn = notifPage
                .locator('button:has-text("Connect"), button:has-text("Confirm"), button:has-text("Sign"), button:has-text("Next")')
                .first();
              if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await btn.click();
                console.log(`Clicked MetaMask button (step ${i + 1})`);
                await notifPage.waitForTimeout(2000).catch(() => {});
              } else {
                break;
              }
            } catch {
              // Page closed after clicking, which is expected
              console.log('MetaMask notification closed');
              break;
            }
          }
          await notifPage.close().catch(() => {});
        }

        await appPage.bringToFront();
        await appPage.waitForTimeout(3000);

        // Verify connection
        const newContent = await appPage.textContent('body');
        if (newContent?.toLowerCase().includes('0xe988') || newContent?.toLowerCase().includes('0x482c')) {
          console.log('Successfully connected wallet!');
          isConnected = true;
        }
      }
    } else {
      console.log('Wallet tile not visible - might already be on sell page');
    }
  }

  if (!isConnected) {
    console.log('Failed to connect wallet');
    await appPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-notconnected.png' });
    return;
  }

  // Navigate to sell with correct params
  await appPage.goto('http://localhost:3001/sell?blockchain=Sepolia&assets=USDT');
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(2000);

  // Enter amount
  const amountInput = appPage.locator('input[inputmode="decimal"]').first();
  await amountInput.fill('0.01');
  await appPage.waitForTimeout(2000);

  // Use page.on('request') to capture ALL API calls
  appPage.on('request', (request) => {
    const url = request.url();
    if (url.includes('/sell/') && !url.includes('.js') && !url.includes('.css')) {
      console.log(`\n>>> API REQUEST: ${request.method()} ${url}`);
      const postData = request.postData();
      if (postData) {
        console.log('Request Body:', postData);
      }
    }
  });

  appPage.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/sell/') && !url.includes('.js') && !url.includes('.css')) {
      console.log(`\n<<< API RESPONSE: ${response.status()} ${url}`);
      try {
        const body = await response.json();
        console.log('Response Body:', JSON.stringify(body, null, 2).substring(0, 1000));
      } catch {
        const text = await response.text().catch(() => '');
        console.log('Response Text:', text.substring(0, 500));
      }
    }
  });

  // Intercept paymentInfos API response (but not confirm)
  let apiResponse: any = null;
  await appPage.route('**/sell/paymentInfos**', async (route) => {
    // Skip confirm endpoint (handled by dedicated route above)
    if (route.request().url().includes('/confirm')) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    apiResponse = await response.json();
    console.log('\n=== API Response ===');
    console.log('gaslessAvailable:', apiResponse.gaslessAvailable);
    console.log('eip7702Authorization:', apiResponse.eip7702Authorization ? 'YES' : 'NO');
    console.log('depositTx.eip5792:', apiResponse.depositTx?.eip5792 ? 'YES' : 'NO');
    if (apiResponse.eip7702Authorization) {
      console.log('  EIP-7702 auth data:', JSON.stringify(apiResponse.eip7702Authorization, null, 2));
    }
    if (apiResponse.depositTx?.eip5792) {
      console.log('  paymasterUrl:', apiResponse.depositTx.eip5792.paymasterUrl);
      console.log('  chainId:', apiResponse.depositTx.eip5792.chainId);
      console.log('  calls:', JSON.stringify(apiResponse.depositTx.eip5792.calls, null, 2));
    }
    await route.fulfill({ response });
  });

  // Clear RPC logs before clicking
  rpcLogs.length = 0;

  console.log('\n>>> CLICKING COMPLETE BUTTON <<<\n');
  await appPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-before.png' });

  const completeBtn = appPage.locator('button:has-text("Complete"), button:has-text("Transaktion")').first();
  await completeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await completeBtn.click();

  // Wait for wallet_sendCalls to be called
  console.log('Waiting for wallet_sendCalls...');
  await appPage.waitForTimeout(5000);

  // Check if MetaMask shows a popup
  console.log('\n>>> CHECKING METAMASK POPUP <<<\n');
  const mmTxPage = await context.newPage();
  await mmTxPage.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmTxPage.waitForTimeout(2000);

  const txContent = await mmTxPage.textContent('body').catch(() => '');
  console.log('MetaMask notification content:', txContent?.substring(0, 300));
  await mmTxPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-mm.png' });

  // Handle MetaMask transaction confirmation flow
  // Step 1: Check for Review alert button (MetaMask 13.x shows this for unverified contracts)
  const reviewAlertBtn = mmTxPage.locator('button:has-text("Review alert")').first();
  if (await reviewAlertBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found "Review alert" button - clicking');
    await mmTxPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-reviewalert.png' });
    await reviewAlertBtn.click();
    await mmTxPage.waitForTimeout(2000);

    // Step 2: After Review alert, need to click "I want to proceed anyway" checkbox or button
    const proceedCheckbox = mmTxPage.locator('input[type="checkbox"]').first();
    if (await proceedCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found checkbox - clicking');
      await proceedCheckbox.click();
      await mmTxPage.waitForTimeout(1000);
    }

    // Look for various proceed buttons
    const proceedBtn = mmTxPage.locator('button:has-text("proceed"), button:has-text("Continue"), button:has-text("Got it")').first();
    if (await proceedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found proceed button - clicking');
      await proceedBtn.click();
      await mmTxPage.waitForTimeout(2000);
    }

    await mmTxPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-afterreview.png' });
  }

  // Step 3: Now check for Confirm button
  let confirmBtn = mmTxPage.locator('button:has-text("Confirm")').first();
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Found Confirm button - clicking');
    const isEnabled = await confirmBtn.isEnabled().catch(() => false);
    console.log('Confirm button enabled:', isEnabled);
    await mmTxPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-confirm.png' });

    if (isEnabled) {
      await confirmBtn.click();
      console.log('Clicked Confirm - waiting for transaction...');
      await mmTxPage.waitForTimeout(15000);
    } else {
      console.log('Button is DISABLED - checking if there are more steps...');
      // Sometimes the Confirm button is disabled until you scroll or check something
      const pageContent = await mmTxPage.textContent('body').catch(() => '');
      console.log('Page content:', pageContent?.substring(0, 500));
    }
  } else {
    console.log('NO CONFIRM BUTTON - checking page state');
    const pageContent = await mmTxPage.textContent('body').catch(() => '');
    console.log('MetaMask page content:', pageContent?.substring(0, 500));
    await mmTxPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-noconfirm.png' });
  }

  await mmTxPage.close().catch(() => {});
  await appPage.bringToFront();
  await appPage.waitForTimeout(3000);

  // Final state
  await appPage.screenshot({ path: 'e2e/screenshots/debug-sendcalls-final.png' });
  const finalContent = await appPage.textContent('body');

  console.log('\n=== RPC LOGS ===');
  rpcLogs.forEach((log) => console.log(log));

  console.log('\n=== FINAL STATE ===');
  if (finalContent?.includes('failed') || finalContent?.includes('wrong')) {
    console.log('TRANSACTION FAILED');
  } else if (finalContent?.includes('success') || finalContent?.includes('Success')) {
    console.log('TRANSACTION SUCCESS');
    const hashMatch = finalContent?.match(/0x[a-fA-F0-9]{64}/);
    if (hashMatch) {
      console.log('TX Hash:', hashMatch[0]);
      console.log('Etherscan:', `https://sepolia.etherscan.io/tx/${hashMatch[0]}`);
    }
  }

  console.log('\n=== ALL CONSOLE LOGS (errors/warnings) ===');
  allLogs.filter(l => l.includes('[error]') || l.includes('[warning]')).forEach(l => console.log(l));

  console.log('\n=== DIAGNOSIS ===');
  const sendCallsLog = rpcLogs.find((l) => l.includes('wallet_sendCalls'));
  if (sendCallsLog) {
    console.log('wallet_sendCalls WAS called');
    const errorLog = rpcLogs.find((l) => l.includes('wallet_sendCalls') && l.includes('ERROR'));
    if (errorLog) {
      console.log('ERROR found in wallet_sendCalls:', errorLog);
    }
  } else {
    console.log('wallet_sendCalls was NOT called - check if eip5792 flow was triggered');
    // Check if standard transaction was called instead
    const sendTxLog = rpcLogs.find((l) => l.includes('eth_sendTransaction'));
    if (sendTxLog) {
      console.log('eth_sendTransaction was called (standard flow)');
    }
  }
});
