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

  test('should apply the personal IBAN selector directly and display Bank Frick details', async ({ page, request }) => {
    const token = await getToken(request);
    let receivedProvider: unknown;

    await page.route('**/v1/buy/paymentInfos', async (route) => {
      const requestData = route.request().postDataJSON() as Record<string, unknown>;
      receivedProvider = requestData.personalIbanProvider;

      // Keep this visual test independent of Bank Frick and avoid allocating a real vIBAN.
      const upstreamData = { ...requestData };
      delete upstreamData.personalIbanProvider;
      const response = await route.fetch({ postData: JSON.stringify(upstreamData) });
      const paymentInfo = (await response.json()) as Record<string, unknown>;

      await route.fulfill({
        response,
        json: {
          ...paymentInfo,
          bank: 'Bank Frick',
          bic: 'BFRILI22XXX',
          iban: 'LI21088100002324013AA',
          name: 'DFX AG',
          remittanceInfo: undefined,
          sepaInstant: false,
          isPersonalIban: true,
        },
      });
    });

    await page.goto(
      `/buy?session=${token}&blockchain=Ethereum&asset-in=EUR&amount-in=100&personal-iban=frick`,
    );

    // No intermediate confirmation step: the selector is applied directly and the
    // Frick-backed payment details render as soon as the quote resolves.
    const bankLabel = page.getByText('Bank', { exact: true });
    await expect(bankLabel).toBeVisible({ timeout: 15000 });
    await expect.poll(() => receivedProvider).toBe('Frick');
    const paymentDetails = page
      .getByRole('heading', { name: 'Payment Information' })
      .locator('..');
    await expect(
      paymentDetails.getByText('DFX AG', { exact: true }),
    ).toBeVisible();
    await expect(paymentDetails).toHaveScreenshot(
      'buy-bank-frick-payment-details.png',
    );
  });

  // Visual review aid for the collection-IBAN toggle. The neighboring test above
  // deliberately mocks no remittanceInfo and therefore never renders the toggle.
  test('should toggle between the personal and the collection IBAN', async ({ page, request }) => {
    const token = await getToken(request);

    await page.route('**/v1/buy/paymentInfos', async (route) => {
      // Fully static quote: since the personal-IBAN rollout the local API rejects EUR bank
      // quotes for sub-KYC-50 accounts with HTTP 400 KycRequired, and fulfilling with the
      // upstream response keeps that status. A static 200 keeps this visual test independent
      // of local KYC state, price rules and Bank Frick issuance. remittanceInfo is fixed in
      // the real bankUsage format so the screenshots stay deterministic across regenerations.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          id: 1,
          isValid: true,
          amount: 100,
          estimatedAmount: 0.0251,
          rate: 3862.5,
          exchangeRate: 3984.06,
          priceSteps: [],
          minVolume: 10,
          maxVolume: 990000,
          minVolumeTarget: 0.0026,
          maxVolumeTarget: 248.5,
          fees: {
            rate: 0.0099,
            fixed: 0,
            min: 0,
            dfx: 0.99,
            network: 0,
            bank: 0,
            bankFixed: 2,
            bankVariable: 0,
            platform: 0,
            total: 2.99,
          },
          currency: { id: 2, name: 'EUR' },
          asset: { id: 111, name: 'ETH', blockchain: 'Ethereum', category: 'Public' },
          bank: 'Bank Frick',
          bic: 'BFRILI22XXX',
          iban: 'LI21088100002324013AA',
          name: 'DFX AG',
          street: 'Bahnhofstrasse',
          number: '7',
          zip: '6300',
          city: 'Zug',
          country: 'Schweiz',
          remittanceInfo: 'A1B2-C3D4-E5F6',
          sepaInstant: false,
          isPersonalIban: true,
        },
      });
    });

    // asset-out is pinned: without it the screen picks the first listed asset, which has
    // no price rule in the local seed and the quote never reaches the payment details.
    await page.goto(
      `/buy?session=${token}&blockchain=Ethereum&asset-in=EUR&asset-out=ETH&amount-in=100&personal-iban=frick`,
    );

    const paymentDetails = page
      .getByRole('heading', { name: 'Payment Information' })
      .locator('..');

    const toggle = paymentDetails.getByRole('button', { name: 'Show collection IBAN' });
    await expect(toggle).toBeVisible({ timeout: 15000 });

    // Personal IBAN state, formatted via Utils.formatIban (ibantools friendlyFormat, groups of 4).
    await expect(paymentDetails.getByText('LI21 0881 0000 2324 013A A')).toBeVisible();
    await expect(paymentDetails).toHaveScreenshot('buy-collection-iban-toggle-personal.png');

    await toggle.click();

    // Collection IBAN state.
    await expect(paymentDetails.getByText('LI75 0881 1010 5923 K000 E')).toBeVisible();
    await expect(paymentDetails.getByRole('button', { name: 'Show personal IBAN' })).toBeVisible();
    await expect(paymentDetails.getByText('A1B2-C3D4-E5F6')).toBeVisible();
    await expect(paymentDetails).toHaveScreenshot('buy-collection-iban-toggle-collection.png');

    // Toggle back to personal IBAN.
    await paymentDetails.getByRole('button', { name: 'Show personal IBAN' }).click();
    await expect(paymentDetails.getByText('LI21 0881 0000 2324 013A A')).toBeVisible();
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
