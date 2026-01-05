/**
 * Minimal Playwright config for MetaMask debugging
 * No webserver, just browser + extension testing
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/synpress',
  testMatch: 'metamask-setup-test.spec.ts',
  outputDir: './e2e/test-results',

  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [['list']],

  timeout: 120000,

  use: {
    headless: false,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },

  // NO webServer - we just want to test MetaMask loading
});
