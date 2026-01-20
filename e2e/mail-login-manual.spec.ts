import { test } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;

test('Manual Mail Login Flow', async ({ page }) => {

  // Step 1: Go to mail login page
  await page.goto('/login/mail');
  await page.waitForLoadState('networkidle');

  // Step 2: Enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(TEST_EMAIL);
  await page.waitForTimeout(500);

  // Step 3: Submit
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait for confirmation
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/test-results/manual-mail-1-email-sent.png' });

  console.log('\n========================================');
  console.log(`EMAIL GESENDET an ${TEST_EMAIL}! Bitte OTP-Code eingeben.`);
  console.log('========================================\n');

  // Pause and wait for user to provide OTP
  await page.pause();
});
