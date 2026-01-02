import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/screenshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}-{arg}-{projectName}-{platform}{ext}',
  outputDir: './e2e/test-results',
  // Keep test results after test run
  preserveOutput: 'always',
  // Disable parallel execution to prevent API rate limiting
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use single worker to prevent rate limiting
  workers: 1,
  // Use list reporter for real-time progress, html for detailed results
  // HTML report is saved to playwright-report/ and persists across runs
  reporter: process.env.CI ? 'html' : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  // Global timeout for tests
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3001',
    // Always capture traces and screenshots for debugging
    trace: 'on',
    screenshot: 'on',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run start:e2e',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
