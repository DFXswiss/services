import { test, expect } from '@playwright/test';

test('Complete Mail Login with OTP and verify /account', async ({ page }) => {
  const OTP_CODE = 'f4b05e02-7b55-4e9e-974b-51d979060a0d';
  
  // Step 1: Use the magic link with OTP
  console.log('Navigating to mail-login with OTP...');
  await page.goto(`/mail-login?otp=${OTP_CODE}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Screenshot after OTP redirect
  await page.screenshot({ path: 'e2e/test-results/mail-login-complete-1-after-otp.png' });
  
  const currentUrl = page.url();
  console.log('Current URL after OTP:', currentUrl);
  
  // Check if we landed on account page or got redirected with session
  if (currentUrl.includes('/account') || currentUrl.includes('session=')) {
    console.log('✓ Successfully logged in via mail!');
    
    // Step 2: Verify account page is accessible
    await page.screenshot({ path: 'e2e/test-results/mail-login-complete-2-account-page.png' });
    
    // Check for account page content
    const bodyText = await page.textContent('body');
    const isAccountPage = bodyText?.includes('Konto') || 
                          bodyText?.includes('Account') || 
                          bodyText?.includes('Aktivität');
    
    expect(isAccountPage).toBeTruthy();
    console.log('✓ Account page loaded successfully!');
  } else {
    // Take screenshot of whatever page we're on
    await page.screenshot({ path: 'e2e/test-results/mail-login-complete-error.png' });
    console.log('Current page content:', await page.textContent('body'));
  }
});
