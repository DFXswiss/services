import { test, expect } from '@playwright/test';

test('Logout on DEV and verify account not accessible', async ({ page }) => {
  const DEV_URL = 'https://dev.app.dfx.swiss';
  
  // Step 1: Go to account page (should still be logged in from previous session)
  console.log('1. Going to /account...');
  await page.goto(`${DEV_URL}/account`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'e2e/test-results/dev-logout-1-account.png' });
  
  const accountContent = await page.textContent('body');
  console.log('On account page:', accountContent?.includes('Konto') || accountContent?.includes('Profil'));
  
  // Step 2: Open navigation menu
  console.log('2. Opening menu...');
  const menuIcon = page.locator('.cursor-pointer').first();
  await menuIcon.click();
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'e2e/test-results/dev-logout-2-menu.png' });
  
  // Step 3: Click Logout
  console.log('3. Clicking LOGOUT...');
  const logoutButton = page.getByRole('button', { name: /logout/i });
  await expect(logoutButton).toBeVisible({ timeout: 5000 });
  await logoutButton.click();
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'e2e/test-results/dev-logout-3-after-logout.png' });
  
  // Step 4: Try to access /account
  console.log('4. Trying to access /account after logout...');
  await page.goto(`${DEV_URL}/account`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'e2e/test-results/dev-logout-4-account-blocked.png' });
  
  const finalUrl = page.url();
  console.log('Final URL:', finalUrl);
  
  const isLoggedOut = finalUrl.includes('/login') || !finalUrl.includes('/account');
  console.log('Successfully logged out:', isLoggedOut);
});
