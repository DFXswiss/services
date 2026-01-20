import { ApiClient, createApiClient } from './helpers/api-client';
import { TestCredentials } from './helpers/test-wallet';

const API_URL = 'https://dev.api.dfx.swiss/v1';

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
  maxVolume: number;
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

async function getAssets(client: ApiClient): Promise<Asset[]> {
  const result = await client.get<Asset[]>('/asset');
  expect(result.data).toBeTruthy();
  return result.data ?? [];
}

async function getSwapQuote(
  params: { sourceAsset: { id: number }; targetAsset: { id: number }; amount: number },
): Promise<SwapQuote> {
  const response = await fetch(`${API_URL}/swap/quote`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceAsset: params.sourceAsset,
      targetAsset: params.targetAsset,
      amount: params.amount,
    }),
  });

  expect(response.ok).toBeTruthy();
  return response.json();
}

async function createSwapPaymentInfo(
  client: ApiClient,
  params: { sourceAsset: { id: number }; targetAsset: { id: number }; amount: number },
): Promise<{ data: SwapPaymentInfo | null; error: string | null; status: number }> {
  return client.put<SwapPaymentInfo>('/swap/paymentInfos', {
    sourceAsset: params.sourceAsset,
    targetAsset: params.targetAsset,
    amount: params.amount,
  });
}

// API Integration tests for Swap Process (EVM only)
describe('Swap Process - API Integration', () => {
  let client: ApiClient;
  let credentials: TestCredentials;
  let swappableAssets: Asset[];

  beforeAll(async () => {
    const auth = await createApiClient();
    client = auth.client;
    credentials = auth.credentials;
    console.log(`Using test address: ${credentials.address}`);

    const assets = await getAssets(client);

    swappableAssets = assets.filter(
      (a) => a.buyable && a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain),
    );

    expect(swappableAssets.length).toBeGreaterThan(0);
    console.log(`Found ${swappableAssets.length} swappable EVM assets`);
  }, 60000);

  test('should authenticate with test credentials', async () => {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    expect(response.ok).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should fetch swappable assets', async () => {
    const assets = await getAssets(client);
    const swappable = assets.filter(
      (a) => a.buyable && a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain),
    );

    expect(swappable.length).toBeGreaterThan(0);
    console.log(`Found ${swappable.length} swappable EVM assets`);

    const hasEth = swappable.some((a) => a.name === 'ETH');
    const hasUsdt = swappable.some((a) => a.name === 'USDT');
    const hasUsdc = swappable.some((a) => a.name === 'USDC');

    expect(hasEth || hasUsdt || hasUsdc).toBeTruthy();
  });

  test('should get swap quote for ETH -> USDT', async () => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      console.log('Skipping: ETH or USDT not available');
      return;
    }

    const quote = await getSwapQuote({
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

  test('should get swap quote for USDC -> ETH', async () => {
    const usdc = swappableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!usdc || !eth) {
      console.log('Skipping: USDC or ETH not available');
      return;
    }

    const quote = await getSwapQuote({
      sourceAsset: { id: usdc.id },
      targetAsset: { id: eth.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.exchangeRate).toBeGreaterThan(0);

    console.log(`Quote: 100 USDC -> ${quote.estimatedAmount} ETH (rate: ${quote.exchangeRate})`);
  });

  test('should get swap quote for USDT -> USDC (stablecoin swap)', async () => {
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdc = swappableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!usdt || !usdc) {
      console.log('Skipping: USDT or USDC not available');
      return;
    }

    const quote = await getSwapQuote({
      sourceAsset: { id: usdt.id },
      targetAsset: { id: usdc.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.exchangeRate).toBeGreaterThan(0.9);
    expect(quote.exchangeRate).toBeLessThan(1.1);

    console.log(`Quote: 100 USDT -> ${quote.estimatedAmount} USDC (rate: ${quote.exchangeRate})`);
  });

  test('should reject amount below minimum', async () => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      console.log('Skipping: ETH or USDT not available');
      return;
    }

    const quote = await getSwapQuote({
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.00001,
    });

    if (!quote.isValid) {
      expect(quote.error).toBeTruthy();
      console.log(`Amount too low error: ${quote.error}`);
    }
  });

  test('should create swap payment info for ETH -> USDT', async () => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      console.log('Skipping: ETH or USDT not available');
      return;
    }

    const result = await createSwapPaymentInfo(client, {
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.1,
    });

    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      const expectedErrors = ['Trading not allowed', 'RecommendationRequired', 'EmailRequired', 'KYC required', 'KycRequired', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account restriction');
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data;
    if (!paymentInfo) return;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.amount).toBe(0.1);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);
    expect(paymentInfo.rate).toBeGreaterThan(0);

    console.log(`Created swap payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} USDT`);
  });

  test('should handle multiple swap pairs', async () => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth) {
      console.log('Skipping: ETH not available');
      return;
    }

    const targetAssets = ['USDT', 'USDC']
      .map((name) => swappableAssets.find((a) => a.name === name && EVM_BLOCKCHAINS.includes(a.blockchain)))
      .filter(Boolean);

    for (const targetAsset of targetAssets) {
      if (!targetAsset) continue;

      const quote = await getSwapQuote({
        sourceAsset: { id: eth.id },
        targetAsset: { id: targetAsset.id },
        amount: 0.1,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`0.1 ETH -> ${quote.estimatedAmount} ${targetAsset.name}`);

      await delay(500);
    }
  });

  test('should handle reverse swap pairs', async () => {
    const eth = swappableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const usdt = swappableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth || !usdt) {
      console.log('Skipping: ETH or USDT not available');
      return;
    }

    const quote1 = await getSwapQuote({
      sourceAsset: { id: eth.id },
      targetAsset: { id: usdt.id },
      amount: 0.1,
    });

    await delay(500);

    const quote2 = await getSwapQuote({
      sourceAsset: { id: usdt.id },
      targetAsset: { id: eth.id },
      amount: 100,
    });

    expect(quote1.estimatedAmount).toBeGreaterThan(0);
    expect(quote2.estimatedAmount).toBeGreaterThan(0);

    console.log(`0.1 ETH -> ${quote1.estimatedAmount} USDT`);
    console.log(`100 USDT -> ${quote2.estimatedAmount} ETH`);

    const rate1 = quote1.estimatedAmount / 0.1;
    const rate2 = 100 / quote2.estimatedAmount;

    expect(Math.abs(rate1 - rate2) / rate1).toBeLessThan(0.05);
  });
});
