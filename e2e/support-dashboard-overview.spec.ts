import { expect, test } from '@playwright/test';

// Visual-regression aid for the support dashboard overview (the new landing at
// /support/dashboard; the full ticket list moved to /support/dashboard/all).
//
// Uses the screen's built-in `?preview=1` mode, which renders deterministic sample
// data and bypasses the support-clerk guard, so the baseline needs neither auth nor
// the local API stack. Per CONTRIBUTING these specs are a local review aid and do not
// run in CI.
test.describe('Support dashboard overview', () => {
  test('visual regression - overview tab', async ({ page }) => {
    await page.goto('/support/dashboard?preview=1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Your support overview')).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('support-dashboard-overview.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });

  test('visual regression - statistics tab', async ({ page }) => {
    await page.goto('/support/dashboard?preview=1');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByText('New tickets').first()).toBeVisible();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('support-dashboard-statistics.png', {
      fullPage: true,
      maxDiffPixels: 1000,
    });
  });
});
