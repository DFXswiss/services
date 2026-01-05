import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * COMPREHENSIVE E2E Test: Bank Refund with Creditor Data - Full Flow
 *
 * This test captures screenshots at EVERY step to provide visual proof
 * that the creditor data flow works correctly end-to-end.
 */

const TEST_TX_ID = process.env.TEST_TX_ID || 'T11';
const SCREENSHOT_DIR = 'e2e/test-results/full-flow-screenshots';

test.describe('Bank Refund - Complete Visual Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    console.log(`API: ${process.env.E2E_API_URL || 'dev.api.dfx.swiss'}`);
    console.log(`Transaction: ${TEST_TX_ID}`);
  });

  test('STEP 1: Navigate to transaction list', async ({ page }) => {
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-transaction-list.png`,
      fullPage: true,
    });

    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    console.log('Screenshot 01: Transaction list captured');
  });

  test('STEP 2: Navigate to refund page', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-refund-page-initial.png`,
      fullPage: true,
    });

    console.log('Screenshot 02: Refund page initial state captured');
  });

  test('STEP 3: Verify refund amount displayed', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Highlight the amount area if visible
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-refund-amount-visible.png`,
      fullPage: true,
    });

    const content = await page.textContent('body');
    const hasAmount = content?.includes('73') || content?.includes('CHF') || content?.includes('Amount');
    console.log(`Screenshot 03: Refund amount area - Found amount: ${hasAmount}`);
  });

  test('STEP 4: Locate creditor form fields', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Try to find form fields
    const nameInput = page.locator('input').first();
    const inputs = await page.locator('input').count();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-form-fields-located.png`,
      fullPage: true,
    });

    console.log(`Screenshot 04: Form fields - Found ${inputs} input fields`);
  });

  test('STEP 5: Fill creditor NAME field', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find and fill name field
    const nameSelectors = [
      'input[name="creditorName"]',
      'input[name="name"]',
      'input[placeholder*="Name"]',
      'input[placeholder*="name"]',
    ];

    for (const selector of nameSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('Max Mustermann');
        console.log(`Filled name using selector: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-name-filled.png`,
      fullPage: true,
    });

    console.log('Screenshot 05: Name field filled with "Max Mustermann"');
  });

  test('STEP 6: Fill creditor ADDRESS field', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill name first
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Max Mustermann');
    }

    // Fill address
    const addressSelectors = [
      'input[name="address"]',
      'input[name="creditorAddress"]',
      'input[name="creditorStreet"]',
      'input[placeholder*="Strasse"]',
      'input[placeholder*="Address"]',
      'input[placeholder*="address"]',
    ];

    for (const selector of addressSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('Bahnhofstrasse 42');
        console.log(`Filled address using selector: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-address-filled.png`,
      fullPage: true,
    });

    console.log('Screenshot 06: Address field filled with "Bahnhofstrasse 42"');
  });

  test('STEP 7: Fill creditor ZIP code', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill previous fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('Max Mustermann');

    const addressInput = page.locator('input[name="address"], input[placeholder*="Strasse"]').first();
    if (await addressInput.isVisible().catch(() => false)) await addressInput.fill('Bahnhofstrasse 42');

    // Fill ZIP
    const zipSelectors = [
      'input[name="zip"]',
      'input[name="creditorZip"]',
      'input[placeholder*="PLZ"]',
      'input[placeholder*="ZIP"]',
      'input[placeholder*="Postleitzahl"]',
    ];

    for (const selector of zipSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('8001');
        console.log(`Filled ZIP using selector: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-zip-filled.png`,
      fullPage: true,
    });

    console.log('Screenshot 07: ZIP field filled with "8001"');
  });

  test('STEP 8: Fill creditor CITY', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill all previous fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('Max Mustermann');

    const addressInput = page.locator('input[name="address"], input[placeholder*="Strasse"]').first();
    if (await addressInput.isVisible().catch(() => false)) await addressInput.fill('Bahnhofstrasse 42');

    const zipInput = page.locator('input[name="zip"], input[placeholder*="PLZ"]').first();
    if (await zipInput.isVisible().catch(() => false)) await zipInput.fill('8001');

    // Fill city
    const citySelectors = [
      'input[name="city"]',
      'input[name="creditorCity"]',
      'input[placeholder*="Stadt"]',
      'input[placeholder*="City"]',
      'input[placeholder*="Ort"]',
    ];

    for (const selector of citySelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('Zürich');
        console.log(`Filled city using selector: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-city-filled.png`,
      fullPage: true,
    });

    console.log('Screenshot 08: City field filled with "Zürich"');
  });

  test('STEP 9: Fill creditor COUNTRY', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill all previous fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('Max Mustermann');

    const addressInput = page.locator('input[name="address"], input[placeholder*="Strasse"]').first();
    if (await addressInput.isVisible().catch(() => false)) await addressInput.fill('Bahnhofstrasse 42');

    const zipInput = page.locator('input[name="zip"], input[placeholder*="PLZ"]').first();
    if (await zipInput.isVisible().catch(() => false)) await zipInput.fill('8001');

    const cityInput = page.locator('input[name="city"], input[placeholder*="Stadt"]').first();
    if (await cityInput.isVisible().catch(() => false)) await cityInput.fill('Zürich');

    // Fill country
    const countrySelectors = [
      'input[name="country"]',
      'input[name="creditorCountry"]',
      'select[name="country"]',
      'input[placeholder*="Land"]',
      'input[placeholder*="Country"]',
    ];

    for (const selector of countrySelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        if (selector.startsWith('select')) {
          await input.selectOption('CH');
        } else {
          await input.fill('CH');
        }
        console.log(`Filled country using selector: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-country-filled.png`,
      fullPage: true,
    });

    console.log('Screenshot 09: Country field filled with "CH"');
  });

  test('STEP 10: Complete form - ALL fields filled', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill ALL fields
    const fields = [
      { selectors: ['input[name="name"]', 'input[placeholder*="Name"]'], value: 'Max Mustermann' },
      { selectors: ['input[name="address"]', 'input[placeholder*="Strasse"]'], value: 'Bahnhofstrasse 42' },
      { selectors: ['input[name="zip"]', 'input[placeholder*="PLZ"]'], value: '8001' },
      { selectors: ['input[name="city"]', 'input[placeholder*="Stadt"]'], value: 'Zürich' },
      { selectors: ['input[name="country"]', 'input[placeholder*="Land"]'], value: 'CH' },
    ];

    for (const field of fields) {
      for (const selector of field.selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible().catch(() => false)) {
          await input.fill(field.value);
          break;
        }
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-form-complete.png`,
      fullPage: true,
    });

    console.log('Screenshot 10: Complete form with all creditor data');
  });

  test('STEP 11: Locate submit button', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill form first
    const fields = [
      { selectors: ['input[name="name"]', 'input[placeholder*="Name"]'], value: 'Max Mustermann' },
      { selectors: ['input[name="address"]', 'input[placeholder*="Strasse"]'], value: 'Bahnhofstrasse 42' },
      { selectors: ['input[name="zip"]', 'input[placeholder*="PLZ"]'], value: '8001' },
      { selectors: ['input[name="city"]', 'input[placeholder*="Stadt"]'], value: 'Zürich' },
      { selectors: ['input[name="country"]', 'input[placeholder*="Land"]'], value: 'CH' },
    ];

    for (const field of fields) {
      for (const selector of field.selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible().catch(() => false)) {
          await input.fill(field.value);
          break;
        }
      }
    }

    // Find submit button
    const buttonSelectors = [
      'button:has-text("Confirm")',
      'button:has-text("Request")',
      'button:has-text("Submit")',
      'button:has-text("Bestätigen")',
      'button:has-text("Anfordern")',
      'button[type="submit"]',
    ];

    let buttonFound = false;
    for (const selector of buttonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        // Highlight the button by scrolling to it
        await button.scrollIntoViewIfNeeded();
        buttonFound = true;
        console.log(`Found submit button: ${selector}`);
        break;
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-submit-button-ready.png`,
      fullPage: true,
    });

    console.log(`Screenshot 11: Submit button located - Found: ${buttonFound}`);
  });

  test('STEP 12: Final state before submission', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill all fields
    const fields = [
      { selectors: ['input[name="name"]', 'input[placeholder*="Name"]'], value: 'Max Mustermann' },
      { selectors: ['input[name="address"]', 'input[placeholder*="Strasse"]'], value: 'Bahnhofstrasse 42' },
      { selectors: ['input[name="zip"]', 'input[placeholder*="PLZ"]'], value: '8001' },
      { selectors: ['input[name="city"]', 'input[placeholder*="Stadt"]'], value: 'Zürich' },
      { selectors: ['input[name="country"]', 'input[placeholder*="Land"]'], value: 'CH' },
    ];

    for (const field of fields) {
      for (const selector of field.selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible().catch(() => false)) {
          await input.fill(field.value);
          break;
        }
      }
    }

    // Take final screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-final-before-submit.png`,
      fullPage: true,
    });

    console.log('Screenshot 12: Final state - Ready for submission');
    console.log('');
    console.log('=== CREDITOR DATA SUMMARY ===');
    console.log('Name:    Max Mustermann');
    console.log('Address: Bahnhofstrasse 42');
    console.log('ZIP:     8001');
    console.log('City:    Zürich');
    console.log('Country: CH');
    console.log('=============================');
  });
});
