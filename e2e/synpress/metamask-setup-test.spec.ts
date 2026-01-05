/**
 * Minimal test to verify MetaMask setup works
 * Run: npx playwright test e2e/synpress/metamask-setup-test.spec.ts --headed
 */

import { test as base, chromium, expect } from '@playwright/test';
import path from 'path';

const CHROME_126_PATH = path.join(
  process.cwd(),
  'chrome/mac_arm-126.0.6478.0/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);

const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress/metamask-chrome-11.9.1');
const WALLET_PASSWORD = 'Tester@1234';
const TEST_SEED_PHRASE = 'test test test test test test test test test test test junk';

const test = base.extend({});

test('MetaMask loads and can be set up', async () => {
  console.log('Starting Chrome with MetaMask...');
  console.log('Chrome path:', CHROME_126_PATH);
  console.log('MetaMask path:', METAMASK_PATH);

  const context = await chromium.launchPersistentContext('', {
    executablePath: CHROME_126_PATH,
    headless: false,
    args: [
      `--disable-extensions-except=${METAMASK_PATH}`,
      `--load-extension=${METAMASK_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
      '--lang=en-US',
    ],
    locale: 'en-US',
    viewport: { width: 1280, height: 720 },
  });

  // Wait for MetaMask to initialize
  console.log('Waiting for MetaMask to initialize...');
  await new Promise((r) => setTimeout(r, 3000));

  // Get extension ID from background page or any extension page
  let extensionId = '';

  // Check background pages first
  const bgPages = context.backgroundPages();
  console.log('Background pages:', bgPages.length);
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

  // If still no extension ID, wait a bit more and try again
  if (!extensionId) {
    console.log('Extension not found yet, waiting...');
    await new Promise((r) => setTimeout(r, 5000));
    const bgPages2 = context.backgroundPages();
    if (bgPages2.length > 0) {
      extensionId = bgPages2[0].url().split('/')[2];
    }
  }

  console.log('MetaMask extension ID:', extensionId || 'NOT FOUND');

  // List all pages
  const pages = context.pages();
  console.log('Open pages:', pages.map((p) => p.url()));

  // Find or create MetaMask page
  let mmPage = pages.find((p) => p.url().includes('chrome-extension://'));
  if (!mmPage) {
    console.log('Creating new page for MetaMask...');
    mmPage = await context.newPage();
    await mmPage.goto(`chrome-extension://${extensionId}/home.html`);
  }

  console.log('MetaMask page URL:', mmPage.url());

  // Wait for page to load
  await mmPage.waitForLoadState('domcontentloaded');
  await mmPage.waitForTimeout(3000);

  // Take screenshot
  await mmPage.screenshot({ path: 'e2e/screenshots/metamask-initial.png' });
  console.log('Screenshot saved to e2e/screenshots/metamask-initial.png');

  // Check page content
  const pageText = await mmPage.textContent('body');
  console.log('Page contains "get started":', pageText?.toLowerCase().includes('get started'));
  console.log('Page contains "Create":', pageText?.includes('Create'));
  console.log('Page contains "Import":', pageText?.includes('Import'));

  // Try to find and click the terms checkbox
  console.log('\n=== Step 1: Terms Checkbox ===');

  // First, let's see what checkboxes exist
  const checkboxes = await mmPage.locator('input[type="checkbox"]').all();
  console.log(`Found ${checkboxes.length} checkboxes`);

  // Try to click the checkbox
  const checkbox = mmPage.locator('input[type="checkbox"]').first();
  if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Checkbox is visible, clicking...');
    await checkbox.click({ force: true });
    await mmPage.waitForTimeout(500);
  } else {
    // Try clicking the label instead
    console.log('Checkbox not directly visible, trying label...');
    const label = mmPage.locator('label:has-text("I agree")').first();
    if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
      await label.click();
      console.log('Clicked label');
    }
  }

  await mmPage.screenshot({ path: 'e2e/screenshots/metamask-after-checkbox.png' });

  // Look for Import button
  console.log('\n=== Step 2: Import Button ===');

  const allButtons = await mmPage.locator('button').all();
  console.log(`Found ${allButtons.length} buttons`);

  for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
    const btnText = await allButtons[i].textContent().catch(() => 'N/A');
    console.log(`Button ${i}: "${btnText}"`);
  }

  // Find and click Import
  const importBtn = mmPage.locator('button:has-text("Import")').first();
  if (await importBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Found Import button, clicking...');
    await importBtn.click();
    await mmPage.waitForTimeout(2000);
    await mmPage.screenshot({ path: 'e2e/screenshots/metamask-after-import-click.png' });
  }

  // Check for analytics screen (English + German)
  console.log('\n=== Step 3: Analytics Screen ===');
  await mmPage.waitForTimeout(2000);
  await mmPage.screenshot({ path: 'e2e/screenshots/metamask-analytics-screen.png' });

  // Try English and German variants
  const analyticsButtons = [
    'button:has-text("No thanks")',
    'button:has-text("Nein danke")',
    'button:has-text("I agree")',
    'button:has-text("Ich stimme zu")',
  ];

  for (const selector of analyticsButtons) {
    const btn = mmPage.locator(selector).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const btnText = await btn.textContent();
      console.log(`Found analytics button: "${btnText}", clicking...`);
      await btn.click();
      await mmPage.waitForTimeout(1000);
      break;
    }
  }

  // Check for seed phrase inputs
  console.log('\n=== Step 4: Seed Phrase ===');
  await mmPage.waitForTimeout(2000);
  await mmPage.screenshot({ path: 'e2e/screenshots/metamask-seed-phrase-page.png' });

  // Log all visible buttons for debugging
  const allBtns = await mmPage.locator('button').all();
  console.log(`Visible buttons on seed phrase page: ${allBtns.length}`);
  for (let i = 0; i < Math.min(allBtns.length, 8); i++) {
    const txt = await allBtns[i].textContent().catch(() => '');
    if (txt) console.log(`  Button: "${txt.trim()}"`);
  }

  const allInputs = await mmPage.locator('input').all();
  console.log(`Found ${allInputs.length} inputs on page`);

  // If no inputs, we might be on a different page - check for text
  if (allInputs.length === 0) {
    const bodyText = await mmPage.textContent('body');
    console.log('Page text includes "Geheime":', bodyText?.includes('Geheime'));
    console.log('Page text includes "Secret":', bodyText?.includes('Secret'));
    console.log('Page text includes "Wiederherstellungs":', bodyText?.includes('Wiederherstellungs'));
  }

  // Try to fill seed phrase
  const words = TEST_SEED_PHRASE.split(' ');

  // First check if we have data-testid inputs
  let foundInputs = false;
  for (let i = 0; i < words.length; i++) {
    const input = mmPage.locator(`input[data-testid="import-srp__srp-word-${i}"]`);
    if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
      await input.fill(words[i]);
      if (i === 0) {
        console.log('Found data-testid inputs, filling seed phrase...');
        foundInputs = true;
      }
    }
  }

  // If not, try generic input selectors
  if (!foundInputs && allInputs.length >= 12) {
    console.log('Using generic input selectors...');
    for (let i = 0; i < Math.min(words.length, allInputs.length); i++) {
      await allInputs[i].fill(words[i]);
    }
    foundInputs = true;
  }

  if (foundInputs) {
    await mmPage.screenshot({ path: 'e2e/screenshots/metamask-seed-filled.png' });

    // Click confirm button (English + German)
    console.log('\n=== Step 5: Confirm Seed Phrase ===');
    const confirmButtons = [
      'button:has-text("Confirm Secret Recovery Phrase")',
      'button:has-text("Geheime Wiederherstellungsphrase bestätigen")',
      'button:has-text("Bestätigen")',
      'button:has-text("Confirm")',
    ];

    for (const selector of confirmButtons) {
      const btn = mmPage.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const btnText = await btn.textContent();
        console.log(`Found confirm button: "${btnText}", clicking...`);
        await btn.click();
        await mmPage.waitForTimeout(2000);
        break;
      }
    }

    // Password screen
    console.log('\n=== Step 6: Password ===');
    await mmPage.screenshot({ path: 'e2e/screenshots/metamask-password-page.png' });

    const pwInputs = await mmPage.locator('input[type="password"]').all();
    console.log(`Found ${pwInputs.length} password inputs`);

    if (pwInputs.length >= 2) {
      await pwInputs[0].fill(WALLET_PASSWORD);
      await pwInputs[1].fill(WALLET_PASSWORD);
      console.log('Password filled');

      // Check terms checkbox
      const checkbox = mmPage.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await checkbox.click();
        console.log('Terms checkbox clicked');
      }

      // Click import button (English + German)
      const importButtons = [
        'button:has-text("Import my wallet")',
        'button:has-text("Meine Wallet importieren")',
        'button:has-text("Importieren")',
        'button:has-text("Import")',
      ];

      for (const selector of importButtons) {
        const btn = mmPage.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          const btnText = await btn.textContent();
          console.log(`Found import button: "${btnText}", clicking...`);
          await btn.click();
          await mmPage.waitForTimeout(3000);
          break;
        }
      }

      // Handle completion screens
      console.log('\n=== Step 7: Completion ===');
      const completionButtons = [
        'button:has-text("Got it")',
        'button:has-text("Verstanden")',
        'button:has-text("Next")',
        'button:has-text("Weiter")',
        'button:has-text("Done")',
        'button:has-text("Fertig")',
      ];

      for (let round = 0; round < 3; round++) {
        await mmPage.waitForTimeout(1000);
        for (const selector of completionButtons) {
          const btn = mmPage.locator(selector).first();
          if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            const btnText = await btn.textContent();
            console.log(`Clicking completion button: "${btnText}"`);
            await btn.click();
            await mmPage.waitForTimeout(1000);
          }
        }
      }

      await mmPage.screenshot({ path: 'e2e/screenshots/metamask-wallet-ready.png' });
    }
  }

  console.log('\n=== Test Complete ===');
  console.log('Check screenshots in e2e/screenshots/');

  // Keep browser open for 5 seconds to see result
  await mmPage.waitForTimeout(5000);

  await context.close();
});
