import { test } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || '';

test('Send new login email', async ({ page }) => {
  if (!TEST_EMAIL) {
    throw new Error('TEST_EMAIL environment variable is required');
  }

  await page.goto('https://dev.app.dfx.swiss/login/mail');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.waitForTimeout(500);
  await page.locator('button[type="submit"]').click();

  await page.waitForTimeout(3000);
  console.log(`\n=== NEUE EMAIL GESENDET an ${TEST_EMAIL} - Bitte OTP-Code eingeben ===\n`);
});
