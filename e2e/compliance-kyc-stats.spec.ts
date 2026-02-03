import { test, expect, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createTestCredentials } from './test-wallet';

const API_URL = process.env.REACT_APP_API_URL! + '/v1';

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

test.describe('KYC Stats Page - Smoke Test', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAdminAuth(request);
  });

  test('page loads and shows table with API data', async ({ page }) => {
    await page.goto(`/compliance/kyc-stats?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify table is visible
    await expect(page.getByText('As of 31.12.:')).toBeVisible();

    // Verify row labels are present
    await expect(page.getByText('KYC files managed on 01.01.xxxx')).toBeVisible();
    await expect(page.getByText('KYC files managed on 31.12.20xx')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'e2e/test-results/kyc-stats-smoke-test.png',
      fullPage: true,
    });

    console.log('Screenshot saved to e2e/test-results/kyc-stats-smoke-test.png');
  });
});
