/**
 * Playwright Configuration for MetaMask E2E Tests
 *
 * This config uses custom fixtures that:
 * 1. Launch Chrome with Manifest V3 support
 * 2. Load MetaMask 13.13.1 extension (supports EIP-5792 + paymasterService)
 * 3. Use Synpress's MetaMask class for wallet interactions
 *
 * Run with: npx playwright test --config=playwright.synpress.config.ts
 *
 * Prerequisites:
 * 1. npm run synpress:setup (downloads MetaMask 13.13.1)
 *
 * Note: For gasless transactions (paymasterService), MetaMask may prompt
 * the user to upgrade their EOA to a Smart Account (EIP-7702).
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/synpress',
  // Run custom spec files that use our custom fixtures
  testMatch: ['eip5792-custom.spec.ts', 'sepolia-usdt-sell.spec.ts', 'sepolia-full-metamask.spec.ts', 'sepolia-real-tx.spec.ts', 'sell-complete.spec.ts', 'gasless-sell-real.spec.ts', 'debug-capabilities.spec.ts', 'gasless-debug.spec.ts', 'gasless-capture-error.spec.ts', 'gasless-debug-sendcalls.spec.ts'],
  snapshotDir: './e2e/screenshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}-{arg}-{projectName}-{platform}{ext}',
  outputDir: './e2e/synpress-results',

  // Tests must run sequentially (shared wallet state)
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
    // Must be headed mode for extension loading
    headless: false,
  },

  // No projects needed - our custom fixtures handle browser launch
  projects: [
    {
      name: 'chromium-metamask',
      use: {
        // Custom fixtures override the browser launch
      },
    },
  ],

  webServer: {
    command: 'npm run start:e2e',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
