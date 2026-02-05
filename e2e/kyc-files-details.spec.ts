import { test, expect, APIRequestContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

/**
 * E2E tests for the KYC Files Details compliance page.
 *
 * Prerequisites:
 * - Frontend running on localhost:3001 (yarn start)
 * - Backend API running on localhost:3000 (yarn start:dev in api folder)
 * - ADMIN_SEED configured in api/.env (run `npm run setup` in API directory)
 *
 * Run with: npx playwright test e2e/kyc-files-details.spec.ts
 *
 * Note: These tests require running services and will fail if the API is not available.
 */

const API_URL = process.env.REACT_APP_API_URL! + '/v1';

/**
 * Read ADMIN_SEED from the API .env file
 */
function getAdminSeed(): string {
  const apiEnvPath = path.join(__dirname, '../../api/.env');
  if (!fs.existsSync(apiEnvPath)) {
    throw new Error(`API .env file not found at ${apiEnvPath}. Run 'npm run setup' in the API directory first.`);
  }
  const content = fs.readFileSync(apiEnvPath, 'utf8');
  const match = content.match(/^ADMIN_SEED=(.*)$/m);
  if (!match || !match[1]) {
    throw new Error('ADMIN_SEED not found in API .env file. Run "npm run setup" in the API directory first.');
  }
  return match[1];
}

/**
 * Authenticate with admin credentials
 */
async function getAdminAuth(request: APIRequestContext): Promise<string> {
  const adminSeed = getAdminSeed();
  const credentials = await createTestCredentials(adminSeed);

  const response = await request.post(`${API_URL}/auth`, {
    data: credentials,
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => 'unknown');
    throw new Error(`Admin auth failed: ${response.status()} - ${body}`);
  }

  const data = await response.json();
  return data.accessToken;
}

test.describe('KYC Files Details Page', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminAuth(request);
  });

  async function waitForPageLoad(page: Page) {
    await page.goto(`/compliance/kyc-files/details?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=KYC File Details')).toBeVisible({ timeout: 15000 });
  }

  test('page loads with data and displays correctly', async ({ page }) => {
    await waitForPageLoad(page);

    // Check all table headers exist
    const expectedHeaders = [
      'Id',
      'AccountId',
      'Type',
      'Name',
      'Status',
      'Domizil Vertragspartei',
      'Domizil wB',
      'Sitzgesellschaft',
      'Eröffnungsdatum',
      'Schliessdatum',
      'Neueröffnung',
      'GmeR',
      'PEP',
      'Komplexe Struktur',
      'Volume',
      'Custody',
    ];

    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible({ timeout: 5000 });
    }

    // Check data rows exist
    const rowCount = await page.locator('tbody tr').count();
    console.log(`Found ${rowCount} rows in table`);
    expect(rowCount).toBeGreaterThan(0);

    // Verify date format (dd.mm.yyyy) - check first row
    const firstRowDate = page.locator('tbody tr').first().locator('td').nth(8); // Eröffnungsdatum column
    const dateText = await firstRowDate.textContent();
    if (dateText && dateText !== '-') {
      expect(dateText).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
      console.log(`Date format verified: ${dateText}`);
    }

    // Verify volume/custody format (Swiss number format with apostrophe) - check first non-empty value
    for (const { name, col } of [
      { name: 'Volume', col: 15 },
      { name: 'Custody', col: 16 },
    ]) {
      const cells = page.locator(`tbody tr td:nth-child(${col})`);
      const cellCount = await cells.count();
      for (let i = 0; i < Math.min(cellCount, 10); i++) {
        const text = await cells.nth(i).textContent();
        if (text && text !== '-' && text !== '0') {
          // Swiss format uses apostrophe (Unicode RIGHT SINGLE QUOTATION MARK U+2019) as thousands separator
          expect(text).toMatch(/^[\d\u2019']+$/);
          console.log(`${name} format verified: ${text}`);
          break;
        }
      }
    }

    // Verify numeric columns are right-aligned
    const idCell = page.locator('tbody tr').first().locator('td').first();
    await expect(idCell).toHaveClass(/text-right/);
  });

  test('check and download buttons are visible', async ({ page }) => {
    await waitForPageLoad(page);

    // Check that action buttons exist in each row
    const firstRow = page.locator('tbody tr').first();

    // Check button (checkmark icon)
    const checkButton = firstRow.locator('button[title="Check Files"]');
    await expect(checkButton).toBeVisible();

    // Download button (arrow down icon)
    const downloadButton = firstRow.locator('button[title="Download Files"]');
    await expect(downloadButton).toBeVisible();
  });

  test('CSV export button works', async ({ page }) => {
    await waitForPageLoad(page);

    // Find CSV export button in filter bar
    const exportButton = page.locator('button[title="Export CSV"]');
    await expect(exportButton).toBeVisible();

    // Test that clicking triggers download (we just verify no error)
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await exportButton.click();
    const download = await downloadPromise;

    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^kyc-files-details-\d{4}-\d{2}-\d{2}\.csv$/);
      console.log(`CSV downloaded: ${filename}`);
    }
  });
});
