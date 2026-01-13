/**
 * Debug test for gasless transaction - captures all errors
 */
import { test, expect, BrowserContext, Page } from '@playwright/test';
import { chromium } from 'playwright';
import path from 'path';

const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress', 'metamask-chrome-13.13.1');
const CHROME_PATH = '/Users/customer/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium';
const TEST_SEED_2 = process.env.TEST_SEED_2 || 'snake rude story twenty exact economy asset destroy render recall evolve afford';

let context: BrowserContext;
let appPage: Page;
let extensionId: string;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      `--disable-extensions-except=${METAMASK_PATH}`,
      `--load-extension=${METAMASK_PATH}`,
      '--no-sandbox',
    ],
    viewport: { width: 1280, height: 800 },
  });

  // Get extension ID
  await new Promise(r => setTimeout(r, 3000));
  const pages = context.pages();
  for (const page of pages) {
    if (page.url().includes('chrome-extension://')) {
      extensionId = page.url().split('/')[2];
      break;
    }
  }
  console.log('Extension ID:', extensionId);
});

test.afterAll(async () => {
  await context?.close();
});

test('Debug: Gasless transaction with full error capture', async () => {
  // Setup MetaMask
  const mmPage = await context.newPage();
  await mmPage.goto(`chrome-extension://${extensionId}/home.html`);
  await mmPage.waitForLoadState('domcontentloaded');
  await mmPage.waitForTimeout(2000);

  const content = await mmPage.textContent('body').catch(() => '');

  if (content?.includes('existing wallet') || content?.includes('Import')) {
    // Fresh install - import wallet
    await mmPage.click('button:has-text("I have an existing wallet"), button:has-text("Import")').catch(() => {});
    await mmPage.waitForTimeout(1000);
    await mmPage.click('button:has-text("Import using Secret Recovery Phrase"), button:has-text("Import")').catch(() => {});
    await mmPage.waitForTimeout(1000);

    const textarea = mmPage.locator('textarea, input[data-testid="import-srp__srp-word-0"]').first();
    await textarea.click();
    await mmPage.keyboard.type(TEST_SEED_2, { delay: 10 });
    await mmPage.keyboard.press('Tab');
    await mmPage.waitForTimeout(500);

    await mmPage.click('button:has-text("Continue"):not([disabled]), button:has-text("Confirm")').catch(() => {});
    await mmPage.waitForTimeout(1000);

    const pwInputs = await mmPage.locator('input[type="password"]').all();
    for (const input of pwInputs) {
      await input.fill('Tester@1234');
    }
    await mmPage.click('input[type="checkbox"]').catch(() => {});
    await mmPage.click('button:has-text("Create"), button:has-text("Import")').catch(() => {});
    await mmPage.waitForTimeout(2000);
    await mmPage.click('button:has-text("Continue"), button:has-text("Open"), button:has-text("Done")').catch(() => {});
  } else if (content?.includes('Unlock') || content?.includes('Password')) {
    // Locked - unlock
    await mmPage.fill('input[type="password"]', 'Tester@1234');
    await mmPage.click('button:has-text("Unlock")');
  }

  await mmPage.waitForTimeout(2000);
  console.log('MetaMask ready');
  await mmPage.close();

  // Open app
  appPage = await context.newPage();

  // Capture ALL console messages
  const consoleLogs: string[] = [];
  appPage.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  // Capture page errors
  appPage.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
    consoleLogs.push(`[exception] ${error.message}`);
  });

  await appPage.goto('http://localhost:3001/sell');
  await appPage.waitForLoadState('networkidle');
  await appPage.waitForTimeout(2000);

  // Connect wallet
  await appPage.click('img[src*="wallet"]').catch(() => {});
  await appPage.waitForTimeout(500);
  await appPage.click('img[src*="metamask"]').catch(() => {});
  await appPage.waitForTimeout(2000);

  // Handle MetaMask connect popup
  const mmConnect = await context.newPage();
  await mmConnect.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmConnect.waitForTimeout(1500);

  for (let i = 0; i < 4; i++) {
    const btn = mmConnect.locator('button:has-text("Connect"), button:has-text("Confirm"), button:has-text("Sign")').first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await mmConnect.waitForTimeout(1500);
    }
  }
  await mmConnect.close().catch(() => {});

  await appPage.bringToFront();
  await appPage.waitForTimeout(3000);

  // Check if connected
  const pageContent = await appPage.textContent('body');
  if (!pageContent?.includes('0xE988')) {
    console.log('Not connected, retrying...');
    await appPage.reload();
    await appPage.waitForTimeout(3000);
  }

  console.log('Connected to DFX');

  // Fill sell form
  await appPage.waitForTimeout(2000);

  // Enter amount
  const amountInput = appPage.locator('input[type="number"], input[placeholder*="0"]').first();
  await amountInput.fill('0.01');
  await appPage.waitForTimeout(3000);

  console.log('Amount entered, clicking Complete...');

  // Click Complete transaction
  const completeBtn = appPage.locator('button:has-text("Complete"), button:has-text("Transaktion")').first();
  await completeBtn.waitFor({ state: 'visible', timeout: 10000 });

  // Clear console logs before clicking
  consoleLogs.length = 0;

  await completeBtn.click();
  console.log('Clicked Complete button');

  // Wait and capture what happens
  await appPage.waitForTimeout(5000);

  // Check for MetaMask popup
  const mmTx = await context.newPage();
  await mmTx.goto(`chrome-extension://${extensionId}/notification.html`);
  await mmTx.waitForTimeout(2000);

  const txContent = await mmTx.textContent('body').catch(() => '');
  console.log('\n=== MetaMask Notification ===');
  console.log(txContent?.substring(0, 500));
  await mmTx.screenshot({ path: 'e2e/screenshots/debug-mm-popup.png' });

  // Check if there's a confirm button
  const confirmBtn = mmTx.locator('button:has-text("Confirm"), button:has-text("Approve")').first();
  const hasConfirm = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Has Confirm button:', hasConfirm);

  if (hasConfirm) {
    const isEnabled = await confirmBtn.isEnabled().catch(() => false);
    console.log('Confirm enabled:', isEnabled);

    if (isEnabled) {
      await confirmBtn.click();
      console.log('Clicked Confirm!');
      await mmTx.waitForTimeout(5000);
    }
  }

  await mmTx.close().catch(() => {});
  await appPage.bringToFront();

  // Check app state
  await appPage.waitForTimeout(3000);
  const finalContent = await appPage.textContent('body');
  await appPage.screenshot({ path: 'e2e/screenshots/debug-final.png' });

  console.log('\n=== Console Logs ===');
  consoleLogs.forEach(log => console.log(log));

  console.log('\n=== App State ===');
  if (finalContent?.includes('failed') || finalContent?.includes('wrong')) {
    console.log('TRANSACTION FAILED');
    console.log('Error visible:', finalContent?.includes('Transaction failed'));
  } else if (finalContent?.includes('success') || finalContent?.includes('complete')) {
    console.log('TRANSACTION SUCCESS!');
  }

  // Look for transaction hash
  const hashMatch = finalContent?.match(/0x[a-fA-F0-9]{64}/);
  if (hashMatch) {
    console.log('TX Hash:', hashMatch[0]);
    console.log('Etherscan:', `https://sepolia.etherscan.io/tx/${hashMatch[0]}`);
  }
});
