import { test } from '@playwright/test';

test('Send new login email', async ({ page }) => {
  await page.goto('https://dev.app.dfx.swiss/login/mail');
  await page.waitForLoadState('networkidle');
  
  await page.locator('input[type="email"]').fill('cyrill15+2025@gmail.com');
  await page.waitForTimeout(500);
  await page.locator('button[type="submit"]').click();
  
  await page.waitForTimeout(3000);
  console.log('\n=== NEUE EMAIL GESENDET - Bitte OTP-Code eingeben ===\n');
});
