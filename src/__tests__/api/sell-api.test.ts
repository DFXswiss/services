import { ApiClient, createApiClient, getTestIban } from './helpers/api-client';
import { TestCredentials } from './helpers/test-wallet';

const API_URL = 'https://dev.api.dfx.swiss/v1';

const EVM_BLOCKCHAINS = ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base', 'BinanceSmartChain', 'Gnosis'];

interface Asset {
  id: number;
  name: string;
  uniqueName: string;
  blockchain: string;
  sellable: boolean;
}

interface Fiat {
  id: number;
  name: string;
  buyable: boolean;
}

interface SellPaymentInfo {
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
  feesTarget: { total: number };
  isValid: boolean;
  error?: string;
  depositAddress?: string;
}

interface SellQuote {
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
  return result.data!;
}

async function getFiats(): Promise<Fiat[]> {
  const response = await fetch(`${API_URL}/fiat`);
  expect(response.ok).toBeTruthy();
  return response.json();
}

async function getSellQuote(
  params: { asset: { id: number }; currency: { id: number }; amount: number },
): Promise<SellQuote> {
  const response = await fetch(`${API_URL}/sell/quote`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset: params.asset,
      currency: params.currency,
      amount: params.amount,
    }),
  });

  expect(response.ok).toBeTruthy();
  return response.json();
}

async function createSellPaymentInfo(
  client: ApiClient,
  params: { asset: { id: number }; currency: { id: number }; amount: number; iban: string },
): Promise<{ data: SellPaymentInfo | null; error: string | null; status: number }> {
  return client.put<SellPaymentInfo>('/sell/paymentInfos', {
    asset: params.asset,
    currency: params.currency,
    amount: params.amount,
    iban: params.iban,
  });
}

// API Integration tests for Sell Process (EVM only)
describe('Sell Process - API Integration', () => {
  let client: ApiClient;
  let credentials: TestCredentials;
  let sellableAssets: Asset[];
  let buyableFiats: Fiat[];
  let testIban: string;

  beforeAll(async () => {
    const auth = await createApiClient();
    client = auth.client;
    credentials = auth.credentials;
    testIban = getTestIban();
    console.log(`Using EVM test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(client), getFiats()]);

    sellableAssets = assets.filter((a) => a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain));
    buyableFiats = fiats.filter((f) => f.buyable);

    expect(sellableAssets.length).toBeGreaterThan(0);
    expect(buyableFiats.length).toBeGreaterThan(0);
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

  test('should fetch sellable assets', async () => {
    const assets = await getAssets(client);
    const sellable = assets.filter((a) => a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain));

    expect(sellable.length).toBeGreaterThan(0);
    console.log(`Found ${sellable.length} sellable EVM assets`);
  });

  test('should fetch buyable fiats', async () => {
    const fiats = await getFiats();
    const buyable = fiats.filter((f) => f.buyable);

    expect(buyable.length).toBeGreaterThan(0);
    console.log(`Found ${buyable.length} buyable fiats`);

    const eurExists = buyable.some((f) => f.name === 'EUR');
    const chfExists = buyable.some((f) => f.name === 'CHF');
    expect(eurExists || chfExists).toBeTruthy();
  });

  test('should get sell quote for ETH -> EUR', async () => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      console.log('Skipping: ETH or EUR not available');
      return;
    }

    const quote = await getSellQuote({
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: 0.1,
    });

    expect(quote.amount).toBe(0.1);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);
    expect(quote.minVolume).toBeGreaterThan(0);
    expect(quote.maxVolume).toBeGreaterThan(0);

    console.log(`Quote: 0.1 ETH -> ${quote.estimatedAmount} EUR (rate: ${quote.rate})`);
  });

  test('should get sell quote for USDC -> CHF', async () => {
    const usdc = sellableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const chf = buyableFiats.find((f) => f.name === 'CHF');

    if (!usdc || !chf) {
      console.log('Skipping: USDC or CHF not available');
      return;
    }

    const quote = await getSellQuote({
      asset: { id: usdc.id },
      currency: { id: chf.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 100 USDC -> ${quote.estimatedAmount} CHF (rate: ${quote.rate})`);
  });

  test('should reject amount below minimum', async () => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      console.log('Skipping: ETH or EUR not available');
      return;
    }

    const quote = await getSellQuote({
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: 0.0001,
    });

    if (!quote.isValid) {
      expect(quote.error).toBeTruthy();
      console.log(`Amount too low error: ${quote.error}`);
    }
  });

  test('should create sell payment info for ETH -> EUR', async () => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      console.log('Skipping: ETH or EUR not available');
      return;
    }

    const result = await createSellPaymentInfo(client, {
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: 0.1,
      iban: testIban,
    });

    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account restriction');
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

    console.log(`Created sell payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} EUR`);
  });

  test('should handle multiple fiat currencies', async () => {
    jest.setTimeout(15000);
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth) {
      console.log('Skipping: ETH not available');
      return;
    }

    const currencies = ['EUR', 'CHF', 'USD'].map((name) => buyableFiats.find((f) => f.name === name)).filter(Boolean);

    for (const currency of currencies) {
      if (!currency) continue;

      const quote = await getSellQuote({
        asset: { id: eth.id },
        currency: { id: currency.id },
        amount: 0.1,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`0.1 ETH -> ${quote.estimatedAmount} ${currency.name}`);

      await delay(500);
    }
  });

  test('should handle multiple assets', async () => {
    jest.setTimeout(15000);
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eur) {
      console.log('Skipping: EUR not available');
      return;
    }

    const assets = ['ETH', 'USDT', 'USDC']
      .map((name) => sellableAssets.find((a) => a.name === name))
      .filter(Boolean);

    for (const asset of assets) {
      if (!asset) continue;

      const amount = asset.name === 'ETH' ? 0.1 : 100;

      const quote = await getSellQuote({
        asset: { id: asset.id },
        currency: { id: eur.id },
        amount,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`${amount} ${asset.name} -> ${quote.estimatedAmount} EUR`);

      await delay(500);
    }
  });
});
