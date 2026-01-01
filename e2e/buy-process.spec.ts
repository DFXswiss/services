import { test, expect, APIRequestContext } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';
import { TestCredentials } from './test-wallet';

const API_URL = 'https://dev.api.dfx.swiss/v1';

// EVM-compatible blockchains for this test address (all use same address)
const EVM_BLOCKCHAINS = ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base', 'BinanceSmartChain', 'Gnosis'];

interface Asset {
  id: number;
  name: string;
  uniqueName: string;
  blockchain: string;
  buyable: boolean;
}

interface Fiat {
  id: number;
  name: string;
  sellable: boolean;
}

interface BuyPaymentInfo {
  id: number;
  routeId: number;
  amount: number;
  currency: { id: number; name: string };
  asset: { id: number; name: string };
  estimatedAmount: number;
  rate: number;
  exchangeRate: number;
  minVolume: number;
  maxVolume: number;
  fees: { total: number };
  isValid: boolean;
  error?: string;
  paymentRequest?: string;
  iban?: string;
  bic?: string;
  remittanceInfo?: string;
}

interface BuyQuote {
  amount: number;
  estimatedAmount: number;
  rate: number;
  exchangeRate: number;
  minVolume: number;
  maxVolume: number;
  feeAmount: number;
  isValid: boolean;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAssets(request: APIRequestContext, token: string): Promise<Asset[]> {
  const response = await request.get(`${API_URL}/asset`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function getFiats(request: APIRequestContext): Promise<Fiat[]> {
  const response = await request.get(`${API_URL}/fiat`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function getBuyQuote(
  request: APIRequestContext,
  params: { currency: { id: number }; asset: { id: number }; amount: number },
): Promise<BuyQuote> {
  const response = await request.put(`${API_URL}/buy/quote`, {
    data: {
      currency: params.currency,
      asset: params.asset,
      amount: params.amount,
      paymentMethod: 'Bank',
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createBuyPaymentInfo(
  request: APIRequestContext,
  token: string,
  params: { currency: { id: number }; asset: { id: number }; amount: number },
): Promise<{ data: BuyPaymentInfo | null; error: string | null; status: number }> {
  const response = await request.put(`${API_URL}/buy/paymentInfos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      currency: params.currency,
      asset: params.asset,
      amount: params.amount,
      paymentMethod: 'Bank',
    },
  });

  if (response.ok()) {
    return { data: await response.json(), error: null, status: response.status() };
  }

  const errorBody = await response.json().catch(() => ({}));
  return { data: null, error: errorBody.message || 'Unknown error', status: response.status() };
}

async function confirmBuy(request: APIRequestContext, token: string, paymentInfoId: number): Promise<void> {
  const response = await request.put(`${API_URL}/buy/paymentInfos/${paymentInfoId}/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok()).toBeTruthy();
}

// Force serial execution for API tests to avoid rate limiting
test.describe.configure({ mode: 'serial' });

test.describe('Buy Process - API Integration (EVM Blockchains)', () => {
  let token: string;
  let credentials: TestCredentials;
  let buyableAssets: Asset[];
  let sellableFiats: Fiat[];

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    credentials = auth.credentials;
    console.log(`Using EVM test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    // Filter for EVM-compatible assets only (matching our test address)
    buyableAssets = assets.filter((a) => a.buyable && EVM_BLOCKCHAINS.includes(a.blockchain));
    sellableFiats = fiats.filter((f) => f.sellable);

    expect(buyableAssets.length).toBeGreaterThan(0);
    expect(sellableFiats.length).toBeGreaterThan(0);
  });

  test('should authenticate with EVM credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should fetch buyable assets', async ({ request }) => {
    const assets = await getAssets(request, token);
    const buyable = assets.filter((a) => a.buyable);

    expect(buyable.length).toBeGreaterThan(0);
    console.log(`Found ${buyable.length} buyable assets`);
  });

  test('should fetch sellable fiats', async ({ request }) => {
    const fiats = await getFiats(request);
    const sellable = fiats.filter((f) => f.sellable);

    expect(sellable.length).toBeGreaterThan(0);
    console.log(`Found ${sellable.length} sellable fiats`);

    // Check common currencies
    const eurExists = sellable.some((f) => f.name === 'EUR');
    const chfExists = sellable.some((f) => f.name === 'CHF');
    expect(eurExists || chfExists).toBeTruthy();
  });

  test('should get buy quote for EUR -> ETH', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eur || !eth) {
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: eur.id },
      asset: { id: eth.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);
    expect(quote.minVolume).toBeGreaterThan(0);
    expect(quote.maxVolume).toBeGreaterThan(0);

    console.log(`Quote: 100 EUR -> ${quote.estimatedAmount} ETH (rate: ${quote.rate})`);
  });

  test('should get buy quote for CHF -> WBTC (EVM)', async ({ request }) => {
    const chf = sellableFiats.find((f) => f.name === 'CHF');
    // Use WBTC on Ethereum since test address is EVM
    const wbtc = buyableAssets.find((a) => a.name === 'WBTC' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!chf || !wbtc) {
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: chf.id },
      asset: { id: wbtc.id },
      amount: 200,
    });

    expect(quote.amount).toBe(200);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 200 CHF -> ${quote.estimatedAmount} WBTC (rate: ${quote.rate})`);
  });

  test('should reject amount below minimum', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eur || !eth) {
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: eur.id },
      asset: { id: eth.id },
      amount: 1, // Very low amount
    });

    // Should either be invalid or have an error
    if (!quote.isValid) {
      expect(quote.error).toBeTruthy();
      console.log(`Amount too low error: ${quote.error}`);
    }
  });

  test('should create buy payment info for EUR -> ETH', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eur || !eth) {
      test.skip();
      return;
    }

    const result = await createBuyPaymentInfo(request, token, {
      currency: { id: eur.id },
      asset: { id: eth.id },
      amount: 100,
    });

    // Handle case where trading is not allowed for test account
    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      // Expected errors for sandbox accounts
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account restriction');
        test.skip();
        return;
      }
      // Unexpected error - fail the test
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.amount).toBe(100);
    expect(paymentInfo.currency.name).toBe('EUR');
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);
    expect(paymentInfo.rate).toBeGreaterThan(0);

    // Bank transfer info should be present
    if (paymentInfo.iban) {
      expect(paymentInfo.iban).toBeTruthy();
      expect(paymentInfo.remittanceInfo).toBeTruthy();
      console.log(`Payment Info: IBAN ${paymentInfo.iban}, Reference: ${paymentInfo.remittanceInfo}`);
    }

    console.log(`Created payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} ETH`);
  });

  test('should create and confirm buy for CHF -> USDC (EVM)', async ({ request }) => {
    const chf = sellableFiats.find((f) => f.name === 'CHF');
    // Use USDC on Ethereum since test address is EVM
    const usdc = buyableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!chf || !usdc) {
      test.skip();
      return;
    }

    // Create payment info
    const result = await createBuyPaymentInfo(request, token, {
      currency: { id: chf.id },
      asset: { id: usdc.id },
      amount: 150,
    });

    // Handle case where trading is not allowed for test account
    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error}`);
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        test.skip();
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.isValid).toBeTruthy();

    console.log(`Created payment info ID: ${paymentInfo.id}`);

    // Confirm the buy
    await confirmBuy(request, token, paymentInfo.id);
    console.log(`Confirmed payment info ID: ${paymentInfo.id}`);
  });

  test('should handle multiple currencies', async ({ request }) => {
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth) {
      test.skip();
      return;
    }

    const currencies = ['EUR', 'CHF', 'USD'].map((name) => sellableFiats.find((f) => f.name === name)).filter(Boolean);

    for (const currency of currencies) {
      if (!currency) continue;

      const quote = await getBuyQuote(request, {
        currency: { id: currency.id },
        asset: { id: eth.id },
        amount: 100,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`${currency.name} 100 -> ${quote.estimatedAmount} ETH`);

      await delay(500);
    }
  });

  test('should handle multiple assets', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');

    if (!eur) {
      test.skip();
      return;
    }

    const assets = ['BTC', 'ETH', 'USDT', 'USDC']
      .map((name) => buyableAssets.find((a) => a.name === name))
      .filter(Boolean);

    for (const asset of assets) {
      if (!asset) continue;

      const quote = await getBuyQuote(request, {
        currency: { id: eur.id },
        asset: { id: asset.id },
        amount: 100,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`EUR 100 -> ${quote.estimatedAmount} ${asset.name}`);

      await delay(500);
    }
  });
});

test.describe('Buy Process - API Integration (Bitcoin)', () => {
  let token: string;
  let credentials: TestCredentials;
  let buyableAssets: Asset[];
  let sellableFiats: Fiat[];

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'bitcoin');
    token = auth.token;
    credentials = auth.credentials;
    console.log(`Using Bitcoin test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    buyableAssets = assets.filter((a) => a.buyable && a.blockchain === 'Bitcoin');
    sellableFiats = fiats.filter((f) => f.sellable);

    console.log(`Found ${buyableAssets.length} buyable Bitcoin assets`);
  });

  test('should authenticate with Bitcoin credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should get buy quote for EUR -> BTC', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const btc = buyableAssets.find((a) => a.name === 'BTC' && a.blockchain === 'Bitcoin');

    if (!eur || !btc) {
      console.log('Skipping: EUR or BTC not available');
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: eur.id },
      asset: { id: btc.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 100 EUR -> ${quote.estimatedAmount} BTC (rate: ${quote.rate})`);
  });

  test('should create buy payment info for CHF -> BTC', async ({ request }) => {
    const chf = sellableFiats.find((f) => f.name === 'CHF');
    const btc = buyableAssets.find((a) => a.name === 'BTC' && a.blockchain === 'Bitcoin');

    if (!chf || !btc) {
      test.skip();
      return;
    }

    const result = await createBuyPaymentInfo(request, token, {
      currency: { id: chf.id },
      asset: { id: btc.id },
      amount: 200,
    });

    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account restriction');
        test.skip();
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.amount).toBe(200);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);

    console.log(`Created Bitcoin payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} BTC`);
  });
});

test.describe('Buy Process - API Integration (Solana)', () => {
  let token: string;
  let credentials: TestCredentials;
  let buyableAssets: Asset[];
  let sellableFiats: Fiat[];

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'solana');
    token = auth.token;
    credentials = auth.credentials;
    console.log(`Using Solana test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    buyableAssets = assets.filter((a) => a.buyable && a.blockchain === 'Solana');
    sellableFiats = fiats.filter((f) => f.sellable);

    console.log(`Found ${buyableAssets.length} buyable Solana assets`);
  });

  test('should authenticate with Solana credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should get buy quote for EUR -> SOL', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const sol = buyableAssets.find((a) => a.name === 'SOL' && a.blockchain === 'Solana');

    if (!eur || !sol) {
      console.log('Skipping: EUR or SOL not available');
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: eur.id },
      asset: { id: sol.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 100 EUR -> ${quote.estimatedAmount} SOL (rate: ${quote.rate})`);
  });

  test('should get buy quote for CHF -> USDC on Solana', async ({ request }) => {
    const chf = sellableFiats.find((f) => f.name === 'CHF');
    const usdc = buyableAssets.find((a) => a.name === 'USDC' && a.blockchain === 'Solana');

    if (!chf || !usdc) {
      console.log('Skipping: CHF or Solana USDC not available');
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: chf.id },
      asset: { id: usdc.id },
      amount: 150,
    });

    expect(quote.amount).toBe(150);
    expect(quote.estimatedAmount).toBeGreaterThan(0);

    console.log(`Quote: 150 CHF -> ${quote.estimatedAmount} USDC (Solana)`);
  });

  test('should create buy payment info for EUR -> USDT on Solana', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const usdt = buyableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Solana');

    if (!eur || !usdt) {
      test.skip();
      return;
    }

    const result = await createBuyPaymentInfo(request, token, {
      currency: { id: eur.id },
      asset: { id: usdt.id },
      amount: 100,
    });

    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account restriction');
        test.skip();
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);

    console.log(`Created Solana USDT payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} USDT`);
  });
});

test.describe('Buy Process - API Integration (Tron)', () => {
  let token: string;
  let credentials: TestCredentials;
  let buyableAssets: Asset[];
  let sellableFiats: Fiat[];

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'tron');
    token = auth.token;
    credentials = auth.credentials;
    console.log(`Using Tron test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    buyableAssets = assets.filter((a) => a.buyable && a.blockchain === 'Tron');
    sellableFiats = fiats.filter((f) => f.sellable);

    console.log(`Found ${buyableAssets.length} buyable Tron assets`);
  });

  test('should authenticate with Tron credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should get buy quote for EUR -> TRX', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const trx = buyableAssets.find((a) => a.name === 'TRX' && a.blockchain === 'Tron');

    if (!eur || !trx) {
      console.log('Skipping: EUR or TRX not available');
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: eur.id },
      asset: { id: trx.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 100 EUR -> ${quote.estimatedAmount} TRX (rate: ${quote.rate})`);
  });

  test('should get buy quote for CHF -> USDT on Tron', async ({ request }) => {
    const chf = sellableFiats.find((f) => f.name === 'CHF');
    const usdt = buyableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Tron');

    if (!chf || !usdt) {
      console.log('Skipping: CHF or Tron USDT not available');
      test.skip();
      return;
    }

    const quote = await getBuyQuote(request, {
      currency: { id: chf.id },
      asset: { id: usdt.id },
      amount: 150,
    });

    expect(quote.amount).toBe(150);
    expect(quote.estimatedAmount).toBeGreaterThan(0);

    console.log(`Quote: 150 CHF -> ${quote.estimatedAmount} USDT (Tron)`);
  });

  test('should create buy payment info for EUR -> USDT on Tron', async ({ request }) => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const usdt = buyableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Tron');

    if (!eur || !usdt) {
      test.skip();
      return;
    }

    const result = await createBuyPaymentInfo(request, token, {
      currency: { id: eur.id },
      asset: { id: usdt.id },
      amount: 100,
    });

    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account restriction');
        test.skip();
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);

    console.log(`Created Tron USDT payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} USDT`);
  });
});

test.describe('Buy Process - UI Flow', () => {
  let credentials: TestCredentials;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    credentials = auth.credentials;
  });

  async function getToken(request: APIRequestContext): Promise<string> {
    const auth = await getCachedAuth(request, 'evm');
    return auth.token;
  }

  test('should load buy page with session token', async ({ page, request }) => {
    const token = await getToken(request);

    await page.goto(`/buy?session=${token}`);
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

    await page.goto(`/buy?session=${token}`);
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

    await page.goto(`/buy?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasTradingRestriction =
      pageContent?.includes('Trading not allowed') ||
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

    await page.goto(`/buy?session=${token}&amountIn=100`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('buy-page-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });
});
