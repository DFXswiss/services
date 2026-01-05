import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load local test environment for E2E_API_URL
dotenv.config({ path: path.join(__dirname, '.env.test.local') });

/**
 * Playwright configuration for testing against LOCAL API (localhost:3000)
 *
 * Usage:
 *   npx playwright test --config=playwright.local.config.ts
 *   npx playwright test --config=playwright.local.config.ts e2e/refund-creditor-data.spec.ts
 *
 * Prerequisites:
 *   1. Local API running on http://localhost:3000
 *   2. Test user must exist in local database
 *   3. Test data (transactions, etc.) must exist in local database
 */
export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/screenshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}-{arg}-{projectName}-{platform}{ext}',
  outputDir: './e2e/test-results',
  preserveOutput: 'always',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-local' }]],
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Use .env.loc which has REACT_APP_API_URL=http://localhost:3000
    command: 'npm run start',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
