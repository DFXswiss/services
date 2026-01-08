import { test, expect, request } from '@playwright/test';
import { getCachedAuth, getLinkedLightningAuth } from './helpers/auth-cache';

test.describe('Swap Lightning to Bitcoin Onchain', () => {
  test('should swap from Lightning/BTC to Bitcoin/BTC onchain', async ({ page }) => {
    const apiContext = await request.newContext();

    // Authenticate Bitcoin wallet (primary)
    const bitcoinAuth = await getCachedAuth(apiContext, 'bitcoin');

    // Link Lightning address to account
    await getLinkedLightningAuth(apiContext, bitcoinAuth.token);

    // Navigate to swap with Lightning as source and Bitcoin Onchain as target
    const baseUrl = process.env.E2E_BASE_URL ?? 'https://dev.app.dfx.swiss';
    const url = `${baseUrl}/swap?session=${bitcoinAuth.token}&asset-in=Lightning/BTC&asset-out=Bitcoin/BTC&amount-in=0.001`;
    await page.goto(url);

    // Wait for page to load completely
    await page.waitForTimeout(5000);

    // Take screenshot after initial load
    await page.screenshot({ path: 'e2e/screenshots/baseline/swap-ln-to-btc-01-loaded.png' });

    // Check page content
    const pageContent = await page.textContent('body');

    // Verify Lightning is shown as source (asset-in)
    const hasLightning = pageContent?.includes('Lightning');
    console.log('Page contains Lightning:', hasLightning);

    // Verify Bitcoin onchain address (bc1...) is shown
    const hasBc1Address = pageContent?.match(/bc1[a-zA-HJ-NP-Z0-9]{25,}/);
    console.log('Has bc1 address:', !!hasBc1Address);

    // Wait for exchange rate to load
    await page.waitForSelector('text=Wechselkurs', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Take screenshot with exchange rate
    await page.screenshot({ path: 'e2e/screenshots/baseline/swap-ln-to-btc-02-with-rate.png' });

    // Verify the info text shows correct swap direction
    const infoText = pageContent?.includes('Lightning') && pageContent?.includes('Bitcoin');
    console.log('Shows Lightning to Bitcoin swap:', infoText);

    // Take final screenshot
    await page.screenshot({ path: 'e2e/screenshots/baseline/swap-ln-to-btc-03-complete.png' });

    // Assertions
    expect(pageContent).toContain('Lightning');
    expect(hasBc1Address).toBeTruthy();
  });
});
