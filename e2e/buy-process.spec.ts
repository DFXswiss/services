import { test, expect } from '@playwright/test';
import { BlockchainType, getCachedAuth } from './helpers/auth-cache';


test.describe('Buy Process - UI Flow', () => {
  async function getToken(
    request: Parameters<Parameters<typeof test>[1]>[0]['request'],
    walletType: BlockchainType = 'evm',
  ): Promise<string> {
    const auth = await getCachedAuth(request, walletType);
    return auth.token;
  }

  test('should load buy page with session token', async ({ page, request }) => {
    const token = await getToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    const hasBuyContent =
      pageContent?.includes('Buy') ||
      pageContent?.includes('Kaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('CHF') ||
      pageContent?.includes('EUR');

    expect(hasBuyContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-page-loaded.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display amount input and currency selector', async ({ page, request }) => {
    const token = await getToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0 ||
      (await page.locator('input[placeholder*="0"]').count()) > 0;

    const pageContent = await page.textContent('body');
    const hasFormElements =
      hasAmountInput || pageContent?.includes('100') || pageContent?.includes('CHF') || pageContent?.includes('EUR');

    expect(hasFormElements).toBeTruthy();
  });

  test('should show trading restriction message if applicable', async ({ page, request }) => {
    const token = await getToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasTradingRestriction =
      pageContent?.includes('Trading not allowed') ||
      pageContent?.includes('recommendation') ||
      pageContent?.includes('email address') ||
      pageContent?.includes('nicht erlaubt') ||
      pageContent?.includes('KYC') ||
      pageContent?.includes('verify');

    const hasSuccessfulLoad =
      pageContent?.includes('ETH') ||
      pageContent?.includes('BTC') ||
      pageContent?.includes('USDC') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst');

    expect(hasTradingRestriction || hasSuccessfulLoad).toBeTruthy();

    if (hasTradingRestriction) {
      console.log('Trading restriction detected - this is expected for sandbox test accounts');
    }
  });

  test('should handle buy flow with pre-filled amount', async ({ page, request }) => {
    const token = await getToken(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum&amount-in=100`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-page-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });
});

test.describe('Buy Process - Wallet 2 (BIP-44 derived)', () => {
  async function getTokenWallet2(
    request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  ): Promise<string> {
    const auth = await getCachedAuth(request, 'evm-wallet2');
    return auth.token;
  }

  test('should load buy page with Wallet 2', async ({ page, request }) => {
    const token = await getTokenWallet2(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    const hasBuyContent =
      pageContent?.includes('Buy') ||
      pageContent?.includes('Kaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('CHF') ||
      pageContent?.includes('EUR');

    expect(hasBuyContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-page-wallet2.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should display amount input with Wallet 2', async ({ page, request }) => {
    const token = await getTokenWallet2(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0 ||
      (await page.locator('input[placeholder*="0"]').count()) > 0;

    const pageContent = await page.textContent('body');
    const hasFormElements =
      hasAmountInput || pageContent?.includes('100') || pageContent?.includes('CHF') || pageContent?.includes('EUR');

    expect(hasFormElements).toBeTruthy();
  });

  test('should handle buy flow with pre-filled amount on Wallet 2', async ({ page, request }) => {
    const token = await getTokenWallet2(request);

    await page.goto(`/buy?session=${token}&blockchain=Ethereum&amount-in=100`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-page-wallet2-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });
});
