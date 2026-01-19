import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests: Accounting Page - T-Account Balance Sheet
 *
 * Tests use the REAL API - no mocking allowed!
 *
 * Visual documentation of the accounting balance flow:
 * 1. Open accounting page
 * 2. Select year 2025
 * 3. Select bank "Maerki Baumann (CHF)"
 * 4. Verify T-account display with:
 *    - Anfangsbestand (Opening Balance)
 *    - Alle Einnahmen (Total Income)
 *    - Alle Ausgaben (Total Expenses)
 *    - Total row
 *    - Saldo (Closing Balance)
 *    - Validation message
 *
 * Each step produces a baseline screenshot for visual regression testing.
 *
 * Required env vars: ADMIN_ADDRESS, ADMIN_SIGNATURE
 */

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '';
const ADMIN_SIGNATURE = process.env.ADMIN_SIGNATURE || '';

// Bank IBANs for selection
const MAERKI_CHF_IBAN = 'CH3408573177975200001';
const MAERKI_EUR_IBAN = 'CH6808573177975201814';
const RAIFFEISEN_CHF_IBAN = 'CH4880808002186504370';

async function removeErrorOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
}

async function waitForAppLoaded(page: Page): Promise<void> {
  await page.waitForTimeout(3000);
}

async function waitForBalanceSheet(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="balance-sheet"]', { state: 'visible', timeout: 10000 });
}

test.describe('Accounting Page - T-Account Balance Sheet (Real API)', () => {
  test.beforeAll(() => {
    if (!ADMIN_ADDRESS || !ADMIN_SIGNATURE) {
      throw new Error('ADMIN_ADDRESS and ADMIN_SIGNATURE must be set in .env');
    }
  });

  test.describe('Step-by-Step Flow: Maerki Baumann CHF 2025', () => {
    /**
     * Step 1: Open the accounting page
     * - Page loads with admin authentication
     * - Shows title "DFX Accounting Report"
     * - First bank is auto-selected
     * - Balance sheet loads automatically
     */
    test('Step 1: Open accounting page - auto-loads first bank', async ({ page }) => {
      await page.goto(`/accounting?address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      // Verify page title is visible
      await expect(page.locator('h1')).toContainText('DFX Accounting Report');

      // Verify dropdowns are visible
      const yearSelect = page.locator('select').first();
      const bankSelect = page.locator('select').nth(1);
      await expect(yearSelect).toBeVisible();
      await expect(bankSelect).toBeVisible();

      // Wait for balance sheet to load (first bank is auto-selected)
      await waitForBalanceSheet(page);

      // Balance sheet should be visible (first bank auto-selected)
      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Capture baseline screenshot
      await expect(page).toHaveScreenshot('01-accounting-page-opened.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    /**
     * Step 2: Select Maerki Baumann CHF and year 2025
     * - T-Account table appears with real data from API
     */
    test('Step 2: Select Maerki Baumann CHF 2025 - shows T-account', async ({ page }) => {
      await page.goto(`/accounting?address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      // Select year 2025
      const yearSelect = page.locator('select').first();
      await yearSelect.selectOption('2025');
      await page.waitForTimeout(300);

      // Select Maerki Baumann (CHF) by IBAN
      const bankSelect = page.locator('select').nth(1);
      await bankSelect.selectOption(MAERKI_CHF_IBAN);

      // Wait for balance sheet to load from real API
      await waitForBalanceSheet(page);

      // Verify bank is selected
      await expect(bankSelect).toHaveValue(MAERKI_CHF_IBAN);

      // Verify T-account is visible
      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Verify IBAN is displayed
      await expect(balanceSheet).toContainText(MAERKI_CHF_IBAN);

      // Verify opening balance is displayed (value from yearlyBalances in DB)
      const openingBalance = page.locator('[data-testid="opening-balance"]');
      await expect(openingBalance).toBeVisible();

      // Verify total income is displayed
      const totalIncome = page.locator('[data-testid="total-income"]');
      await expect(totalIncome).toBeVisible();

      // Verify total expenses is displayed
      const totalExpenses = page.locator('[data-testid="total-expenses"]');
      await expect(totalExpenses).toBeVisible();

      // Verify closing balance (Saldo) is displayed
      const closingBalance = page.locator('[data-testid="closing-balance"]');
      await expect(closingBalance).toBeVisible();

      // Capture baseline screenshot with T-account data
      await expect(page).toHaveScreenshot('02-maerki-chf-t-account-displayed.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Additional Balance Scenarios', () => {
    /**
     * Maerki Baumann EUR 2025
     */
    test('Maerki Baumann EUR 2025 T-account', async ({ page }) => {
      await page.goto(`/accounting?address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      const yearSelect = page.locator('select').first();
      await yearSelect.selectOption('2025');

      const bankSelect = page.locator('select').nth(1);
      await bankSelect.selectOption(MAERKI_EUR_IBAN);

      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Verify IBAN is displayed
      await expect(balanceSheet).toContainText(MAERKI_EUR_IBAN);

      // Verify opening balance is displayed
      const openingBalance = page.locator('[data-testid="opening-balance"]');
      await expect(openingBalance).toBeVisible();

      // Verify closing balance is displayed
      const closingBalance = page.locator('[data-testid="closing-balance"]');
      await expect(closingBalance).toBeVisible();

      await expect(page).toHaveScreenshot('03-maerki-eur-t-account-displayed.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    /**
     * Raiffeisen CHF 2025
     */
    test('Raiffeisen CHF 2025 T-account', async ({ page }) => {
      await page.goto(`/accounting?address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      const yearSelect = page.locator('select').first();
      await yearSelect.selectOption('2025');

      const bankSelect = page.locator('select').nth(1);
      await bankSelect.selectOption(RAIFFEISEN_CHF_IBAN);

      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Verify IBAN is displayed
      await expect(balanceSheet).toContainText(RAIFFEISEN_CHF_IBAN);

      // Verify opening balance is displayed
      const openingBalance = page.locator('[data-testid="opening-balance"]');
      await expect(openingBalance).toBeVisible();

      // Verify closing balance is displayed
      const closingBalance = page.locator('[data-testid="closing-balance"]');
      await expect(closingBalance).toBeVisible();

      await expect(page).toHaveScreenshot('04-raiffeisen-chf-t-account-displayed.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    /**
     * Year 2024 - test with different year
     */
    test('Year 2024 - balance sheet loads', async ({ page }) => {
      await page.goto(`/accounting?address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      // Select year 2024
      const yearSelect = page.locator('select').first();
      await yearSelect.selectOption('2024');

      // Select Raiffeisen
      const bankSelect = page.locator('select').nth(1);
      await bankSelect.selectOption(RAIFFEISEN_CHF_IBAN);

      await waitForBalanceSheet(page);

      // Balance sheet should be visible
      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Verify opening and closing balance are displayed
      const openingBalance = page.locator('[data-testid="opening-balance"]');
      await expect(openingBalance).toBeVisible();

      const closingBalance = page.locator('[data-testid="closing-balance"]');
      await expect(closingBalance).toBeVisible();

      await expect(page).toHaveScreenshot('05-year-2024-balance-sheet.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Direct URL with Preselected Parameters', () => {
    /**
     * Test direct URL access with year and bank preselected via URL params
     * URL format: /accounting?year=2025&bank=CH3408573177975200001&address=...&signature=...
     *
     * Expected behavior:
     * - Year dropdown shows 2025
     * - Bank dropdown shows "Maerki Baumann (CHF)"
     * - T-account balance sheet loads automatically from real API
     */
    test('Direct link with year=2025 and bank=Maerki Baumann CHF', async ({ page }) => {
      // Navigate using direct URL with all parameters preselected
      const directUrl = `/accounting?year=2025&bank=${MAERKI_CHF_IBAN}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`;
      await page.goto(directUrl);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      // Verify page title
      await expect(page.locator('h1')).toContainText('DFX Accounting Report');

      // Verify year is preselected to 2025
      const yearSelect = page.locator('select').first();
      await expect(yearSelect).toHaveValue('2025');

      // Verify bank is preselected to Maerki Baumann CHF
      const bankSelect = page.locator('select').nth(1);
      await expect(bankSelect).toHaveValue(MAERKI_CHF_IBAN);

      // Wait for balance sheet to load from real API
      await waitForBalanceSheet(page);

      // Verify T-account balance sheet is visible (auto-loaded)
      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Verify IBAN is displayed in balance sheet
      await expect(balanceSheet).toContainText(MAERKI_CHF_IBAN);

      // Verify opening balance is displayed
      const openingBalance = page.locator('[data-testid="opening-balance"]');
      await expect(openingBalance).toBeVisible();

      // Verify closing balance (Saldo) is displayed
      const closingBalance = page.locator('[data-testid="closing-balance"]');
      await expect(closingBalance).toBeVisible();

      // Capture screenshot of direct link result
      await expect(page).toHaveScreenshot('06-direct-link-maerki-chf-2025.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
});
