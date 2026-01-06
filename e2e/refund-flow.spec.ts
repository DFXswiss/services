import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Visual Regression Tests: Complete Bank Refund Flow
 *
 * Tests the entire refund process from transaction list to successful submission.
 * Creates baseline screenshots for visual regression testing.
 */

const TEST_TX_ID = process.env.TEST_TX_ID || '11';

test.describe('Bank Refund Flow - Visual Regression', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('01 - Transaction list with failed transaction', async ({ page }) => {
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

  test('02 - Click on failed transaction to see details', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify transaction details page
    await expect(page.getByText('Transaction status')).toBeVisible();

    // Take baseline screenshot
    await expect(page).toHaveScreenshot('refund-flow-02-transaction-details.png', {
      fullPage: true,
      timeout: 10000,
    });
  });

  test('03 - Refund page with fixed IBAN and name', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify refund page elements
    await expect(page.getByText('Transaction refund')).toBeVisible();
    await expect(page.getByText('Transaction amount', { exact: true })).toBeVisible();
    await expect(page.getByText('Refund amount', { exact: true })).toBeVisible();
    await expect(page.getByText('Name', { exact: true })).toBeVisible();
    await expect(page.getByText('IBAN', { exact: true })).toBeVisible();

    // Verify NO input fields (IBAN and name should be fixed)
    const selectDropdown = page.locator('text=Select...').first();
    await expect(selectDropdown).not.toBeVisible();

    const nameInput = page.locator('input[name="creditorName"]').first();
    expect(await nameInput.isVisible().catch(() => false)).toBe(false);

    // Verify REQUEST REFUND button is enabled
    const submitButton = page.locator('button:has-text("REQUEST REFUND")');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Take baseline screenshot
    await expect(page).toHaveScreenshot('refund-flow-03-refund-page.png', {
      fullPage: true,
      timeout: 10000,
    });
  });

  test('04 - Submit refund request', async ({ page }) => {
    await page.goto(`/tx/${TEST_TX_ID}/refund?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Click REQUEST REFUND button
    const submitButton = page.locator('button:has-text("REQUEST REFUND")');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for navigation/response
    await page.waitForTimeout(5000);

    // Take screenshot after submit
    await expect(page).toHaveScreenshot('refund-flow-04-after-submit.png', {
      fullPage: true,
      timeout: 10000,
    });
  });

  test('05 - Transaction shows refund pending status', async ({ page }) => {
    // Navigate to transaction list to verify status change
    await page.goto(`/tx?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify "Refund pending" status is visible
    const refundPending = page.getByText('Refund pending');
    await expect(refundPending).toBeVisible();

    // Take baseline screenshot
    await expect(page).toHaveScreenshot('refund-flow-05-refund-pending.png', {
      fullPage: true,
      timeout: 10000,
    });
  });
});
