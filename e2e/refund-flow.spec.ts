import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Visual Regression Tests: Complete Bank Refund Flow
 *
 * Tests the ENTIRE refund process from start to finish:
 * 1. View transaction list
 * 2. Click on transaction to see details
 * 3. Click REQUEST REFUND button
 * 4. See refund page with fixed IBAN/name and empty address fields
 * 5. Fill in address data (street, house nr, zip, city, country)
 * 6. Submit refund request
 * 7. Verify status changes to "Return pending"
 */

const TEST_TX_ID = process.env.TEST_TX_ID || '11';

test.describe('Bank Refund Flow - Complete E2E Test', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('Complete refund flow from start to finish', async ({ page }) => {
    // ========================================
    // STEP 1: Transaction list
    // ========================================
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Your Transactions')).toBeVisible();
    await expect(page).toHaveScreenshot('01-transaction-list.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 2: Click on transaction to expand details
    // ========================================
    await page.goto(`/tx/${TEST_TX_ID}?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Payment method')).toBeVisible();
    await expect(page.getByText('REQUEST REFUND')).toBeVisible();
    await expect(page).toHaveScreenshot('02-transaction-details.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 3: Click REQUEST REFUND button
    // ========================================
    await page.getByText('REQUEST REFUND').click();
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

    await expect(page).toHaveScreenshot('03-refund-page-empty.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 5: Fill address data
    // ========================================
    await page.getByPlaceholder('Street').fill('Bahnhofstrasse');
    await page.getByPlaceholder('xx').fill('10');
    await page.getByPlaceholder('12345').fill('8001');
    await page.getByPlaceholder('City').fill('Zürich');

    await expect(page).toHaveScreenshot('04-refund-address-filled.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 6: Select country from dropdown
    // ========================================
    // Click on the arrow/chevron icon in the country dropdown area
    // The dropdown is below the "Country" label
    await page.locator('svg').last().click();
    await page.waitForTimeout(1000);

    // Type to search for Switzerland
    await page.keyboard.type('Switz');
    await page.waitForTimeout(500);

    // Click on Switzerland option in the list
    await page.getByText('Switzerland').first().click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('05-refund-country-selected.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 7: Submit refund request
    // ========================================
    const submitButton = page.locator('button:has-text("REQUEST REFUND")');
    await expect(submitButton).toBeEnabled();

    await expect(page).toHaveScreenshot('06-before-submit.png', {
      fullPage: true,
      timeout: 10000,
    });

    await submitButton.click();
    await page.waitForTimeout(5000);

    // ========================================
    // STEP 8: Verify redirect to transaction list
    // ========================================
    await expect(page).toHaveScreenshot('07-after-submit.png', {
      fullPage: true,
      timeout: 10000,
    });

    // ========================================
    // STEP 9: Verify status changed to pending
    // ========================================
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Status should now show "Return pending" or similar
    const pendingStatus = page.getByText(/Return pending|Refund pending/);
    await expect(pendingStatus).toBeVisible();

    await expect(page).toHaveScreenshot('08-refund-pending-status.png', {
      fullPage: true,
      timeout: 10000,
    });
  });
});
