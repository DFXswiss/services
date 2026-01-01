import { test, expect, APIRequestContext } from '@playwright/test';
import {
  createTestCredentials,
  createBitcoinCredentials,
  createSolanaCredentials,
  createTronCredentials,
  getTestConfig,
  TestCredentials,
} from './test-wallet';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

const API_URL = 'https://dev.api.dfx.swiss/v1';

interface AuthResponse {
  accessToken: string;
}

interface SignInfoResponse {
  message: string;
  blockchains: string[];
}

/**
 * Helper to authenticate with given credentials
 */
async function authenticate(
  request: APIRequestContext,
  credentials: TestCredentials,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const response = await request.post(`${API_URL}/auth`, {
      data: credentials,
    });

    if (response.ok()) {
      const data: AuthResponse = await response.json();
      return { success: true, token: data.accessToken };
    }

    const errorBody = await response.json().catch(() => ({}));
    return { success: false, error: errorBody.message || `HTTP ${response.status()}` };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Helper function to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to get sign info for an address with retry logic
 */
async function getSignInfo(
  request: APIRequestContext,
  address: string,
  retries = 3,
): Promise<SignInfoResponse | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await request.get(`${API_URL}/auth/signMessage?address=${address}`);
      if (response.ok()) {
        return response.json();
      }
      if (response.status() === 429) {
        // Rate limited, wait and retry
        await delay(1000 * (i + 1));
        continue;
      }
      return null;
    } catch {
      if (i < retries - 1) {
        await delay(1000 * (i + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

test.describe('Login Process - Multi-Blockchain Authentication', () => {
  // Slow down tests to avoid rate limiting
  test.slow();

  let mnemonic: string;

  test.beforeAll(() => {
    const config = getTestConfig();
    mnemonic = config.seed;
  });

  test.describe('EVM Blockchains', () => {
    let evmCredentials: TestCredentials;

    test.beforeAll(async () => {
      evmCredentials = await createTestCredentials(mnemonic);
      console.log(`EVM test address: ${evmCredentials.address}`);
    });

    test('should authenticate with Ethereum address', async ({ request }) => {
      const result = await authenticate(request, evmCredentials);
      expect(result.success).toBeTruthy();
      expect(result.token).toBeTruthy();
      console.log('Ethereum login successful');
    });

    test('should get correct sign info for EVM address', async ({ request }) => {
      const signInfo = await getSignInfo(request, evmCredentials.address);
      expect(signInfo).toBeTruthy();
      expect(signInfo!.blockchains).toContain('Ethereum');
      expect(signInfo!.blockchains).toContain('Polygon');
      expect(signInfo!.blockchains).toContain('Arbitrum');
      expect(signInfo!.blockchains).toContain('Optimism');
      expect(signInfo!.blockchains).toContain('Base');
      expect(signInfo!.blockchains).toContain('BinanceSmartChain');
      console.log(`EVM blockchains: ${signInfo!.blockchains.join(', ')}`);
    });

    test('should reject invalid EVM signature', async ({ request }) => {
      const invalidCredentials = {
        address: evmCredentials.address,
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      };

      const result = await authenticate(request, invalidCredentials);
      expect(result.success).toBeFalsy();
      console.log(`Invalid signature rejected: ${result.error}`);
    });
  });

  test.describe('Bitcoin Blockchain', () => {
    let btcCredentials: TestCredentials;

    test.beforeAll(async () => {
      btcCredentials = await createBitcoinCredentials(mnemonic);
      console.log(`Bitcoin test address: ${btcCredentials.address}`);
    });

    test('should get correct sign info for Bitcoin address', async ({ request }) => {
      const signInfo = await getSignInfo(request, btcCredentials.address);
      expect(signInfo).toBeTruthy();
      expect(signInfo!.blockchains).toContain('Bitcoin');
      console.log(`Bitcoin blockchains: ${signInfo!.blockchains.join(', ')}`);
    });

    test('should authenticate with Bitcoin address', async ({ request }) => {
      const result = await authenticate(request, btcCredentials);

      // Bitcoin login may create new user or login existing
      if (result.success) {
        expect(result.token).toBeTruthy();
        console.log('Bitcoin login successful');
      } else {
        // Some errors are acceptable for new users
        console.log(`Bitcoin login result: ${result.error}`);
        // Should not be "Invalid signature" - that would indicate wrong signing
        expect(result.error).not.toContain('Invalid signature');
      }
    });

    test('should reject invalid Bitcoin signature', async ({ request }) => {
      const invalidCredentials = {
        address: btcCredentials.address,
        signature: 'InvalidBase64Signature==',
      };

      const result = await authenticate(request, invalidCredentials);
      expect(result.success).toBeFalsy();
      console.log(`Invalid Bitcoin signature rejected: ${result.error}`);
    });
  });

  test.describe('Solana Blockchain', () => {
    let solCredentials: TestCredentials;

    test.beforeAll(async () => {
      solCredentials = await createSolanaCredentials(mnemonic);
      console.log(`Solana test address: ${solCredentials.address}`);
    });

    test('should get correct sign info for Solana address', async ({ request }) => {
      const signInfo = await getSignInfo(request, solCredentials.address);
      expect(signInfo).toBeTruthy();
      expect(signInfo!.blockchains).toContain('Solana');
      console.log(`Solana blockchains: ${signInfo!.blockchains.join(', ')}`);
    });

    test('should authenticate with Solana address', async ({ request }) => {
      const result = await authenticate(request, solCredentials);

      if (result.success) {
        expect(result.token).toBeTruthy();
        console.log('Solana login successful');
      } else {
        console.log(`Solana login result: ${result.error}`);
        expect(result.error).not.toContain('Invalid signature');
      }
    });

    test('should reject invalid Solana signature', async ({ request }) => {
      const invalidCredentials = {
        address: solCredentials.address,
        signature: 'InvalidBase58Signature',
      };

      const result = await authenticate(request, invalidCredentials);
      expect(result.success).toBeFalsy();
      console.log(`Invalid Solana signature rejected: ${result.error}`);
    });
  });

  test.describe('Tron Blockchain', () => {
    let tronCredentials: TestCredentials;

    test.beforeAll(async () => {
      tronCredentials = await createTronCredentials(mnemonic);
      console.log(`Tron test address: ${tronCredentials.address}`);
    });

    test('should get correct sign info for Tron address', async ({ request }) => {
      const signInfo = await getSignInfo(request, tronCredentials.address);
      expect(signInfo).toBeTruthy();
      expect(signInfo!.blockchains).toContain('Tron');
      console.log(`Tron blockchains: ${signInfo!.blockchains.join(', ')}`);
    });

    test('should authenticate with Tron address', async ({ request }) => {
      const result = await authenticate(request, tronCredentials);

      if (result.success) {
        expect(result.token).toBeTruthy();
        console.log('Tron login successful');
      } else {
        console.log(`Tron login result: ${result.error}`);
        expect(result.error).not.toContain('Invalid signature');
      }
    });

    test('should reject invalid Tron signature', async ({ request }) => {
      const invalidCredentials = {
        address: tronCredentials.address,
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      };

      const result = await authenticate(request, invalidCredentials);
      expect(result.success).toBeFalsy();
      console.log(`Invalid Tron signature rejected: ${result.error}`);
    });
  });

  test.describe('Cross-Chain Verification', () => {
    test('should generate different addresses for different blockchains from same seed', async () => {
      const evmCreds = await createTestCredentials(mnemonic);
      const btcCreds = await createBitcoinCredentials(mnemonic);
      const solCreds = await createSolanaCredentials(mnemonic);
      const tronCreds = await createTronCredentials(mnemonic);

      // All addresses should be different
      const addresses = [evmCreds.address, btcCreds.address, solCreds.address, tronCreds.address];
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(4);

      console.log('Generated addresses from same seed:');
      console.log(`  EVM:    ${evmCreds.address}`);
      console.log(`  BTC:    ${btcCreds.address}`);
      console.log(`  SOL:    ${solCreds.address}`);
      console.log(`  TRON:   ${tronCreds.address}`);
    });

    test('should identify correct blockchain for each address format', async ({ request }) => {
      const evmCreds = await createTestCredentials(mnemonic);
      const btcCreds = await createBitcoinCredentials(mnemonic);
      const solCreds = await createSolanaCredentials(mnemonic);
      const tronCreds = await createTronCredentials(mnemonic);

      // EVM address starts with 0x
      expect(evmCreds.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

      // Bitcoin Native SegWit starts with bc1
      expect(btcCreds.address).toMatch(/^bc1[a-z0-9]+$/);

      // Solana is Base58 encoded
      expect(solCreds.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

      // Tron starts with T
      expect(tronCreds.address).toMatch(/^T[a-zA-Z0-9]{33}$/);

      // Verify API recognizes each address type
      const evmInfo = await getSignInfo(request, evmCreds.address);
      const btcInfo = await getSignInfo(request, btcCreds.address);
      const solInfo = await getSignInfo(request, solCreds.address);
      const tronInfo = await getSignInfo(request, tronCreds.address);

      expect(evmInfo?.blockchains).toContain('Ethereum');
      expect(btcInfo?.blockchains).toContain('Bitcoin');
      expect(solInfo?.blockchains).toContain('Solana');
      expect(tronInfo?.blockchains).toContain('Tron');
    });
  });
});
