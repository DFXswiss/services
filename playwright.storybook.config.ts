import { defineConfig, devices } from '@playwright/test';

// Standalone Playwright config dedicated to Storybook-based visual regression
// tests. Kept separate from playwright.config.ts so the e2e application tests
// and the component snapshots do not share webServer, baseURL or
// snapshotDir conventions.

export default defineConfig({
  testDir: './e2e/storybook',
  snapshotDir: './e2e/storybook/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}/{arg}-{projectName}{ext}',
  outputDir: './e2e/storybook/test-results',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30000,
  expect: {
    toHaveScreenshot: {
      // Storybook static pages are deterministic; tiny subpixel drift between
      // Chromium minor versions is tolerated, real layout regressions are not.
      maxDiffPixelRatio: 0.01,
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
      name: 'chromium-linux',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx serve storybook-static -l 6006 --no-clipboard --single',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
