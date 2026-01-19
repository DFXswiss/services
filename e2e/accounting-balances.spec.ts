import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests: Accounting Page - T-Account Balance Sheet
 *
 * Tests all active banks for years 2024 and 2025.
 * Uses the REAL API - no mocking allowed!
 *
 * Required env vars: ADMIN_ADDRESS, ADMIN_SIGNATURE
 */

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '';
const ADMIN_SIGNATURE = process.env.ADMIN_SIGNATURE || '';

// Bank IBANs
const BANKS = {
  OLKYPAY_EUR: 'LU116060002000005040',
  MAERKI_EUR: 'CH6808573177975201814',
  MAERKI_CHF: 'CH3408573177975200001',
  RAIFFEISEN_CHF: 'CH4880808002186504370',
  YAPEAL_CHF: 'CH4883019DFXSWISSCHFX',
  YAPEAL_EUR: 'CH8583019DFXSWISSEURX',
};

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

// Dynamic values that change with new transactions - mask in screenshots
// Note: Saldo (closing-balance) is NOT masked - it should be visible for verification
function getDynamicValueMasks(page: Page) {
  return [
    page.locator('[data-testid="total-income"]'),
    page.locator('[data-testid="total-expenses"]'),
    page.locator('[data-testid="total-soll"]'),
    page.locator('[data-testid="total-haben"]'),
  ];
}

test.describe('Accounting Page - Balance Sheets (Real API)', () => {
  test.beforeAll(() => {
    if (!ADMIN_ADDRESS || !ADMIN_SIGNATURE) {
      throw new Error('ADMIN_ADDRESS and ADMIN_SIGNATURE must be set in .env');
    }
  });

  // ========== 2024 ==========
  test.describe('2024 Balance Sheets', () => {
    test('Olkypay EUR 2024', async ({ page }) => {
      await page.goto(`/accounting?year=2024&bank=${BANKS.OLKYPAY_EUR}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.OLKYPAY_EUR);

      await expect(page).toHaveScreenshot('01-olkypay-eur-2024.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Maerki Baumann EUR 2024', async ({ page }) => {
      await page.goto(`/accounting?year=2024&bank=${BANKS.MAERKI_EUR}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.MAERKI_EUR);

      await expect(page).toHaveScreenshot('02-maerki-eur-2024.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Maerki Baumann CHF 2024', async ({ page }) => {
      await page.goto(`/accounting?year=2024&bank=${BANKS.MAERKI_CHF}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.MAERKI_CHF);

      await expect(page).toHaveScreenshot('03-maerki-chf-2024.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Raiffeisen CHF 2024', async ({ page }) => {
      await page.goto(`/accounting?year=2024&bank=${BANKS.RAIFFEISEN_CHF}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.RAIFFEISEN_CHF);

      await expect(page).toHaveScreenshot('04-raiffeisen-chf-2024.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Yapeal CHF 2024', async ({ page }) => {
      await page.goto(`/accounting?year=2024&bank=${BANKS.YAPEAL_CHF}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.YAPEAL_CHF);

      await expect(page).toHaveScreenshot('05-yapeal-chf-2024.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Yapeal EUR 2024', async ({ page }) => {
      await page.goto(`/accounting?year=2024&bank=${BANKS.YAPEAL_EUR}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.YAPEAL_EUR);

      await expect(page).toHaveScreenshot('06-yapeal-eur-2024.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });
  });

  // ========== 2025 ==========
  test.describe('2025 Balance Sheets', () => {
    test('Olkypay EUR 2025', async ({ page }) => {
      await page.goto(`/accounting?year=2025&bank=${BANKS.OLKYPAY_EUR}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.OLKYPAY_EUR);

      await expect(page).toHaveScreenshot('07-olkypay-eur-2025.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Maerki Baumann EUR 2025', async ({ page }) => {
      await page.goto(`/accounting?year=2025&bank=${BANKS.MAERKI_EUR}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.MAERKI_EUR);

      await expect(page).toHaveScreenshot('08-maerki-eur-2025.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Maerki Baumann CHF 2025', async ({ page }) => {
      await page.goto(`/accounting?year=2025&bank=${BANKS.MAERKI_CHF}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.MAERKI_CHF);

      await expect(page).toHaveScreenshot('09-maerki-chf-2025.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Raiffeisen CHF 2025', async ({ page }) => {
      await page.goto(`/accounting?year=2025&bank=${BANKS.RAIFFEISEN_CHF}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.RAIFFEISEN_CHF);

      await expect(page).toHaveScreenshot('10-raiffeisen-chf-2025.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Yapeal CHF 2025', async ({ page }) => {
      await page.goto(`/accounting?year=2025&bank=${BANKS.YAPEAL_CHF}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.YAPEAL_CHF);

      await expect(page).toHaveScreenshot('11-yapeal-chf-2025.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });

    test('Yapeal EUR 2025', async ({ page }) => {
      await page.goto(`/accounting?year=2025&bank=${BANKS.YAPEAL_EUR}&address=${ADMIN_ADDRESS}&signature=${ADMIN_SIGNATURE}`);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);
      await waitForBalanceSheet(page);

      const balanceSheet = page.locator('[data-testid="balance-sheet"]');
      await expect(balanceSheet).toBeVisible();
      await expect(balanceSheet).toContainText(BANKS.YAPEAL_EUR);

      await expect(page).toHaveScreenshot('12-yapeal-eur-2025.png', {
        fullPage: true,
        animations: 'disabled',
        mask: getDynamicValueMasks(page),
      });
    });
  });
});
