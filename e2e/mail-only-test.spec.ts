import { test } from '@playwright/test';

// WICHTIG: Dieser Test verwendet AUSSCHLIESSLICH Mail-Login (OTP)
// KEINE Wallet-Authentifizierung erlaubt!

test.describe('Mail-Only Login Tests', () => {
  
  test('Step 1: Send login email', async ({ page }) => {
    await page.goto('https://dev.app.dfx.swiss/login/mail');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('cyrill15+2025@gmail.com');
    await page.waitForTimeout(500);
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/test-results/mail-only-1-email-sent.png' });
    
    console.log('\n========================================');
    console.log('EMAIL GESENDET an cyrill15+2025@gmail.com');
    console.log('Bitte OTP-Code aus der Email kopieren!');
    console.log('========================================\n');
  });
});
