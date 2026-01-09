import { test, expect, Page } from '@playwright/test';

// Session token from successful mail login
const SESSION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQWNjb3VudCIsImFjY291bnQiOjQ0NzIsImFjY291bnRTdGF0dXMiOiJLeWNPbmx5Iiwicmlza1N0YXR1cyI6Ik5BIiwiYmxvY2tjaGFpbnMiOltdLCJpcCI6IjIxMi4xMDEuNy43NSIsImlhdCI6MTc2Nzk2MzE0NywiZXhwIjoxNzY4NTY3OTQ3fQ.wS8n9PTwNyEjxiw2PcSj9SfDgagYdOEtNsgHBi8MI8I';

// Helper to remove webpack error overlay
async function removeErrorOverlay(page: Page) {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
}

// Pages to test
// Note: Buy/Sell/Swap show wallet selection when no wallet is connected (expected for mail-only login)
const PAGES = [
  { path: '/account', name: 'Account' },
  { path: '/buy', name: 'Buy' },
  { path: '/sell', name: 'Sell' },
  { path: '/swap', name: 'Swap' },
  { path: '/tx', name: 'Transactions' },
  { path: '/settings', name: 'Settings' },
];

test.describe('Subpages with Mail Login Session', () => {
  for (const pageConfig of PAGES) {
    test(`should load ${pageConfig.name} page`, async ({ page }) => {
      await page.goto(`${pageConfig.path}?session=${SESSION_TOKEN}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);

      // Wait for content to render
      await page.waitForTimeout(1000);

      // Page body should be visible and not empty
      await expect(page.locator('body')).toBeVisible();

      // Page should not show session expired error
      const pageContent = await page.textContent('body');
      const hasExpiredError = pageContent?.includes('expired') || pageContent?.includes('abgelaufen');
      expect(hasExpiredError, `${pageConfig.name} page should not show expired error`).toBeFalsy();

      // Take screenshot for visual verification
      await page.screenshot({ path: `e2e/screenshots/subpage-${pageConfig.name.toLowerCase()}.png` });

      console.log(`${pageConfig.name}: ✓ Page loaded successfully`);
    });
  }
});
