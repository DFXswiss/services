import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Visual Regression Tests: BuyCrypto FAIL Refund Flow
 *
 * Tests the refund process for a failed BuyCrypto transaction (FiatOutputType.BUY_CRYPTO_FAIL):
 * 1. View transaction list with failed transaction
 * 2. Click on transaction to see details
 * 3. Click REQUEST REFUND button
 * 4. See refund page with fixed IBAN/name and empty address fields
 * 5. Fill in address data (street, house nr, zip, city, country)
 * 6. Submit refund request
 * 7. Verify status changes to "Refund pending"
 *
 * This is different from BANK_TX_RETURN:
 * - BANK_TX_RETURN: Unassigned bank transaction that couldn't be matched
 * - BUY_CRYPTO_FAIL: Failed buy crypto transaction (e.g., AML check failed)
 */

const TEST_TX_ID = process.env.BUY_CRYPTO_TX_ID!;

test.describe('BuyCrypto FAIL Refund Flow - Complete E2E Test', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('Complete BuyCrypto FAIL refund flow from start to finish', async ({ page }) => {
    // ========================================
    // STEP 1: Transaction list
    // ========================================
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Your Transactions')).toBeVisible();
    await expect(page).toHaveScreenshot('01-buy-crypto-fail-transaction-list.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 2: Click on failed transaction to see details
    // ========================================
    await page.goto(`/tx/${TEST_TX_ID}?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show "Failed" status and CONFIRM REFUND button (text is "Confirm refund" for failed transactions)
    await expect(page.getByText('Payment method')).toBeVisible();
    await expect(page.getByText('CONFIRM REFUND')).toBeVisible();
    await expect(page).toHaveScreenshot('02-buy-crypto-fail-transaction-details.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 3: Click CONFIRM REFUND button
    // ========================================
    await page.getByText('CONFIRM REFUND').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // ========================================
    // STEP 4: Refund page with empty address fields
    // ========================================
    await expect(page.getByText('Transaction refund')).toBeVisible();

    // Verify IBAN and Name are FIXED (displayed as text, not inputs)
    await expect(page.getByText('Name', { exact: true })).toBeVisible();
    await expect(page.getByText('IBAN', { exact: true })).toBeVisible();

    // Verify address input fields are visible
    await expect(page.getByPlaceholder('Street')).toBeVisible();
    await expect(page.getByPlaceholder('12345')).toBeVisible();
    await expect(page.getByPlaceholder('City')).toBeVisible();

    await expect(page).toHaveScreenshot('03-buy-crypto-fail-refund-page-empty.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 5: Fill address data
    // ========================================
    await page.getByPlaceholder('Street').fill('Hauptstrasse');
    await page.getByPlaceholder('xx').fill('25');
    await page.getByPlaceholder('12345').fill('3000');
    await page.getByPlaceholder('City').fill('Bern');

    await expect(page).toHaveScreenshot('04-buy-crypto-fail-address-filled.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 6: Select country from dropdown
    // ========================================
    // Click on the arrow/chevron icon in the country dropdown area
    await page.locator('svg').last().click();
    await page.waitForTimeout(1000);

    // Type to search for Switzerland
    await page.keyboard.type('Switz');
    await page.waitForTimeout(500);

    // Click on Switzerland option in the list
    await page.getByText('Switzerland').first().click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('05-buy-crypto-fail-country-selected.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 7: Submit refund request
    // ========================================
    const submitButton = page.locator('button:has-text("CONFIRM REFUND")');
    await expect(submitButton).toBeEnabled();

    await expect(page).toHaveScreenshot('06-buy-crypto-fail-before-submit.png', {
      fullPage: true,
      timeout: 10000,
    });

    await submitButton.click();
    await page.waitForTimeout(5000);

    // ========================================
    // STEP 8: Verify redirect to transaction list
    // ========================================
    await expect(page).toHaveScreenshot('07-buy-crypto-fail-after-submit.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 9: Verify status changed to pending
    // ========================================
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Status should now show "Refund pending" - use first() since there may be multiple transactions
    const pendingStatus = page.getByText(/Return pending|Refund pending/).first();
    await expect(pendingStatus).toBeVisible();

    await expect(page).toHaveScreenshot('08-buy-crypto-fail-refund-pending-status.png', {
      fullPage: true,
      timeout: 10000,
    });
  });
});
