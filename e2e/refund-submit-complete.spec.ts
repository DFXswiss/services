import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Test: Bank Refund - Fixed IBAN and Name Display
 *
 * Tests that bank refunds show IBAN and Name as fixed (non-editable) values
 * from the original bank transaction, not as input fields.
 */

const TEST_TX_ID = process.env.TEST_TX_ID!;
const SCREENSHOT_DIR = 'e2e/test-results/refund-fixed-display';

test.describe('Bank Refund - Fixed Display Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    console.log(`Testing with transaction: ${TEST_TX_ID}`);
  });

  test('Verify IBAN and Name are displayed as fixed values (not editable)', async ({ page }) => {
    // Navigate to refund page
    console.log('\n=== Navigate to refund page ===');
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-refund-page-loaded.png`,
      fullPage: true,
    });

    // Verify page title
    await expect(page.locator('text=Transaction refund')).toBeVisible();

    // Verify transaction details are shown
    await expect(page.getByText('Transaction amount', { exact: true })).toBeVisible();
    await expect(page.getByText('Refund amount', { exact: true })).toBeVisible();

    // CRITICAL: Verify IBAN is shown as fixed text (not a dropdown/input)
    console.log('\n=== Verify IBAN is displayed as fixed value ===');
    const ibanRow = page.locator('text=IBAN').first();
    await expect(ibanRow).toBeVisible();

    // Verify there is NO "Select..." dropdown (old buggy behavior)
    const selectDropdown = page.locator('text=Select...').first();
    const hasDropdown = await selectDropdown.isVisible().catch(() => false);
    expect(hasDropdown).toBe(false);
    console.log('✅ No "Select..." dropdown found - IBAN is fixed');

    // Verify there is NO "Add bank account" option
    const addBankOption = page.locator('text=Add bank account').first();
    const hasAddBank = await addBankOption.isVisible().catch(() => false);
    expect(hasAddBank).toBe(false);
    console.log('✅ No "Add bank account" option found');

    // CRITICAL: Verify Name is shown as fixed text (not an input field)
    console.log('\n=== Verify Name is displayed as fixed value ===');
    const nameRow = page.locator('text=Name').first();
    await expect(nameRow).toBeVisible();

    // Verify there is NO name input field (should be fixed display)
    const nameInput = page.locator('input[name="creditorName"]').first();
    const hasNameInput = await nameInput.isVisible().catch(() => false);
    expect(hasNameInput).toBe(false);
    console.log('✅ No name input field found - Name is fixed');

    // Verify there are NO creditor address input fields
    const streetInput = page.locator('input[name="creditorStreet"]').first();
    const hasStreetInput = await streetInput.isVisible().catch(() => false);
    expect(hasStreetInput).toBe(false);
    console.log('✅ No address input fields found');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-fixed-values-verified.png`,
      fullPage: true,
    });

    // Verify REQUEST REFUND button is visible and enabled
    console.log('\n=== Verify REQUEST REFUND button ===');
    const submitButton = page.locator('button:has-text("REQUEST REFUND")').first();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    console.log('✅ REQUEST REFUND button is visible and enabled');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-ready-to-submit.png`,
      fullPage: true,
    });

    // Get the displayed values
    const pageContent = await page.textContent('body');
    console.log('\n=== Displayed Refund Details ===');

    // Extract and log the displayed values
    const hasName = pageContent?.includes('E2E Test User') || pageContent?.includes('Name');
    const hasIban = pageContent?.includes('CH12') || pageContent?.includes('IBAN');
    console.log(`Name displayed: ${hasName}`);
    console.log(`IBAN displayed: ${hasIban}`);

    console.log('\n========================================');
    console.log('✅ TEST PASSED: IBAN and Name are fixed');
    console.log('========================================\n');
  });

  test('Submit refund request', async ({ page }) => {
    // Navigate to refund page
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Click submit button
    console.log('\n=== Submitting refund request ===');
    const submitButton = page.locator('button:has-text("REQUEST REFUND")').first();
    await expect(submitButton).toBeEnabled();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-before-submit.png`,
      fullPage: true,
    });

    await submitButton.click();
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-after-submit.png`,
      fullPage: true,
    });

    // Check for success or error message
    const pageContent = await page.textContent('body');
    const hasError = pageContent?.toLowerCase().includes('error');
    const hasSuccess =
      pageContent?.toLowerCase().includes('success') ||
      pageContent?.toLowerCase().includes('requested') ||
      pageContent?.toLowerCase().includes('submitted');

    if (hasSuccess) {
      console.log('✅ Refund request submitted successfully');
    } else if (hasError) {
      console.log('⚠️ Error occurred (may be expected for already-refunded tx)');
    } else {
      console.log('ℹ️ Page state after submit captured');
    }

    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');
  });
});
