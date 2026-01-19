import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests: Accounting Page - Complete Test Suite
 *
 * Tests for Summary and Detailed balance sheet views.
 * - Summary: Shows Opening Balance, Total Income, Total Expenses, Closing Balance
 * - Detailed: Breaks down income/expenses by transaction type with counts
 *
 * Uses REAL API - no mocking!
 * Screenshots WITHOUT masking - all values visible.
 *
 * Required env vars: ADMIN_ADDRESS, ADMIN_SIGNATURE
 */

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '';
const ADMIN_SIGNATURE = process.env.ADMIN_SIGNATURE || '';

// Bank IBANs for testing
const BANKS = {
  OLKYPAY_EUR: 'LU116060002000005040',
  MAERKI_EUR: 'CH6808573177975201814',
  MAERKI_CHF: 'CH3408573177975200001',
  RAIFFEISEN_CHF: 'CH4880808002186504370',
  YAPEAL_CHF: 'CH4883019DFXSWISSCHFX',
  YAPEAL_EUR: 'CH8583019DFXSWISSEURX',
};

// Helper: Remove webpack error overlay if present
async function removeErrorOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
    // Also remove any React error overlays
    const reactOverlay = document.querySelector('[data-reactroot]')?.querySelector('iframe');
    if (reactOverlay) reactOverlay.remove();
  });
}

// Helper: Navigate to accounting page with proper authentication
// Uses redirect parameter to ensure login completes before navigation
async function navigateToAccounting(
  page: Page,
  year: number,
  bankIban: string,
  type: 'summary' | 'detailed',
): Promise<void> {
  const redirectUrl = encodeURIComponent(`/accounting?year=${year}&bank=${bankIban}&type=${type}`);
  await page.goto(`/?address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}&redirect=${redirectUrl}`);
  await page.waitForLoadState('networkidle');

  // Wait for accounting page to load (check for heading)
  await page.waitForSelector('h1:has-text("DFX Accounting Report")', { timeout: 15000 });

  // Extra wait for React state to fully initialize
  await page.waitForTimeout(1000);
}

// Helper: Wait for app to be fully loaded
async function waitForAppLoaded(page: Page): Promise<void> {
  // Wait for network to be idle and page to settle
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// Helper: Wait for Summary balance sheet to load
async function waitForBalanceSheet(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="balance-sheet"]', { state: 'visible', timeout: 15000 });
  // Wait for loading to complete
  await page.waitForFunction(() => {
    const sheet = document.querySelector('[data-testid="balance-sheet"]');
    return sheet && !sheet.textContent?.includes('Loading');
  }, { timeout: 10000 });
}

// Helper: Wait for Detailed view to load
async function waitForDetailedView(page: Page): Promise<void> {
  // First, ensure the Type dropdown shows "Detailed" is selected
  await page.waitForFunction(() => {
    const selects = document.querySelectorAll('select');
    // Type dropdown is the 3rd select (index 2)
    const typeSelect = selects[2];
    return typeSelect && (typeSelect as HTMLSelectElement).value === 'detailed';
  }, { timeout: 10000 });

  // Wait for the detailed view element to appear
  // It only renders when selectedType==='detailed' AND (detailedBalanceSheet || isDetailedLoading)
  await page.waitForSelector('[data-testid="detailed-view"]', { state: 'visible', timeout: 20000 });

  // Wait for loading to complete (no "Loading..." text)
  await page.waitForFunction(() => {
    const view = document.querySelector('[data-testid="detailed-view"]');
    return view && !view.textContent?.includes('Loading');
  }, { timeout: 15000 });
}

// Helper: Take screenshot without any overlays
async function takeCleanScreenshot(page: Page, name: string): Promise<void> {
  await removeErrorOverlay(page);
  await page.waitForTimeout(500); // Let animations settle
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: 'disabled',
  });
}

test.describe('Accounting Page - Complete E2E Tests', () => {
  test.beforeAll(() => {
    if (!ADMIN_ADDRESS || !ADMIN_SIGNATURE) {
      throw new Error('ADMIN_ADDRESS and ADMIN_SIGNATURE must be set in .env');
    }
  });

  // ============================================================
  // SUMMARY VIEW TESTS - T-Account with Opening/Income/Expenses/Closing
  // ============================================================
  test.describe('Summary View - T-Account Balance Sheet', () => {
    test('Summary: Raiffeisen CHF 2025 - All values visible', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();

      // Verify IBAN is displayed
      await expect(balanceSheet).toContainText(BANKS.RAIFFEISEN_CHF);

      // Verify all T-Account rows are present
      await expect(page.locator('[data-testid="row-opening"]')).toContainText('Opening Balance');
      await expect(page.locator('[data-testid="row-income"]')).toContainText('Total Income');
      await expect(page.locator('[data-testid="row-expenses"]')).toContainText('Total Expenses');

      // Verify values are displayed (not masked)
      await expect(page.locator('[data-testid="opening-balance"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-income"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-expenses"]')).toBeVisible();
      await expect(page.locator('[data-testid="closing-balance"]')).toBeVisible();

      // Verify table headers
      await expect(balanceSheet).toContainText('Debit');
      await expect(balanceSheet).toContainText('Credit');

      await takeCleanScreenshot(page, 'summary-01-raiffeisen-chf-2025.png');
    });

    test('Summary: Maerki Baumann EUR 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.MAERKI_EUR, 'summary');
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.MAERKI_EUR);

      await takeCleanScreenshot(page, 'summary-02-maerki-eur-2025.png');
    });

    test('Summary: Maerki Baumann CHF 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.MAERKI_CHF, 'summary');
      await waitForBalanceSheet(page);

      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'summary-03-maerki-chf-2025.png');
    });

    test('Summary: Yapeal CHF 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.YAPEAL_CHF, 'summary');
      await waitForBalanceSheet(page);

      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'summary-04-yapeal-chf-2025.png');
    });

    test('Summary: Yapeal EUR 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.YAPEAL_EUR, 'summary');
      await waitForBalanceSheet(page);

      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'summary-05-yapeal-eur-2025.png');
    });

    test('Summary: Olkypay EUR 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.OLKYPAY_EUR, 'summary');
      await waitForBalanceSheet(page);

      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'summary-06-olkypay-eur-2025.png');
    });

    // 2024 Tests
    test('Summary: Raiffeisen CHF 2024', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'summary-07-raiffeisen-chf-2024.png');
    });

    test('Summary: Maerki EUR 2024', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.MAERKI_EUR, 'summary');
      await waitForBalanceSheet(page);

      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'summary-08-maerki-eur-2024.png');
    });
  });

  // ============================================================
  // DETAILED VIEW TESTS - Income/Expenses broken down by Type
  // ============================================================
  test.describe('Detailed View - Type Breakdown', () => {
    test('Detailed: Raiffeisen CHF 2025 - Structure verification', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'detailed');
      await waitForDetailedView(page);

      const detailedView = page.locator('[data-testid="detailed-view"]');
      await expect(detailedView).toBeVisible();

      // Verify IBAN header
      await expect(detailedView).toContainText(BANKS.RAIFFEISEN_CHF);

      // Verify table headers with Count column
      await expect(detailedView).toContainText('Count');
      await expect(detailedView).toContainText('Debit');
      await expect(detailedView).toContainText('Credit');

      // Verify section headers
      await expect(detailedView).toContainText('Opening Balance');
      await expect(detailedView).toContainText('Income by Type');
      await expect(detailedView).toContainText('Total Income');
      await expect(detailedView).toContainText('Expenses by Type');
      await expect(detailedView).toContainText('Total Expenses');
      await expect(detailedView).toContainText('Total');
      await expect(detailedView).toContainText('Balance');

      await takeCleanScreenshot(page, 'detailed-01-raiffeisen-chf-2025.png');
    });

    test('Detailed: Maerki EUR 2025 - Type breakdown visible', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.MAERKI_EUR, 'detailed');
      await waitForDetailedView(page);

      const detailedView = page.locator('[data-testid="detailed-view"]');
      await expect(detailedView).toBeVisible();
      await expect(detailedView).toContainText(BANKS.MAERKI_EUR);

      // Check for transaction types (BuyCrypto, BuyFiat, etc.)
      const tableContent = await detailedView.textContent();
      // At least one type should be present
      expect(
        tableContent?.includes('BuyCrypto') ||
        tableContent?.includes('BuyFiat') ||
        tableContent?.includes('Unknown')
      ).toBeTruthy();

      await takeCleanScreenshot(page, 'detailed-02-maerki-eur-2025.png');
    });

    test('Detailed: Maerki CHF 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.MAERKI_CHF, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-03-maerki-chf-2025.png');
    });

    test('Detailed: Yapeal CHF 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.YAPEAL_CHF, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-04-yapeal-chf-2025.png');
    });

    test('Detailed: Yapeal EUR 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.YAPEAL_EUR, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-05-yapeal-eur-2025.png');
    });

    test('Detailed: Olkypay EUR 2025', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.OLKYPAY_EUR, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-06-olkypay-eur-2025.png');
    });

    // 2024 Tests
    test('Detailed: Raiffeisen CHF 2024', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.RAIFFEISEN_CHF, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-07-raiffeisen-chf-2024.png');
    });

    test('Detailed: Maerki EUR 2024', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.MAERKI_EUR, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-08-maerki-eur-2024.png');
    });

    test('Detailed: Olkypay EUR 2024', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.OLKYPAY_EUR, 'detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'detailed-09-olkypay-eur-2024.png');
    });
  });

  // ============================================================
  // VIEW SWITCHING TESTS
  // ============================================================
  test.describe('View Switching - Summary <-> Detailed', () => {
    test('Switch from Summary to Detailed via dropdown', async ({ page }) => {
      // Start with Summary
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      // Verify Summary view
      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await takeCleanScreenshot(page, 'switch-01-start-summary.png');

      // Find and change type dropdown (third select element)
      const typeDropdown = page.locator('select').nth(2);
      await typeDropdown.selectOption('detailed');

      // Wait for Detailed view
      await waitForDetailedView(page);
      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="balance-sheet"]')).not.toBeVisible();

      await takeCleanScreenshot(page, 'switch-02-after-to-detailed.png');
    });

    test('Switch from Detailed to Summary via dropdown', async ({ page }) => {
      // Start with Detailed
      await navigateToAccounting(page, 2025, BANKS.MAERKI_EUR, 'detailed');
      await waitForDetailedView(page);

      // Verify Detailed view
      await expect(page.locator('[data-testid="detailed-view"]')).toBeVisible();
      await takeCleanScreenshot(page, 'switch-03-start-detailed.png');

      // Switch to Summary
      const typeDropdown = page.locator('select').nth(2);
      await typeDropdown.selectOption('summary');

      // Wait for Summary view
      await waitForBalanceSheet(page);
      await expect(page.locator('[data-testid="balance-sheet"]')).toBeVisible();
      await expect(page.locator('[data-testid="detailed-view"]')).not.toBeVisible();

      await takeCleanScreenshot(page, 'switch-04-after-to-summary.png');
    });
  });

  // ============================================================
  // DROPDOWN FILTER TESTS
  // ============================================================
  test.describe('Dropdown Filters', () => {
    test('Change Year dropdown - 2025 to 2024', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      await takeCleanScreenshot(page, 'filter-01-year-2025.png');

      // Change year to 2024
      const yearDropdown = page.locator('select').nth(0);
      await yearDropdown.selectOption('2024');
      await page.waitForTimeout(1000);
      await waitForBalanceSheet(page);

      await takeCleanScreenshot(page, 'filter-02-year-2024.png');
    });

    test('Change Bank dropdown', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      // Verify Raiffeisen
      await expect(page.locator('[data-testid="balance-sheet"]')).toContainText(BANKS.RAIFFEISEN_CHF);
      await takeCleanScreenshot(page, 'filter-03-bank-raiffeisen.png');

      // Change to Maerki EUR
      const bankDropdown = page.locator('select').nth(1);
      await bankDropdown.selectOption(BANKS.MAERKI_EUR);
      await page.waitForTimeout(1000);
      await waitForBalanceSheet(page);

      // Verify Maerki
      await expect(page.locator('[data-testid="balance-sheet"]')).toContainText(BANKS.MAERKI_EUR);
      await takeCleanScreenshot(page, 'filter-04-bank-maerki.png');
    });

    test('Change all filters: Year, Bank, Type', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      await takeCleanScreenshot(page, 'filter-05-initial.png');

      // Change Year
      await page.locator('select').nth(0).selectOption('2024');
      await page.waitForTimeout(500);

      // Change Bank
      await page.locator('select').nth(1).selectOption(BANKS.YAPEAL_EUR);
      await page.waitForTimeout(500);

      // Change Type
      await page.locator('select').nth(2).selectOption('detailed');
      await waitForDetailedView(page);

      await expect(page.locator('[data-testid="detailed-view"]')).toContainText(BANKS.YAPEAL_EUR);
      await takeCleanScreenshot(page, 'filter-06-all-changed.png');
    });
  });

  // ============================================================
  // VALIDATION MESSAGE TESTS
  // ============================================================
  test.describe('Validation Messages', () => {
    test('Summary: Check validation message presence', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.RAIFFEISEN_CHF, 'summary');
      await waitForBalanceSheet(page);

      // Check if validation message exists (depends on whether defined balance exists)
      const validationMessage = page.locator('[data-testid="validation-message"]');
      const hasValidation = await validationMessage.count() > 0;

      if (hasValidation) {
        await expect(validationMessage).toBeVisible();
        const text = await validationMessage.textContent();
        // Should contain match status
        expect(text).toMatch(/matches|does not match/i);
        await takeCleanScreenshot(page, 'validation-01-summary-message.png');
      }
    });

    test('Detailed: Check validation message presence', async ({ page }) => {
      await navigateToAccounting(page, 2024, BANKS.RAIFFEISEN_CHF, 'detailed');
      await waitForDetailedView(page);

      const validationMessage = page.locator('[data-testid="validation-message"]');
      const hasValidation = await validationMessage.count() > 0;

      if (hasValidation) {
        await expect(validationMessage).toBeVisible();
        await takeCleanScreenshot(page, 'validation-02-detailed-message.png');
      }
    });
  });

  // ============================================================
  // UI STRUCTURE TESTS
  // ============================================================
  test.describe('UI Structure Verification', () => {
    test('Page title and header visible', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');

      // Check for page title
      await expect(page.locator('h1')).toContainText('DFX Accounting Report');

      await takeCleanScreenshot(page, 'ui-01-page-header.png');
    });

    test('All three filter dropdowns visible', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.RAIFFEISEN_CHF, 'summary');

      // Verify filter dropdowns exist (at least 3 for Year, Bank, Type)
      const dropdowns = page.locator('select');
      const count = await dropdowns.count();
      expect(count).toBeGreaterThanOrEqual(3);

      // Verify labels for the filter dropdowns (using exact match to avoid matching option values)
      await expect(page.getByText('Year', { exact: true })).toBeVisible();
      await expect(page.getByText('Bank', { exact: true })).toBeVisible();
      await expect(page.getByText('Type', { exact: true })).toBeVisible();

      await takeCleanScreenshot(page, 'ui-02-filter-dropdowns.png');
    });

    test('Summary view table structure', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.MAERKI_EUR, 'summary');
      await waitForBalanceSheet(page);

      // There are 2 tables: IBAN header table (index 0) and main T-account table (index 1)
      const mainTable = page.locator('[data-testid="balance-sheet"] table').nth(1);
      await expect(mainTable).toBeVisible();

      // Verify header row
      const headers = mainTable.locator('thead th');
      await expect(headers).toHaveCount(3); // Empty, Debit, Credit

      // Verify body rows exist
      const rows = mainTable.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(5); // Opening, Income, Expenses, Total, Balance

      await takeCleanScreenshot(page, 'ui-03-summary-table.png');
    });

    test('Detailed view table structure with Count column', async ({ page }) => {
      await navigateToAccounting(page, 2025, BANKS.MAERKI_EUR, 'detailed');
      await waitForDetailedView(page);

      // There are 2 tables: IBAN header table (index 0) and main T-account table (index 1)
      const mainTable = page.locator('[data-testid="detailed-view"] table').nth(1);
      await expect(mainTable).toBeVisible();

      // Verify header has 4 columns (Empty, Count, Debit, Credit)
      const headers = mainTable.locator('thead th');
      await expect(headers).toHaveCount(4);

      // Verify Count header exists
      await expect(mainTable.locator('thead')).toContainText('Count');

      await takeCleanScreenshot(page, 'ui-04-detailed-table.png');
    });
  });

  // ============================================================
  // COMPARISON: Same Bank/Year - Summary vs Detailed
  // ============================================================
  test.describe('Summary vs Detailed Comparison', () => {
    test('Compare Summary and Detailed for Maerki EUR 2025', async ({ page }) => {
      // Summary view
      await navigateToAccounting(page, 2025, BANKS.MAERKI_EUR, 'summary');
      await waitForBalanceSheet(page);
      await takeCleanScreenshot(page, 'compare-01-maerki-2025-summary.png');

      // Get summary values
      const summaryIncome = await page.locator('[data-testid="total-income"]').textContent();
      const summaryExpenses = await page.locator('[data-testid="total-expenses"]').textContent();
      const summaryBalance = await page.locator('[data-testid="closing-balance"]').textContent();

      // Switch to Detailed
      await page.locator('select').nth(2).selectOption('detailed');
      await waitForDetailedView(page);
      await takeCleanScreenshot(page, 'compare-02-maerki-2025-detailed.png');

      // Detailed view should show same totals (visual verification via screenshots)
      const detailedView = page.locator('[data-testid="detailed-view"]');
      await expect(detailedView).toContainText('Total Income');
      await expect(detailedView).toContainText('Total Expenses');
    });
  });
});
