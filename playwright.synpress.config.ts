/**
 * Playwright Configuration for Synpress E2E Tests
 *
 * This config is specifically for running E2E tests with real MetaMask extension.
 * Run with: npx playwright test --config=playwright.synpress.config.ts
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/synpress',
  snapshotDir: './e2e/screenshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}-{arg}-{projectName}-{platform}{ext}',
  outputDir: './e2e/synpress-results',

  // Synpress tests must run sequentially (wallet state)
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: process.env.CI ? 'html' : [['list'], ['html', { open: 'never', outputFolder: 'synpress-report' }]],

  // Longer timeout for wallet interactions
  timeout: 120000,

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    // Synpress requires headed mode by default
    headless: false,
  },

  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npm run start:e2e',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
