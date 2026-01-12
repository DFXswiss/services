import { test } from '@playwright/test';

test('Send new mail login', async ({ page }) => {
  await page.goto('/login/mail');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill('cyrill15+2025@gmail.com');
  await page.waitForTimeout(500);
  
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/test-results/mail-send-new.png' });
  
  console.log('\n========================================');
  console.log('NEUE EMAIL GESENDET!');
  console.log('Bitte neuen OTP-Code eingeben.');
  console.log('========================================\n');
});
