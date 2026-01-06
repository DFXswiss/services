import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Visual Regression Tests: Complete Bank Refund Flow
 *
 * Tests the entire refund process from transaction list to successful submission.
 * Creates baseline screenshots for visual regression testing.
 *
 * Flow:
 * - IBAN and Name are displayed as fixed values (from bank transaction)
 * - User must enter address data (street, zip, city, country)
 * - User submits refund request
 */

const TEST_TX_ID = process.env.TEST_TX_ID || '11';

test.describe('Bank Refund Flow - Visual Regression', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('01 - Transaction list with unassigned transaction', async ({ page }) => {
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify transaction list loads
    await expect(page.getByText('Your Transactions')).toBeVisible();

    // Take baseline screenshot
    await expect(page).toHaveScreenshot('refund-flow-01-transaction-list.png', {
      fullPage: true,
      timeout: 10000,
    });
  });

  test('02 - Transaction details expanded in list', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify transaction is expanded in the list
    await expect(page.getByText('Your Transactions')).toBeVisible();
    // Check for transaction details
    await expect(page.getByText('Payment method')).toBeVisible();
    await expect(page.getByText('REQUEST REFUND')).toBeVisible();

    // Take baseline screenshot
    await expect(page).toHaveScreenshot('refund-flow-02-transaction-expanded.png', {
      fullPage: true,
      timeout: 10000,
    });
  });

  test('03 - Refund page with fixed IBAN/name and address input fields', async ({ page }) => {
    await page.goto(`/tx/T${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify refund page elements - fixed values
    await expect(page.getByText('Transaction refund')).toBeVisible();
    await expect(page.getByText('Transaction amount', { exact: true })).toBeVisible();
    await expect(page.getByText('Refund amount', { exact: true })).toBeVisible();

    // Verify address input fields ARE visible (user must fill these)
    await expect(page.getByPlaceholder('Street')).toBeVisible();
    await expect(page.getByPlaceholder('12345')).toBeVisible();
    await expect(page.getByPlaceholder('City')).toBeVisible();
    await expect(page.getByText('Country', { exact: true })).toBeVisible();

    // Take baseline screenshot - empty form
    await expect(page).toHaveScreenshot('refund-flow-03-refund-page-empty.png', {
      fullPage: true,
      timeout: 10000,
    });
  });

  test('04 - Fill address data (without country)', async ({ page }) => {
    await page.goto(`/tx/T${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill address fields using placeholders
    await page.getByPlaceholder('Street').fill('Bahnhofstrasse');
    await page.getByPlaceholder('xx').fill('10');
    await page.getByPlaceholder('12345').fill('8001');
    await page.getByPlaceholder('City').fill('Zürich');

    // Take screenshot with filled address fields (country not yet selected)
    await expect(page).toHaveScreenshot('refund-flow-04-refund-page-filled.png', {
      fullPage: true,
      timeout: 10000,
    });
  });
});
