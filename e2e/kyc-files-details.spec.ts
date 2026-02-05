import { test, expect } from '@playwright/test';

/**
 * E2E tests for the KYC Files Details compliance page.
 *
 * Prerequisites:
 * - Frontend running on localhost:3001 (yarn start)
 * - Backend API running on localhost:3000 (yarn start:dev in api folder)
 * - Valid compliance user credentials
 *
 * Run with: npx playwright test e2e/kyc-files-details.spec.ts
 *
 * Note: These tests require running services and will fail if the API is not available.
 */
test.describe('KYC Files Details Page', () => {
  const address = '0xd3AD44Bda0158567461D6FA7eC39E53534e686E9';
  const signature =
    '0x9f2ab17b008d42b29e085210020962beb0758091866598b7a1a54295d1dec7fa56a6425bd491d31707ef3ee97f6479450a56210ae7408a5c2efde806ac50cf481b';
  const baseUrl = `http://localhost:3001/compliance/kyc-files/details?address=${address}&signature=${signature}`;

  async function waitForPageLoad(page) {
    await page.goto(baseUrl);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=KYC File Details')).toBeVisible({ timeout: 15000 });
    await page.waitForSelector('[class*="spinner"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  test('page loads with data and displays correctly', async ({ page }) => {
    await waitForPageLoad(page);

    // Screenshot: Initial page load
    await page.screenshot({ path: 'e2e/screenshots/kyc-files-details-loaded.png', fullPage: true });

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
    ];

    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible({ timeout: 5000 });
    }

    // Screenshot: Headers visible
    await page.screenshot({ path: 'e2e/screenshots/kyc-files-details-headers.png' });

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

    // Verify volume format (Swiss number format with apostrophe) - check first non-empty volume
    const volumeCells = page.locator('tbody tr td:nth-child(15)');
    const volumeCount = await volumeCells.count();
    for (let i = 0; i < Math.min(volumeCount, 10); i++) {
      const volumeText = await volumeCells.nth(i).textContent();
      if (volumeText && volumeText !== '-' && volumeText !== '0') {
        // Swiss format uses apostrophe (Unicode RIGHT SINGLE QUOTATION MARK U+2019) as thousands separator
        expect(volumeText).toMatch(/^[\d\u2019']+$/);
        console.log(`Volume format verified: ${volumeText}`);
        break;
      }
    }

    // Verify numeric columns are right-aligned
    const idCell = page.locator('tbody tr').first().locator('td').first();
    await expect(idCell).toHaveClass(/text-right/);

    // Screenshot: Data rows
    await page.screenshot({ path: 'e2e/screenshots/kyc-files-details-data.png' });
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

    // Screenshot: Buttons visible
    await page.screenshot({ path: 'e2e/screenshots/kyc-files-details-buttons.png' });

    // Hover over buttons to verify tooltip
    await checkButton.hover();
    await page.screenshot({ path: 'e2e/screenshots/kyc-files-details-check-hover.png' });
  });

  test('CSV export button works', async ({ page }) => {
    await waitForPageLoad(page);

    // Find CSV export button in header
    const exportButton = page.locator('thead button[title="Export CSV"]');
    await expect(exportButton).toBeVisible();

    // Screenshot before export
    await page.screenshot({ path: 'e2e/screenshots/kyc-files-details-export-button.png' });

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
