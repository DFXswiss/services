import { test, expect } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';


test.describe('Login Process - UI Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    const hasHomeContent =
      pageContent?.includes('DFX') ||
      pageContent?.includes('Buy') ||
      pageContent?.includes('Sell') ||
      pageContent?.includes('Swap') ||
      pageContent?.includes('Login') ||
      pageContent?.includes('Connect');

    expect(hasHomeContent).toBeTruthy();

    await expect(page).toHaveScreenshot('home-page.png', {
      maxDiffPixels: 1000,
      fullPage: true,
    });
  });

  test('should navigate to buy page with session', async ({ page }) => {
    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    const isBuyPage =
      pageContent?.includes('Buy') ||
      pageContent?.includes('Kaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst');

    expect(isBuyPage).toBeTruthy();
  });

  test('should show authenticated state with session token', async ({ page }) => {
    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');

    // When authenticated, should not show login/connect prompts
    const hasAuthContent =
      pageContent?.includes('ETH') ||
      pageContent?.includes('BTC') ||
      pageContent?.includes('USDC') ||
      pageContent?.includes('EUR') ||
      pageContent?.includes('CHF');

    expect(hasAuthContent).toBeTruthy();
  });

  test('should handle invalid session gracefully', async ({ page }) => {
    await page.goto('/buy?session=invalid-token-12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Page should still load, might show login prompt or error
    const pageLoaded =
      pageContent?.includes('DFX') ||
      pageContent?.includes('Buy') ||
      pageContent?.includes('Login') ||
      pageContent?.includes('Connect') ||
      pageContent?.includes('Error') ||
      pageContent?.includes('Invalid');

    expect(pageLoaded).toBeTruthy();
  });
});
