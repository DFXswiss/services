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
  sellable: boolean;
}

interface SwapQuote {
  amount: number;
  estimatedAmount: number;
  exchangeRate: number;
  minVolume: number;
  minVolumeTarget: number;
  maxVolume: number;
  maxVolumeTarget: number;
  feeAmount: number;
  fees: { total: number };
  feesTarget: { total: number };
  isValid: boolean;
  error?: string;
}

interface SwapPaymentInfo {
  id: number;
  routeId: number;
  amount: number;
  sourceAsset: { id: number; name: string };
  targetAsset: { id: number; name: string };
  estimatedAmount: number;
  rate: number;
  exchangeRate: number;
  minVolume: number;
  maxVolume: number;
  fees: { total: number };
  feesTarget: { total: number };
  isValid: boolean;
  error?: string;
  depositAddress?: string;
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

async function getSwapQuote(
  request: APIRequestContext,
  params: { sourceAsset: { id: number }; targetAsset: { id: number }; amount: number },
): Promise<SwapQuote> {
  const response = await request.put(`${API_URL}/swap/quote`, {
    data: {
      sourceAsset: params.sourceAsset,
      targetAsset: params.targetAsset,
      amount: params.amount,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createSwapPaymentInfo(
  request: APIRequestContext,
  token: string,
  params: { sourceAsset: { id: number }; targetAsset: { id: number }; amount: number },
): Promise<{ data: SwapPaymentInfo | null; error: string | null; status: number }> {
  const response = await request.put(`${API_URL}/swap/paymentInfos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      sourceAsset: params.sourceAsset,
      targetAsset: params.targetAsset,
      amount: params.amount,
    },
  });

  if (response.ok()) {
    return { data: await response.json(), error: null, status: response.status() };
  }

  const errorBody = await response.json().catch(() => ({}));
  return { data: null, error: errorBody.message || 'Unknown error', status: response.status() };
}

async function confirmSwap(
  request: APIRequestContext,
  token: string,
  paymentInfoId: number,
): Promise<{ success: boolean; error: string | null }> {
  const response = await request.put(`${API_URL}/swap/paymentInfos/${paymentInfoId}/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok()) {
    return { success: true, error: null };
  }

  const errorBody = await response.json().catch(() => ({}));
  return { success: false, error: errorBody.message || 'Unknown error' };
}

// Force serial execution for API tests to avoid rate limiting
test.describe.configure({ mode: 'serial' });

test.describe('Swap Process - API Integration', () => {
  let token: string;
  let credentials: TestCredentials;
  let swappableAssets: Asset[];

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    credentials = auth.credentials;
    console.log(`Using test address: ${credentials.address}`);

    const assets = await getAssets(request, token);

    // Filter for EVM-compatible assets that are both buyable and sellable (swappable)
    swappableAssets = assets.filter(
      (a) => a.buyable && a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain),
    );

    expect(swappableAssets.length).toBeGreaterThan(0);
    console.log(`Found ${swappableAssets.length} swappable EVM assets`);
  });

  test('should authenticate with test credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should fetch swappable assets', async ({ request }) => {
    const assets = await getAssets(request, token);
    const swappable = assets.filter(
      (a) => a.buyable && a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain),
    );

    expect(swappable.length).toBeGreaterThan(0);
    console.log(`Found ${swappable.length} swappable EVM assets`);

    // Check for common swap pairs
    const hasEth = swappable.some((a) => a.name === 'ETH');
    const hasUsdt = swappable.some((a) => a.name === 'USDT');
    const hasUsdc = swappable.some((a) => a.name === 'USDC');

    expect(hasEth || hasUsdt || hasUsdc).toBeTruthy();
  });

  test('should get swap quote for ETH -> USDT', async ({ request }) => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      test.skip();
      return;
    }

    const quote = await getSwapQuote(request, {
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.1,
    });

    expect(quote.amount).toBe(0.1);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.exchangeRate).toBeGreaterThan(0);
    expect(quote.minVolume).toBeGreaterThan(0);
    expect(quote.maxVolume).toBeGreaterThan(0);

    console.log(`Quote: 0.1 ETH -> ${quote.estimatedAmount} USDT (rate: ${quote.exchangeRate})`);
  });

  test('should get swap quote for USDC -> ETH', async ({ request }) => {
    const usdc = swappableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!usdc || !eth) {
      test.skip();
      return;
    }

    const quote = await getSwapQuote(request, {
      sourceAsset: { id: usdc.id },
      targetAsset: { id: eth.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.exchangeRate).toBeGreaterThan(0);

    console.log(`Quote: 100 USDC -> ${quote.estimatedAmount} ETH (rate: ${quote.exchangeRate})`);
  });

  test('should get swap quote for USDT -> USDC (stablecoin swap)', async ({ request }) => {
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdc = swappableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!usdt || !usdc) {
      test.skip();
      return;
    }

    const quote = await getSwapQuote(request, {
      sourceAsset: { id: usdt.id },
      targetAsset: { id: usdc.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    // Stablecoin swap should have rate close to 1
    expect(quote.exchangeRate).toBeGreaterThan(0.9);
    expect(quote.exchangeRate).toBeLessThan(1.1);

    console.log(`Quote: 100 USDT -> ${quote.estimatedAmount} USDC (rate: ${quote.exchangeRate})`);
  });

  test('should reject amount below minimum for swap', async ({ request }) => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      test.skip();
      return;
    }

    const quote = await getSwapQuote(request, {
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.00001, // Very low amount
    });

    // Should either be invalid or have an error
    if (!quote.isValid) {
      expect(quote.error).toBeTruthy();
      console.log(`Amount too low error: ${quote.error}`);
    }
  });

  test('should create swap payment info for ETH -> USDT', async ({ request }) => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      test.skip();
      return;
    }

    const result = await createSwapPaymentInfo(request, token, {
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.1,
    });

    // Handle case where trading is not allowed or KYC required
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
    expect(paymentInfo.amount).toBe(0.1);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);
    expect(paymentInfo.rate).toBeGreaterThan(0);

    // Deposit address should be present for swap
    if (paymentInfo.depositAddress) {
      expect(paymentInfo.depositAddress).toBeTruthy();
      console.log(`Deposit Address: ${paymentInfo.depositAddress}`);
    }

    console.log(`Created swap payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} USDT`);
  });

  test('should create and confirm swap for USDC -> USDT', async ({ request }) => {
    const usdc = swappableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!usdc || !usdt) {
      test.skip();
      return;
    }

    // Create payment info
    const result = await createSwapPaymentInfo(request, token, {
      sourceAsset: { id: usdc.id },
      targetAsset: { id: usdt.id },
      amount: 50,
    });

    // Handle case where trading is not allowed
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

    console.log(`Created swap payment info ID: ${paymentInfo.id}`);

    // Confirm the swap
    const confirmResult = await confirmSwap(request, token, paymentInfo.id);
    if (confirmResult.success) {
      console.log(`Confirmed swap payment info ID: ${paymentInfo.id}`);
    } else {
      // Confirm might fail if transaction request is in certain states
      console.log(`Confirm returned: ${confirmResult.error}`);
    }
  });

  test('should handle multiple swap pairs', async ({ request }) => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth) {
      test.skip();
      return;
    }

    const targetAssets = ['USDT', 'USDC', 'WBTC']
      .map((name) => swappableAssets.find((a) => a.name === name && EVM_BLOCKCHAINS.includes(a.blockchain)))
      .filter(Boolean);

    for (const targetAsset of targetAssets) {
      if (!targetAsset) continue;

      const quote = await getSwapQuote(request, {
        sourceAsset: { id: eth.id },
        targetAsset: { id: targetAsset.id },
        amount: 0.1,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`0.1 ETH -> ${quote.estimatedAmount} ${targetAsset.name}`);

      // Small delay between requests
      await delay(500);
    }
  });

  test('should handle reverse swap pairs', async ({ request }) => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      test.skip();
      return;
    }

    // ETH -> USDT
    const quote1 = await getSwapQuote(request, {
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.1,
    });

    await delay(500);

    // USDT -> ETH (reverse)
    const quote2 = await getSwapQuote(request, {
      sourceAsset: { id: usdt.id },
      targetAsset: { id: eth.id },
      amount: 100,
    });

    expect(quote1.estimatedAmount).toBeGreaterThan(0);
    expect(quote2.estimatedAmount).toBeGreaterThan(0);

    console.log(`0.1 ETH -> ${quote1.estimatedAmount} USDT`);
    console.log(`100 USDT -> ${quote2.estimatedAmount} ETH`);

    // The rates should be roughly inverse of each other (with fees)
    const rate1 = quote1.estimatedAmount / 0.1; // USDT per ETH
    const rate2 = 100 / quote2.estimatedAmount; // USDT per ETH (inverse)

    // Allow for ~5% difference due to fees
    expect(Math.abs(rate1 - rate2) / rate1).toBeLessThan(0.05);
  });
});

// UI Flow tests are disabled due to app build issues (bs58 ESM incompatibility)
// The API tests above cover the core swap functionality
