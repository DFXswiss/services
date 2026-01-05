import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for running E2E tests against localhost API (port 3000)
 *
 * Usage:
 *   E2E_API_URL=http://localhost:3000/v1 npx env-cmd -f .env.test.local \
 *   npx playwright test --config=playwright.local.config.ts
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
  timeout: 90000,
  use: {
    // Frontend runs on 3001, but uses API at 3000
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
    command: 'npm run start:e2e',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
