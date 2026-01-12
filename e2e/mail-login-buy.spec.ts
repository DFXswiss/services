import { test, expect } from '@playwright/test';

test('Access /buy after Mail Login', async ({ page }) => {
  const OTP_CODE = 'f4b05e02-7b55-4e9e-974b-51d979060a0d';
  
  // First login with OTP to get session
  await page.goto(`/mail-login?otp=${OTP_CODE}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Get the session token from URL
  const currentUrl = page.url();
  console.log('After OTP URL:', currentUrl);
  
  // Now navigate to /buy
  await page.goto('/buy');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'e2e/test-results/mail-login-buy-page.png' });
  
  const buyUrl = page.url();
  console.log('Buy page URL:', buyUrl);
});
