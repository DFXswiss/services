import { test } from '@playwright/test';

test('Mail Login on DEV then access /buy', async ({ page }) => {
  const OTP_CODE = '4c31e9e1-d79e-4d57-8d00-3d02092ede66';
  const DEV_URL = 'https://dev.app.dfx.swiss';
  
  // Step 1: Login with OTP on DEV
  console.log('1. Logging in with OTP on DEV...');
  await page.goto(`${DEV_URL}/mail-login?otp=${OTP_CODE}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const accountUrl = page.url();
  console.log('After login URL:', accountUrl);
  
  await page.screenshot({ path: 'e2e/test-results/dev-mail-1-account.png' });
  
  // Step 2: Navigate to /buy (same domain, session should persist)
  console.log('2. Navigating to /buy...');
  await page.goto(`${DEV_URL}/buy`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'e2e/test-results/dev-mail-2-buy-page.png' });
  
  const buyUrl = page.url();
  console.log('Buy page URL:', buyUrl);
  
  // Verify we're on buy page
  const pageContent = await page.textContent('body');
  const isOnBuyPage = buyUrl.includes('/buy') || pageContent?.includes('Kaufen') || pageContent?.includes('Buy');
  console.log('On buy page:', isOnBuyPage);
});
