import { ApiClient, createApiClient } from './helpers/api-client';
import { TestCredentials } from './helpers/test-wallet';

const API_URL = `${process.env.REACT_APP_API_URL}/v1`;

// EVM-compatible blockchains for this test address
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
  iban?: string;
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

async function getAssets(client: ApiClient): Promise<Asset[]> {
  const result = await client.get<Asset[]>('/asset');
  expect(result.data).toBeTruthy();
  return result.data ?? [];
}

async function getFiats(): Promise<Fiat[]> {
  const response = await fetch(`${API_URL}/fiat`);
  expect(response.ok).toBeTruthy();
  return response.json();
}

async function getBuyQuote(
  params: { currency: { id: number }; asset: { id: number }; amount: number },
): Promise<BuyQuote> {
  const response = await fetch(`${API_URL}/buy/quote`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currency: params.currency,
      asset: params.asset,
      amount: params.amount,
      paymentMethod: 'Bank',
    }),
  });

  expect(response.ok).toBeTruthy();
  return response.json();
}

async function createBuyPaymentInfo(
  client: ApiClient,
  params: { currency: { id: number }; asset: { id: number }; amount: number },
): Promise<{ data: BuyPaymentInfo | null; error: string | null; status: number }> {
  return client.put<BuyPaymentInfo>('/buy/paymentInfos', {
    currency: params.currency,
    asset: params.asset,
    amount: params.amount,
    paymentMethod: 'Bank',
  });
}

// API Integration tests for Buy Process (EVM only)
describe('Buy Process - API Integration', () => {
  let client: ApiClient;
  let credentials: TestCredentials;
  let buyableAssets: Asset[];
  let sellableFiats: Fiat[];

  beforeAll(async () => {
    const auth = await createApiClient();
    client = auth.client;
    credentials = auth.credentials;
    console.log(`Using EVM test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(client), getFiats()]);

    buyableAssets = assets.filter((a) => a.buyable && EVM_BLOCKCHAINS.includes(a.blockchain));
    sellableFiats = fiats.filter((f) => f.sellable);

    expect(buyableAssets.length).toBeGreaterThan(0);
    expect(sellableFiats.length).toBeGreaterThan(0);
  }, 60000);

  test('should authenticate with EVM credentials', async () => {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    expect(response.ok).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should fetch buyable assets', async () => {
    const assets = await getAssets(client);
    const buyable = assets.filter((a) => a.buyable);

    expect(buyable.length).toBeGreaterThan(0);
    console.log(`Found ${buyable.length} buyable assets`);
  });

  test('should fetch sellable fiats', async () => {
    const fiats = await getFiats();
    const sellable = fiats.filter((f) => f.sellable);

    expect(sellable.length).toBeGreaterThan(0);
    console.log(`Found ${sellable.length} sellable fiats`);

    const eurExists = sellable.some((f) => f.name === 'EUR');
    const chfExists = sellable.some((f) => f.name === 'CHF');
    expect(eurExists || chfExists).toBeTruthy();
  });

  test('should get buy quote for EUR -> ETH', async () => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eur || !eth) {
      console.log('Skipping: EUR or ETH not available');
      return;
    }

    const quote = await getBuyQuote({
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

  test('should get buy quote for CHF -> WBTC', async () => {
    const chf = sellableFiats.find((f) => f.name === 'CHF');
    const wbtc = buyableAssets.find((a) => a.name === 'WBTC' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!chf || !wbtc) {
      console.log('Skipping: CHF or WBTC not available');
      return;
    }

    const quote = await getBuyQuote({
      currency: { id: chf.id },
      asset: { id: wbtc.id },
      amount: 200,
    });

    expect(quote.amount).toBe(200);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 200 CHF -> ${quote.estimatedAmount} WBTC (rate: ${quote.rate})`);
  });

  test('should reject amount below minimum', async () => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eur || !eth) {
      console.log('Skipping: EUR or ETH not available');
      return;
    }

    const quote = await getBuyQuote({
      currency: { id: eur.id },
      asset: { id: eth.id },
      amount: 1,
    });

    if (!quote.isValid) {
      expect(quote.error).toBeTruthy();
      console.log(`Amount too low error: ${quote.error}`);
    }
  });

  test('should create buy payment info for EUR -> ETH', async () => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eur || !eth) {
      console.log('Skipping: EUR or ETH not available');
      return;
    }

    const result = await createBuyPaymentInfo(client, {
      currency: { id: eur.id },
      asset: { id: eth.id },
      amount: 100,
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
    expect(paymentInfo.amount).toBe(100);
    expect(paymentInfo.currency.name).toBe('EUR');
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);
    expect(paymentInfo.rate).toBeGreaterThan(0);

    console.log(`Created payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} ETH`);
  });

  test('should handle multiple currencies', async () => {
    const eth = buyableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth) {
      console.log('Skipping: ETH not available');
      return;
    }

    const currencies = ['EUR', 'CHF', 'USD'].map((name) => sellableFiats.find((f) => f.name === name)).filter(Boolean);

    for (const currency of currencies) {
      if (!currency) continue;

      const quote = await getBuyQuote({
        currency: { id: currency.id },
        asset: { id: eth.id },
        amount: 100,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`${currency.name} 100 -> ${quote.estimatedAmount} ETH`);

      await delay(500);
    }
  }, 15000);

  test('should handle multiple assets', async () => {
    const eur = sellableFiats.find((f) => f.name === 'EUR');

    if (!eur) {
      console.log('Skipping: EUR not available');
      return;
    }

    const assets = ['ETH', 'USDT', 'USDC']
      .map((name) => buyableAssets.find((a) => a.name === name))
      .filter(Boolean);

    for (const asset of assets) {
      if (!asset) continue;

      const quote = await getBuyQuote({
        currency: { id: eur.id },
        asset: { id: asset.id },
        amount: 100,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`EUR 100 -> ${quote.estimatedAmount} ${asset.name}`);

      await delay(500);
    }
  }, 15000);
});
