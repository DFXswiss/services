import { test, expect } from '@playwright/test';

// ============================================================
// MAIL-ONLY TEST - KEINE WALLET-AUTHENTIFIZIERUNG!
// Verwendet ausschließlich OTP-basierte Mail-Authentifizierung
// ============================================================

const OTP_CODE = '720e4e8f-6f2e-4027-ac8d-86b0d4ca61d9';
const DEV_URL = 'https://dev.app.dfx.swiss';

test.describe('Mail-Only: /account und /buy Tests', () => {
  
  test('Mail-Login → /account → /buy', async ({ page }) => {
    
    // ========== STEP 1: Login mit OTP (Mail-Only!) ==========
    console.log('1. Login mit Mail-OTP...');
    await page.goto(`${DEV_URL}/mail-login?otp=${OTP_CODE}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const afterLoginUrl = page.url();
    console.log('   URL nach Login:', afterLoginUrl);
    
    // Verify: Kein Wallet in URL, sollte auf /account landen
    expect(afterLoginUrl).not.toContain('wallet');
    expect(afterLoginUrl).not.toContain('address=0x');
    
    await page.screenshot({ path: 'e2e/test-results/mail-only-01-after-login.png' });
    
    // ========== STEP 2: /account Test ==========
    console.log('2. Teste /account Seite...');
    await page.goto(`${DEV_URL}/account`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const accountUrl = page.url();
    console.log('   Account URL:', accountUrl);
    
    // Verify: Wir sind auf /account (nicht redirect zu login)
    expect(accountUrl).toContain('/account');
    expect(accountUrl).not.toContain('/login');
    
    // Verify: Seite zeigt Account-Inhalte
    const accountBody = await page.textContent('body');
    const hasAccountContent = 
      accountBody?.includes('Konto') || 
      accountBody?.includes('Account') ||
      accountBody?.includes('Profil') ||
      accountBody?.includes('E-Mail');
    
    expect(hasAccountContent).toBeTruthy();
    console.log('   ✓ /account erfolgreich geladen');
    
    await page.screenshot({ path: 'e2e/test-results/mail-only-02-account.png' });
    
    // ========== STEP 3: /buy Test ==========
    console.log('3. Teste /buy Seite...');
    await page.goto(`${DEV_URL}/buy`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const buyUrl = page.url();
    console.log('   Buy URL:', buyUrl);
    
    // Verify: Wir sind auf /buy (nicht redirect zu login)
    expect(buyUrl).toContain('/buy');
    expect(buyUrl).not.toContain('/login');
    
    // Verify: Seite zeigt Buy-Inhalte
    const buyBody = await page.textContent('body');
    const hasBuyContent = 
      buyBody?.includes('Kaufen') || 
      buyBody?.includes('Buy') ||
      buyBody?.includes('Du zahlst') ||
      buyBody?.includes('EUR');
    
    expect(hasBuyContent).toBeTruthy();
    console.log('   ✓ /buy erfolgreich geladen');
    
    await page.screenshot({ path: 'e2e/test-results/mail-only-03-buy.png' });
    
    console.log('\n========================================');
    console.log('✓ ALLE TESTS BESTANDEN (Mail-Only!)');
    console.log('========================================\n');
  });
});
