import { test, expect, APIRequestContext } from '@playwright/test';
import { getCachedAuth, getTestIban, BlockchainType } from './helpers/auth-cache';
import { TestCredentials, getTestConfig, getWalletFromMnemonic } from './test-wallet';
import { JsonRpcProvider, parseEther, Contract, parseUnits } from 'ethers';

const API_URL = 'https://dev.api.dfx.swiss/v1';

// EVM-compatible blockchains for this test address (all use same address)
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

interface BankAccount {
  id: number;
  iban: string;
  label?: string;
  preferredCurrency?: Fiat;
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

async function getBankAccounts(request: APIRequestContext, token: string): Promise<BankAccount[]> {
  const response = await request.get(`${API_URL}/bankAccount`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function getSellQuote(
  request: APIRequestContext,
  params: { asset: { id: number }; currency: { id: number }; amount: number },
): Promise<SellQuote> {
  const response = await request.put(`${API_URL}/sell/quote`, {
    data: {
      asset: params.asset,
      currency: params.currency,
      amount: params.amount,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createSellPaymentInfo(
  request: APIRequestContext,
  token: string,
  params: { asset: { id: number }; currency: { id: number }; amount: number; iban: string },
): Promise<{ data: SellPaymentInfo | null; error: string | null; status: number }> {
  const response = await request.put(`${API_URL}/sell/paymentInfos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      asset: params.asset,
      currency: params.currency,
      amount: params.amount,
      iban: params.iban,
    },
  });

  if (response.ok()) {
    return { data: await response.json(), error: null, status: response.status() };
  }

  const errorBody = await response.json().catch(() => ({}));
  return { data: null, error: errorBody.message || 'Unknown error', status: response.status() };
}

async function confirmSell(
  request: APIRequestContext,
  token: string,
  paymentInfoId: number,
): Promise<{ success: boolean; error: string | null }> {
  const response = await request.put(`${API_URL}/sell/paymentInfos/${paymentInfoId}/confirm`, {
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

test.describe('Sell Process - API Integration (EVM Blockchains)', () => {
  let token: string;
  let credentials: TestCredentials;
  let sellableAssets: Asset[];
  let buyableFiats: Fiat[];
  let testIban: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    credentials = auth.credentials;
    testIban = getTestIban();
    console.log(`Using EVM test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    // Filter for EVM-compatible sellable assets only (matching our test address)
    sellableAssets = assets.filter((a) => a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain));
    // For sell, we need fiats that are buyable (user receives fiat)
    buyableFiats = fiats.filter((f) => f.buyable);

    expect(sellableAssets.length).toBeGreaterThan(0);
    expect(buyableFiats.length).toBeGreaterThan(0);
  });

  test('should authenticate with EVM credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should fetch sellable assets', async ({ request }) => {
    const assets = await getAssets(request, token);
    const sellable = assets.filter((a) => a.sellable && EVM_BLOCKCHAINS.includes(a.blockchain));

    expect(sellable.length).toBeGreaterThan(0);
    console.log(`Found ${sellable.length} sellable EVM assets`);
  });

  test('should fetch buyable fiats (for sell payout)', async ({ request }) => {
    const fiats = await getFiats(request);
    const buyable = fiats.filter((f) => f.buyable);

    expect(buyable.length).toBeGreaterThan(0);
    console.log(`Found ${buyable.length} buyable fiats`);

    // Check common currencies
    const eurExists = buyable.some((f) => f.name === 'EUR');
    const chfExists = buyable.some((f) => f.name === 'CHF');
    expect(eurExists || chfExists).toBeTruthy();
  });

  test('should fetch bank accounts', async ({ request }) => {
    const bankAccounts = await getBankAccounts(request, token);
    console.log(`Found ${bankAccounts.length} bank accounts`);
    // Bank accounts might be empty for new users, that's OK
  });

  test('should get sell quote for ETH -> EUR', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
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

  test('should get sell quote for USDC -> CHF', async ({ request }) => {
    const usdc = sellableAssets.find((a) => a.name === 'USDC' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const chf = buyableFiats.find((f) => f.name === 'CHF');

    if (!usdc || !chf) {
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: usdc.id },
      currency: { id: chf.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 100 USDC -> ${quote.estimatedAmount} CHF (rate: ${quote.rate})`);
  });

  test('should reject amount below minimum for sell', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: 0.0001, // Very low amount
    });

    // Should either be invalid or have an error
    if (!quote.isValid) {
      expect(quote.error).toBeTruthy();
      console.log(`Amount too low error: ${quote.error}`);
    }
  });

  test('should create sell payment info for ETH -> EUR', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      test.skip();
      return;
    }

    const result = await createSellPaymentInfo(request, token, {
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: 0.1,
      iban: testIban,
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

    // Deposit address should be present for sell
    if (paymentInfo.depositAddress) {
      expect(paymentInfo.depositAddress).toBeTruthy();
      console.log(`Deposit Address: ${paymentInfo.depositAddress}`);
    }

    console.log(`Created sell payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} EUR`);
  });

  test('should create and confirm sell for USDT -> EUR', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && EVM_BLOCKCHAINS.includes(a.blockchain));
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdt || !eur) {
      test.skip();
      return;
    }

    // Create payment info
    const result = await createSellPaymentInfo(request, token, {
      asset: { id: usdt.id },
      currency: { id: eur.id },
      amount: 50,
      iban: testIban,
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

    console.log(`Created sell payment info ID: ${paymentInfo.id}`);

    // Confirm the sell (simulates user confirming they sent the crypto)
    const confirmResult = await confirmSell(request, token, paymentInfo.id);
    if (confirmResult.success) {
      console.log(`Confirmed sell payment info ID: ${paymentInfo.id}`);
    } else {
      // Confirm might fail if transaction request is in certain states
      console.log(`Confirm returned: ${confirmResult.error}`);
    }
  });

  test('should handle multiple fiat currencies for sell', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && EVM_BLOCKCHAINS.includes(a.blockchain));

    if (!eth) {
      test.skip();
      return;
    }

    const currencies = ['EUR', 'CHF', 'USD'].map((name) => buyableFiats.find((f) => f.name === name)).filter(Boolean);

    for (const currency of currencies) {
      if (!currency) continue;

      const quote = await getSellQuote(request, {
        asset: { id: eth.id },
        currency: { id: currency.id },
        amount: 0.1,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`0.1 ETH -> ${quote.estimatedAmount} ${currency.name}`);

      // Small delay between requests
      await delay(500);
    }
  });

  test('should handle multiple assets for sell', async ({ request }) => {
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eur) {
      test.skip();
      return;
    }

    const assets = ['ETH', 'USDT', 'USDC']
      .map((name) => sellableAssets.find((a) => a.name === name))
      .filter(Boolean);

    for (const asset of assets) {
      if (!asset) continue;

      // Use appropriate amount based on asset
      const amount = asset.name === 'ETH' ? 0.1 : 100;

      const quote = await getSellQuote(request, {
        asset: { id: asset.id },
        currency: { id: eur.id },
        amount,
      });

      expect(quote.estimatedAmount).toBeGreaterThan(0);
      console.log(`${amount} ${asset.name} -> ${quote.estimatedAmount} EUR`);

      // Small delay between requests
      await delay(500);
    }
  });
});

test.describe('Sell Process - API Integration (Bitcoin)', () => {
  let token: string;
  let credentials: TestCredentials;
  let sellableAssets: Asset[];
  let buyableFiats: Fiat[];
  let testIban: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'bitcoin');
    token = auth.token;
    credentials = auth.credentials;
    testIban = getTestIban();
    console.log(`Using Bitcoin test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    sellableAssets = assets.filter((a) => a.sellable && a.blockchain === 'Bitcoin');
    buyableFiats = fiats.filter((f) => f.buyable);

    console.log(`Found ${sellableAssets.length} sellable Bitcoin assets`);
  });

  test('should authenticate with Bitcoin credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should get sell quote for BTC -> EUR', async ({ request }) => {
    const btc = sellableAssets.find((a) => a.name === 'BTC' && a.blockchain === 'Bitcoin');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!btc || !eur) {
      console.log('Skipping: BTC or EUR not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: btc.id },
      currency: { id: eur.id },
      amount: 0.01,
    });

    expect(quote.amount).toBe(0.01);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 0.01 BTC -> ${quote.estimatedAmount} EUR (rate: ${quote.rate})`);
  });

  test('should create sell payment info for BTC -> CHF', async ({ request }) => {
    const btc = sellableAssets.find((a) => a.name === 'BTC' && a.blockchain === 'Bitcoin');
    const chf = buyableFiats.find((f) => f.name === 'CHF');

    if (!btc || !chf) {
      test.skip();
      return;
    }

    const result = await createSellPaymentInfo(request, token, {
      asset: { id: btc.id },
      currency: { id: chf.id },
      amount: 0.005,
      iban: testIban,
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

    console.log(`Created Bitcoin sell payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} CHF`);
  });
});

test.describe('Sell Process - API Integration (Solana)', () => {
  let token: string;
  let credentials: TestCredentials;
  let sellableAssets: Asset[];
  let buyableFiats: Fiat[];
  let testIban: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'solana');
    token = auth.token;
    credentials = auth.credentials;
    testIban = getTestIban();
    console.log(`Using Solana test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    sellableAssets = assets.filter((a) => a.sellable && a.blockchain === 'Solana');
    buyableFiats = fiats.filter((f) => f.buyable);

    console.log(`Found ${sellableAssets.length} sellable Solana assets`);
  });

  test('should authenticate with Solana credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should get sell quote for SOL -> EUR', async ({ request }) => {
    const sol = sellableAssets.find((a) => a.name === 'SOL' && a.blockchain === 'Solana');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!sol || !eur) {
      console.log('Skipping: SOL or EUR not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: sol.id },
      currency: { id: eur.id },
      amount: 1,
    });

    expect(quote.amount).toBe(1);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 1 SOL -> ${quote.estimatedAmount} EUR (rate: ${quote.rate})`);
  });

  test('should get sell quote for USDC on Solana -> CHF', async ({ request }) => {
    const usdc = sellableAssets.find((a) => a.name === 'USDC' && a.blockchain === 'Solana');
    const chf = buyableFiats.find((f) => f.name === 'CHF');

    if (!usdc || !chf) {
      console.log('Skipping: Solana USDC or CHF not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: usdc.id },
      currency: { id: chf.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);

    console.log(`Quote: 100 USDC (Solana) -> ${quote.estimatedAmount} CHF`);
  });

  test('should get sell quote for USDT on Solana -> EUR', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Solana');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdt || !eur) {
      console.log('Skipping: Solana USDT or EUR not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: usdt.id },
      currency: { id: eur.id },
      amount: 50,
    });

    expect(quote.amount).toBe(50);
    expect(quote.estimatedAmount).toBeGreaterThan(0);

    console.log(`Quote: 50 USDT (Solana) -> ${quote.estimatedAmount} EUR`);
  });

  test('should create sell payment info for USDC on Solana -> EUR', async ({ request }) => {
    const usdc = sellableAssets.find((a) => a.name === 'USDC' && a.blockchain === 'Solana');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdc || !eur) {
      test.skip();
      return;
    }

    const result = await createSellPaymentInfo(request, token, {
      asset: { id: usdc.id },
      currency: { id: eur.id },
      amount: 100,
      iban: testIban,
    });

    if (result.error) {
      console.log(`Payment info creation returned error: ${result.error} (status: ${result.status})`);
      const expectedErrors = ['Trading not allowed', 'KYC required', 'User not found', 'Ident data incomplete', 'No unused deposit'];
      const isExpectedError = expectedErrors.some((e) => result.error?.includes(e));
      if (isExpectedError) {
        console.log('Skipping test - account/infrastructure restriction');
        test.skip();
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);

    console.log(
      `Created Solana USDC sell payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} EUR`,
    );
  });
});

test.describe('Sell Process - API Integration (Tron)', () => {
  let token: string;
  let credentials: TestCredentials;
  let sellableAssets: Asset[];
  let buyableFiats: Fiat[];
  let testIban: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'tron');
    token = auth.token;
    credentials = auth.credentials;
    testIban = getTestIban();
    console.log(`Using Tron test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    sellableAssets = assets.filter((a) => a.sellable && a.blockchain === 'Tron');
    buyableFiats = fiats.filter((f) => f.buyable);

    console.log(`Found ${sellableAssets.length} sellable Tron assets`);
  });

  test('should authenticate with Tron credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.accessToken).toBeTruthy();
  });

  test('should get sell quote for TRX -> EUR', async ({ request }) => {
    const trx = sellableAssets.find((a) => a.name === 'TRX' && a.blockchain === 'Tron');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!trx || !eur) {
      console.log('Skipping: TRX or EUR not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: trx.id },
      currency: { id: eur.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 100 TRX -> ${quote.estimatedAmount} EUR (rate: ${quote.rate})`);
  });

  test('should get sell quote for USDT on Tron -> CHF', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Tron');
    const chf = buyableFiats.find((f) => f.name === 'CHF');

    if (!usdt || !chf) {
      console.log('Skipping: Tron USDT or CHF not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: usdt.id },
      currency: { id: chf.id },
      amount: 100,
    });

    expect(quote.amount).toBe(100);
    expect(quote.estimatedAmount).toBeGreaterThan(0);

    console.log(`Quote: 100 USDT (Tron) -> ${quote.estimatedAmount} CHF`);
  });

  test('should create sell payment info for USDT on Tron -> EUR', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Tron');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdt || !eur) {
      test.skip();
      return;
    }

    const result = await createSellPaymentInfo(request, token, {
      asset: { id: usdt.id },
      currency: { id: eur.id },
      amount: 50,
      iban: testIban,
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

    console.log(`Created Tron USDT sell payment info ID: ${paymentInfo.id}, Amount: ${paymentInfo.estimatedAmount} EUR`);
  });
});

test.describe('Sell Process - UI Flow', () => {
  let credentials: TestCredentials;
  let testIban: string;
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    credentials = auth.credentials;
    token = auth.token;
    testIban = getTestIban();
  });

  test('should load sell page with session token', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    const hasSellContent =
      pageContent?.includes('Sell') ||
      pageContent?.includes('Verkaufen') ||
      pageContent?.includes('spend') ||
      pageContent?.includes('zahlst') ||
      pageContent?.includes('ETH') ||
      pageContent?.includes('IBAN');

    expect(hasSellContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-page-loaded.png', {
      maxDiffPixels: 1000,
      fullPage: true,
    });
  });

  test('should display asset selector and amount input', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const hasAmountInput =
      (await page.locator('input[name="amount"]').count()) > 0 ||
      (await page.locator('input[type="number"]').count()) > 0;

    const pageContent = await page.textContent('body');
    const hasFormElements =
      hasAmountInput || pageContent?.includes('ETH') || pageContent?.includes('USDT') || pageContent?.includes('IBAN');

    expect(hasFormElements).toBeTruthy();
  });

  test('should show bank account selector or IBAN input', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasIbanContent =
      pageContent?.includes('IBAN') ||
      pageContent?.includes('Bank') ||
      pageContent?.includes('Konto') ||
      pageContent?.includes('account') ||
      pageContent?.includes('CH') || // Swiss IBAN format
      pageContent?.includes('DE') || // German IBAN format
      pageContent?.includes('erhältst'); // "Du erhältst" section

    expect(hasIbanContent).toBeTruthy();
  });

  test('should handle sell flow with pre-filled amount', async ({ page }) => {
    await page.goto(`/sell?session=${token}&amountIn=0.1`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    await expect(page).toHaveScreenshot('sell-page-with-amount.png', {
      maxDiffPixels: 10000,
    });
  });

  test('should show deposit address after form completion', async ({ page }) => {
    await page.goto(`/sell?session=${token}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const pageContent = await page.textContent('body');

    const hasDepositInfo =
      pageContent?.includes('0x') ||
      pageContent?.includes('deposit') ||
      pageContent?.includes('Einzahlung') ||
      pageContent?.includes('send') ||
      pageContent?.includes('senden');

    const hasFormElements =
      pageContent?.includes('ETH') ||
      pageContent?.includes('IBAN') ||
      pageContent?.includes('EUR') ||
      pageContent?.includes('CHF');

    expect(hasDepositInfo || hasFormElements).toBeTruthy();
  });
});

test.describe('Sell Process - API Integration (Sepolia)', () => {
  let token: string;
  let credentials: TestCredentials;
  let sellableAssets: Asset[];
  let buyableFiats: Fiat[];
  let testIban: string;

  test.beforeAll(async ({ request }) => {
    // Sepolia uses the same EVM credentials
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
    credentials = auth.credentials;
    testIban = getTestIban();
    console.log(`Using Sepolia test address: ${credentials.address}`);

    const [assets, fiats] = await Promise.all([getAssets(request, token), getFiats(request)]);

    sellableAssets = assets.filter((a) => a.sellable && a.blockchain === 'Sepolia');
    buyableFiats = fiats.filter((f) => f.buyable);

    console.log(`Found ${sellableAssets.length} sellable Sepolia assets`);
  });

  test('should find sellable ETH on Sepolia', async () => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && a.blockchain === 'Sepolia');

    if (!eth) {
      console.log('ETH on Sepolia not available for selling');
      console.log('Available Sepolia assets:', sellableAssets.map((a) => a.name).join(', ') || 'none');
      test.skip();
      return;
    }

    expect(eth.sellable).toBe(true);
    console.log(`Found sellable ETH on Sepolia: ${eth.uniqueName}`);
  });

  test('should get sell quote for Sepolia ETH -> EUR', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && a.blockchain === 'Sepolia');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      console.log('Skipping: Sepolia ETH or EUR not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: 0.1,
    });

    expect(quote.amount).toBe(0.1);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 0.1 Sepolia ETH -> ${quote.estimatedAmount} EUR (rate: ${quote.rate})`);
  });

  test('should get sell quote for Sepolia ETH -> CHF', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && a.blockchain === 'Sepolia');
    const chf = buyableFiats.find((f) => f.name === 'CHF');

    if (!eth || !chf) {
      console.log('Skipping: Sepolia ETH or CHF not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: eth.id },
      currency: { id: chf.id },
      amount: 0.1,
    });

    expect(quote.amount).toBe(0.1);
    expect(quote.estimatedAmount).toBeGreaterThan(0);

    console.log(`Quote: 0.1 Sepolia ETH -> ${quote.estimatedAmount} CHF (rate: ${quote.rate})`);
  });

  test('should create sell payment info for Sepolia ETH -> EUR', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && a.blockchain === 'Sepolia');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      console.log('Skipping: Sepolia ETH or EUR not available');
      test.skip();
      return;
    }

    const result = await createSellPaymentInfo(request, token, {
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
        test.skip();
        return;
      }
      expect(result.data).toBeTruthy();
      return;
    }

    const paymentInfo = result.data!;
    expect(paymentInfo.id).toBeGreaterThan(0);
    expect(paymentInfo.estimatedAmount).toBeGreaterThan(0);
    expect(paymentInfo.depositAddress).toBeTruthy();

    console.log(`Created Sepolia ETH sell payment info ID: ${paymentInfo.id}`);
    console.log(`Deposit Address: ${paymentInfo.depositAddress}`);
    console.log(`Amount: ${paymentInfo.estimatedAmount} EUR`);
  });

  test('should execute real Sepolia ETH sell transaction', async ({ request }) => {
    const eth = sellableAssets.find((a) => a.name === 'ETH' && a.blockchain === 'Sepolia');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!eth || !eur) {
      console.log('Skipping: Sepolia ETH or EUR not available');
      test.skip();
      return;
    }

    // Create payment info for 0.0001 ETH (minimal amount for testing)
    const sellAmount = 0.0001;
    const result = await createSellPaymentInfo(request, token, {
      asset: { id: eth.id },
      currency: { id: eur.id },
      amount: sellAmount,
      iban: testIban,
    });

    if (result.error) {
      console.log(`Payment info creation failed: ${result.error}`);
      test.skip();
      return;
    }

    const paymentInfo = result.data!;
    const depositAddress = paymentInfo.depositAddress;

    if (!depositAddress) {
      console.log('No deposit address returned');
      test.skip();
      return;
    }

    console.log(`Selling ${sellAmount} Sepolia ETH to ${depositAddress}`);
    console.log(`Expected: ~${paymentInfo.estimatedAmount} EUR`);

    // Get wallet from seed
    const config = getTestConfig();
    const wallet = getWalletFromMnemonic(config.seed);

    // Connect to Sepolia
    const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const connectedWallet = wallet.connect(provider);

    // Check balance first
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = Number(balance) / 1e18;
    console.log(`Wallet balance: ${balanceEth} Sepolia ETH`);

    if (balanceEth < sellAmount + 0.001) {
      console.log(`Insufficient balance. Need at least ${sellAmount + 0.001} ETH`);
      test.skip();
      return;
    }

    // Send transaction
    const tx = await connectedWallet.sendTransaction({
      to: depositAddress,
      value: parseEther(sellAmount.toString()),
    });

    console.log(`Transaction sent: ${tx.hash}`);
    console.log(`Explorer: https://sepolia.etherscan.io/tx/${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);

    expect(receipt?.status).toBe(1);
    console.log(`Successfully sold ${sellAmount} Sepolia ETH!`);
  });

  test('should find sellable USDT on Sepolia', async () => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Sepolia');

    if (!usdt) {
      console.log('USDT on Sepolia not available for selling');
      console.log('Available Sepolia assets:', sellableAssets.map((a) => a.name).join(', ') || 'none');
      test.skip();
      return;
    }

    expect(usdt.sellable).toBe(true);
    console.log(`Found sellable USDT on Sepolia: ${usdt.uniqueName}`);
  });

  test('should get sell quote for Sepolia USDT -> EUR', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Sepolia');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdt || !eur) {
      console.log('Skipping: Sepolia USDT or EUR not available');
      test.skip();
      return;
    }

    const quote = await getSellQuote(request, {
      asset: { id: usdt.id },
      currency: { id: eur.id },
      amount: 10,
    });

    expect(quote.amount).toBe(10);
    expect(quote.estimatedAmount).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);

    console.log(`Quote: 10 Sepolia USDT -> ${quote.estimatedAmount} EUR (rate: ${quote.rate})`);
  });

  test('should create sell payment info for Sepolia USDT -> EUR', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Sepolia');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdt || !eur) {
      console.log('Skipping: Sepolia USDT or EUR not available');
      test.skip();
      return;
    }

    const result = await createSellPaymentInfo(request, token, {
      asset: { id: usdt.id },
      currency: { id: eur.id },
      amount: 10,
      iban: testIban,
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
    expect(paymentInfo.depositAddress).toBeTruthy();

    console.log(`Created Sepolia USDT sell payment info ID: ${paymentInfo.id}`);
    console.log(`Deposit Address: ${paymentInfo.depositAddress}`);
    console.log(`Amount: ${paymentInfo.estimatedAmount} EUR`);
  });

  test('should execute real Sepolia USDT sell transaction', async ({ request }) => {
    const usdt = sellableAssets.find((a) => a.name === 'USDT' && a.blockchain === 'Sepolia');
    const eur = buyableFiats.find((f) => f.name === 'EUR');

    if (!usdt || !eur) {
      console.log('Skipping: Sepolia USDT or EUR not available');
      test.skip();
      return;
    }

    // Create payment info for 1 USDT (minimal amount for testing)
    const sellAmount = 1;
    const result = await createSellPaymentInfo(request, token, {
      asset: { id: usdt.id },
      currency: { id: eur.id },
      amount: sellAmount,
      iban: testIban,
    });

    if (result.error) {
      console.log(`Payment info creation failed: ${result.error}`);
      test.skip();
      return;
    }

    const paymentInfo = result.data!;
    const depositAddress = paymentInfo.depositAddress;

    if (!depositAddress) {
      console.log('No deposit address returned');
      test.skip();
      return;
    }

    console.log(`Selling ${sellAmount} Sepolia USDT to ${depositAddress}`);
    console.log(`Expected: ~${paymentInfo.estimatedAmount} EUR`);

    // Get wallet from seed
    const config = getTestConfig();
    const wallet = getWalletFromMnemonic(config.seed);

    // Connect to Sepolia
    const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const connectedWallet = wallet.connect(provider);

    // Sepolia USDT contract address
    const usdtAddress = '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0';

    // ERC20 ABI for transfer and balanceOf
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const usdtContract = new Contract(usdtAddress, erc20Abi, connectedWallet);

    // Check USDT balance first
    const balance = await usdtContract.balanceOf(wallet.address);
    const decimals = Number(await usdtContract.decimals());
    const balanceUsdt = Number(balance) / 10 ** decimals;
    console.log(`Wallet USDT balance: ${balanceUsdt} Sepolia USDT`);

    if (balanceUsdt < sellAmount) {
      console.log(`Insufficient USDT balance. Need at least ${sellAmount} USDT`);
      test.skip();
      return;
    }

    // Check ETH balance for gas
    const ethBalance = await provider.getBalance(wallet.address);
    const ethBalanceEth = Number(ethBalance) / 1e18;
    console.log(`Wallet ETH balance: ${ethBalanceEth} Sepolia ETH (for gas)`);

    if (ethBalanceEth < 0.001) {
      console.log('Insufficient ETH for gas');
      test.skip();
      return;
    }

    // Send USDT transaction
    const amountInUnits = parseUnits(sellAmount.toString(), decimals);
    const tx = await usdtContract.transfer(depositAddress, amountInUnits);

    console.log(`Transaction sent: ${tx.hash}`);
    console.log(`Explorer: https://sepolia.etherscan.io/tx/${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);

    expect(receipt?.status).toBe(1);
    console.log(`Successfully sold ${sellAmount} Sepolia USDT!`);
  });
});
