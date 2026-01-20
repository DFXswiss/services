import { test, expect, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

/**
 * E2E Visual Regression Tests: Compliance Pages
 *
 * Tests all compliance subpages:
 * 1. /compliance - Main search page
 * 2. /compliance/user/:id - User details page
 * 3. /compliance/bank-tx/:id/return - Bank transaction return page
 *
 * NOTE: These tests use the ADMIN_SEED from the API .env file.
 * The admin user has ADMIN role which includes COMPLIANCE permissions.
 * Run `npm run setup` in the API directory first to create the admin user.
 */

// Test data - uses "max" search which returns Max Mueller (ID 1005)
const TEST_USER_DATA_ID = '1005';
const TEST_SEARCH_QUERY = 'max';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/v1';

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

test.describe('Compliance Pages - Visual Regression Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminAuth(request);
  });

  test.describe('Compliance Search Page (/compliance)', () => {
    test('renders search page correctly', async ({ page }) => {
      await page.goto(`/compliance?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify page loaded
      await expect(page.getByText('Database search')).toBeVisible();

      await expect(page).toHaveScreenshot('compliance-01-search-page.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows search results', async ({ page }) => {
      await page.goto(`/compliance?session=${token}&search=${TEST_SEARCH_QUERY}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Wait for search results or "No entries found" message
      await page.waitForSelector('text=Matching Entries, text=No entries found', {
        timeout: 10000,
      }).catch(() => {
        // One of these should appear
      });

      await expect(page).toHaveScreenshot('compliance-02-search-results.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });
  });

  test.describe('Compliance User Details Page (/compliance/user/:id)', () => {
    test('renders user details page correctly', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Wait for data to load - either user data table or error
      await page.waitForSelector('text=User Data, text=Error', {
        timeout: 15000,
      }).catch(() => {
        // One of these should appear
      });

      await expect(page).toHaveScreenshot('compliance-user-01-overview.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows KYC file preview (selfie.jpg)', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click on selfie.jpg in the KYC Files table
      await page.getByText('selfie.jpg').click();
      await page.waitForTimeout(1000);

      // Wait for image preview to load
      await expect(page.locator('img[alt="selfie.jpg"]')).toBeVisible({ timeout: 10000 });

      await expect(page).toHaveScreenshot('compliance-user-02-kyc-file-preview.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows Transactions tab', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click Transactions tab and scroll to it
      const transactionsTab = page.getByRole('button', { name: /Transactions \(/i });
      await transactionsTab.click();
      await transactionsTab.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('compliance-user-03-transactions-tab.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows Users tab', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click Users tab
      await page.getByRole('button', { name: /Users \(/i }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('compliance-user-04-users-tab.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows KYC Steps tab', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click KYC Steps tab
      await page.getByRole('button', { name: /KYC Steps \(/i }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('compliance-user-05-kyc-steps-tab.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows Bank Data tab', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click Bank Data tab
      await page.getByRole('button', { name: /Bank Data \(/i }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('compliance-user-06-bank-data-tab.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows Buy Routes tab', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click Buy Routes tab
      await page.getByRole('button', { name: /Buy Routes \(/i }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('compliance-user-07-buy-routes-tab.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });

    test('shows Sell Routes tab', async ({ page }) => {
      await page.goto(`/compliance/user/${TEST_USER_DATA_ID}?session=${token}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click Sell Routes tab
      await page.getByRole('button', { name: /Sell Routes \(/i }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('compliance-user-08-sell-routes-tab.png', {
        fullPage: true,
        maxDiffPixels: 5000,
      });
    });
  });

  // NOTE: Bank TX Return tests are skipped - no test transaction data available
  // To add these tests later, create test data and uncomment:
  // test.describe('Compliance Bank TX Return Page (/compliance/bank-tx/:id/return)', () => { ... });
});
