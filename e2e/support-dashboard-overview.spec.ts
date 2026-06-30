import { test, expect, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

/**
 * E2E Visual Regression Tests: Support Dashboard Overview
 *
 * Renders the support dashboard landing at /support/dashboard (the full ticket
 * list moved to /support/dashboard/all) and its statistics tab.
 *
 * Like the compliance specs, this authenticates with the ADMIN_SEED from the API
 * .env file and opens the page with a real session token (?session=). ADMIN is one
 * of SUPPORT_DASHBOARD_ROLES, so the support-clerk guard passes. Tickets and
 * statistics come from the local API/seed data — no preview/sample-data scaffolding.
 * Run `npm run setup` in the API directory first to create the admin user.
 *
 * Per CONTRIBUTING these visual-regression specs are a local review aid and do not
 * run in CI.
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

test.describe('Support dashboard overview', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminAuth(request);
  });

  test('visual regression - overview tab', async ({ page }) => {
    await page.goto(`/support/dashboard?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Your support overview')).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('support-dashboard-overview.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });

  test('visual regression - statistics tab', async ({ page }) => {
    await page.goto(`/support/dashboard?session=${token}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Your support overview')).toBeVisible();
    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByText('New tickets').first()).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('support-dashboard-statistics.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });
});
