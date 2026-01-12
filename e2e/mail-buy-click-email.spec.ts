import { test } from '@playwright/test';

const OTP_CODE = '70bdcd9f-a3c3-4249-b1cf-764c344b0753';
const DEV_URL = 'https://dev.app.dfx.swiss';

test('Mail-Login → /buy → Click E-MAIL EINGEBEN', async ({ page }) => {
  
  // Step 1: Login mit OTP
  console.log('1. Login mit Mail-OTP...');
  await page.goto(`${DEV_URL}/mail-login?otp=${OTP_CODE}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('   URL:', page.url());
  
  // Step 2: Zur /buy Seite
  console.log('2. Navigiere zu /buy...');
  await page.goto(`${DEV_URL}/buy`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'e2e/test-results/buy-before-email-click.png' });
  
  // Step 3: Klicke auf "E-MAIL EINGEBEN" Button
  console.log('3. Klicke auf E-MAIL EINGEBEN Button...');
  const emailButton = page.getByRole('button', { name: /e-mail eingeben/i });
  
  if (await emailButton.isVisible()) {
    await emailButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'e2e/test-results/buy-after-email-click.png' });
    
    const newUrl = page.url();
    console.log('   URL nach Klick:', newUrl);
    
    const pageContent = await page.textContent('body');
    console.log('   Seite enthält:', pageContent?.substring(0, 200));
  } else {
    console.log('   Button nicht gefunden!');
    await page.screenshot({ path: 'e2e/test-results/buy-no-email-button.png' });
  }
});
