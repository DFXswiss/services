import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

let token: string;

test.beforeAll(async ({ request }) => {
  const auth = await getCachedAuth(request, 'evm');
  token = auth.token;
});

test.describe('Logout Flow', () => {
  test('should logout and verify account page is not accessible', async ({ page }) => {
    // Step 1: Navigate to account page while logged in
    await page.goto(`/account?session=${token}`);
    await page.waitForLoadState('networkidle');

    // Verify we are logged in - account page shows "Konto" or "Account"
    await expect(page.locator('body')).toContainText(/Konto|Account|Aktivität|Activity/);

    // Take screenshot of logged-in state
    await page.screenshot({ path: 'e2e/test-results/logout-test-1-logged-in.png' });

    // Step 2: Open navigation menu (hamburger icon in top right)
    // The menu icon is a div with cursor-pointer class containing the hamburger SVG
    // It's located in the header bar (dark blue background)
    const menuIcon = page.locator('.cursor-pointer').first();
    await menuIcon.click();
    await page.waitForTimeout(500);

    // Take screenshot of open menu
    await page.screenshot({ path: 'e2e/test-results/logout-test-2-menu-open.png' });

    // Step 3: Click Logout button (visible in the sidebar menu)
    const logoutButton = page.getByRole('button', { name: /logout/i });
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Wait for logout to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot after logout
    await page.screenshot({ path: 'e2e/test-results/logout-test-3-after-logout.png' });

    // Step 4: Try to access /account without session token
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot - should show login page or redirect
    await page.screenshot({ path: 'e2e/test-results/logout-test-4-account-after-logout.png' });

    // Verify we are NOT on the account page anymore
    // Should be redirected to login or show login prompt
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');

    // Either URL contains login/connect OR page shows login options
    const isLoggedOut =
      currentUrl.includes('/login') ||
      currentUrl.includes('/connect') ||
      currentUrl === 'http://localhost:3001/' ||
      pageContent?.includes('Login') ||
      pageContent?.includes('Connect') ||
      pageContent?.includes('Wallet') ||
      !pageContent?.includes('Aktivität'); // Account page has "Aktivität"

    expect(isLoggedOut).toBeTruthy();
  });
});
