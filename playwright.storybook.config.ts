import { defineConfig, devices } from '@playwright/test';

// Standalone Playwright config dedicated to Storybook-based visual regression
// tests. Kept separate from playwright.config.ts so the e2e application tests
// and the component snapshots do not share webServer, baseURL or
// snapshotDir conventions.

export default defineConfig({
  testDir: './e2e/storybook',
  snapshotDir: './e2e/storybook/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}/{arg}{ext}',
  outputDir: './e2e/storybook/test-results',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      // Tolerate text-subpixel drift that creeps in over time as the
      // GitHub-hosted Chromium and the Inter font from Google Fonts get
      // updated. 5 % still catches every meaningful layout regression
      // (variant flips, position shifts, colour changes are 10–50 %+),
      // while staying well above the ~1.4 % drift we observed on
      // 375-px viewports between baseline capture and verification runs
      // five days apart.
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:6006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx serve storybook-static -l 6006 --no-clipboard',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
