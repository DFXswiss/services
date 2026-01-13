import { test } from '@playwright/test';

test('Mail Login then access /buy', async ({ page }) => {
  const OTP_CODE = '4c31e9e1-d79e-4d57-8d00-3d02092ede66';
  
  // Step 1: Login with OTP
  console.log('1. Logging in with OTP...');
  await page.goto(`/mail-login?otp=${OTP_CODE}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Get session token from URL
  const accountUrl = page.url();
  console.log('Account URL:', accountUrl);
  
  const urlParams = new URL(accountUrl).searchParams;
  const sessionToken = urlParams.get('session');
  console.log('Session token:', sessionToken ? sessionToken.substring(0, 50) + '...' : 'NOT FOUND');
  
  await page.screenshot({ path: 'e2e/test-results/mail-buy-1-account.png' });
  
  // Step 2: Navigate to /buy WITH session token
  console.log('2. Navigating to /buy...');
  if (sessionToken) {
    await page.goto(`/buy?session=${sessionToken}`);
  } else {
    await page.goto('/buy');
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'e2e/test-results/mail-buy-2-buy-page.png' });
  
  const buyUrl = page.url();
  console.log('Buy page URL:', buyUrl);
  
  // Check if we're on buy page (not login)
  const isOnBuyPage = buyUrl.includes('/buy') && !buyUrl.includes('/login');
  console.log('Successfully on /buy page:', isOnBuyPage);
});
