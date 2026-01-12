import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test: Signature-based Login
 *
 * Tests the login flow using address + signature URL parameters.
 * This is used when users authenticate via wallet signature.
 *
 * Test addresses derived from test seed at HD indices 10 and 11.
 * HD Path: m/44'/60'/0'/0/{index}
 */

// Test Address 1 (Index 10)
const TEST_ADDRESS_1 = '0xd3AD44Bda0158567461D6FA7eC39E53534e686E9';
const TEST_SIGNATURE_1 =
  '0x9f2ab17b008d42b29e085210020962beb0758091866598b7a1a54295d1dec7fa56a6425bd491d31707ef3ee97f6479450a56210ae7408a5c2efde806ac50cf481b';

// Test Address 2 (Index 11)
const TEST_ADDRESS_2 = '0xB18f08332eD99e0FBee29B2E09Be166B58e6083b';
const TEST_SIGNATURE_2 =
  '0x76cc51c74e84ad3eb0ca1cfde3465d0621292bf6e4edfa3cf40d0dc715e111d7304fbeaddcfe4df2426e6f101c2b2509301579e93857076a1b3ad32843e23aa91c';

// Helper to remove webpack error overlay
async function removeErrorOverlay(page: Page) {
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
}

// Helper to wait for app to be fully loaded (not showing "Loading ...")
async function waitForAppLoaded(page: Page, timeout = 30000): Promise<void> {
  // Wait until loading spinner is gone and real content appears
  await page.waitForFunction(
    () => {
      const body = (document.body?.textContent || '').toLowerCase();
      const hasLoading = body.includes('loading ...');
      // Check for any content that indicates the app is loaded (case-insensitive)
      const hasContent =
        body.includes('kaufen') ||
        body.includes('verkaufen') ||
        body.includes('buy') ||
        body.includes('sell') ||
        body.includes('konto') ||
        body.includes('account') ||
        body.includes('toolbox') ||
        body.includes('wallet') ||
        body.includes('einstellungen') ||
        body.includes('settings') ||
        body.includes('transaktionen') ||
        body.includes('transactions');
      return !hasLoading && (hasContent || body.length > 200);
    },
    { timeout },
  );
  await page.waitForTimeout(1000); // Extra wait for UI to stabilize
}

// Helper to check if user is logged in
async function isLoggedIn(page: Page): Promise<boolean> {
  const bodyText = (await page.textContent('body'))?.toLowerCase() || '';

  // Not logged in if still loading
  if (bodyText.includes('loading ...')) return false;

  // Check for content that appears when logged in (case-insensitive)
  const hasUserContent =
    bodyText.includes('konto') ||
    bodyText.includes('account') ||
    bodyText.includes('kaufen') ||
    bodyText.includes('buy') ||
    bodyText.includes('verkaufen') ||
    bodyText.includes('sell') ||
    bodyText.includes('transaktionen') ||
    bodyText.includes('transactions') ||
    bodyText.includes('einstellungen') ||
    bodyText.includes('settings') ||
    bodyText.includes('toolbox') ||
    bodyText.includes('adresse hinzufügen') ||
    bodyText.includes('du zahlst') ||
    bodyText.includes('wechselkurs');

  return hasUserContent;
}

test.describe('Signature-based Login Flow', () => {
  test.describe('Test Address 1', () => {
    const address = TEST_ADDRESS_1;
    const signature = TEST_SIGNATURE_1;

    test('should login via URL parameters and access home page', async ({ page }) => {
      await page.goto(`/?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);
      await removeErrorOverlay(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-1-home.png' });

      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Invalid signature');
      expect(bodyText).not.toContain('Ungültige Signatur');

      const loggedIn = await isLoggedIn(page);
      expect(loggedIn, 'User should be logged in after signature auth').toBeTruthy();
    });

    test('should access /account page after login', async ({ page }) => {
      await page.goto(`/account?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-1-account.png' });

      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasAccountContent =
        bodyText.includes('konto') ||
        bodyText.includes('account') ||
        bodyText.includes('e-mail') ||
        bodyText.includes('kyc') ||
        bodyText.includes('profil');

      expect(hasAccountContent, 'Account page should show account content').toBeTruthy();
    });

    test('should access /buy page after login', async ({ page }) => {
      await page.goto(`/buy?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-1-buy.png' });

      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasBuyContent =
        bodyText.includes('kaufen') ||
        bodyText.includes('buy') ||
        bodyText.includes('du zahlst') ||
        bodyText.includes('wechselkurs') ||
        bodyText.includes('adresse hinzufügen');

      expect(hasBuyContent, 'Buy page should show buy form or wallet selection').toBeTruthy();
    });

    test('should access /sell page after login', async ({ page }) => {
      await page.goto(`/sell?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-1-sell.png' });

      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasSellContent =
        bodyText.includes('verkaufen') ||
        bodyText.includes('sell') ||
        bodyText.includes('du zahlst') ||
        bodyText.includes('wechselkurs') ||
        bodyText.includes('adresse hinzufügen');

      expect(hasSellContent, 'Sell page should show sell form or wallet selection').toBeTruthy();
    });

    test('should access /tx (transactions) page after login', async ({ page }) => {
      await page.goto(`/tx?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-1-transactions.png' });

      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasTransactionsContent =
        bodyText.includes('transaktionen') ||
        bodyText.includes('transactions') ||
        bodyText.includes('keine transaktionen') ||
        bodyText.includes('no transactions');

      expect(hasTransactionsContent, 'Transactions page should show transaction list or empty state').toBeTruthy();
    });

    test('should access /settings page after login', async ({ page }) => {
      await page.goto(`/settings?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-1-settings.png' });

      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasSettingsContent =
        bodyText.includes('einstellungen') ||
        bodyText.includes('settings') ||
        bodyText.includes('sprache') ||
        bodyText.includes('language');

      expect(hasSettingsContent, 'Settings page should show settings options').toBeTruthy();
    });
  });

  test.describe('Test Address 2', () => {
    const address = TEST_ADDRESS_2;
    const signature = TEST_SIGNATURE_2;

    test('should login via URL parameters', async ({ page }) => {
      await page.goto(`/?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-2-home.png' });

      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Invalid signature');

      const loggedIn = await isLoggedIn(page);
      expect(loggedIn, 'User should be logged in').toBeTruthy();
    });

    test('should access /account page', async ({ page }) => {
      await page.goto(`/account?address=${address}&signature=${signature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);
      await waitForAppLoaded(page);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-2-account.png' });

      const bodyText = (await page.textContent('body'))?.toLowerCase() || '';
      const hasAccountContent =
        bodyText.includes('konto') ||
        bodyText.includes('account') ||
        bodyText.includes('e-mail') ||
        bodyText.includes('profil');

      expect(hasAccountContent, 'Account page should be accessible').toBeTruthy();
    });
  });

  test.describe('Invalid Signature', () => {
    test('should handle invalid signature gracefully', async ({ page }) => {
      const invalidSignature = '0xinvalidsignature123';

      await page.goto(`/?address=${TEST_ADDRESS_1}&signature=${invalidSignature}`);
      await page.waitForLoadState('networkidle');
      await removeErrorOverlay(page);

      // Wait for app to respond to invalid signature
      await page.waitForTimeout(5000);

      await page.screenshot({ path: 'e2e/screenshots/signature-login-invalid.png' });

      // App should not crash - page should still be accessible
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(0);
    });
  });
});
