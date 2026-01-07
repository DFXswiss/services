import { APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  createTestCredentials,
  createTestCredentialsWallet2,
  createBitcoinCredentials,
  createLightningCredentials,
  createSolanaCredentials,
  createTronCredentials,
  TestCredentials,
  getTestConfig,
} from '../test-wallet';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Use local API when running against local services, otherwise use dev API
const API_URL = process.env.API_URL || 'http://localhost:3000/v1';

// Lightning.space API URL for Lightning authentication (prod works, dev has internal SSL issues)
const LIGHTNING_API_URL = process.env.LIGHTNING_API_URL || 'https://lightning.space/v1';

// Global cache for auth tokens to avoid rate limiting
const tokenCache: Map<string, { token: string; expiry: number; lightningAddress?: string }> = new Map();

// Cache for credentials
const credentialsCache: Map<string, TestCredentials> = new Map();

// Mutex for serializing auth requests
let authMutex: Promise<void> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BlockchainType = 'evm' | 'evm-wallet2' | 'bitcoin' | 'lightning' | 'solana' | 'tron';

async function generateCredentials(type: BlockchainType): Promise<TestCredentials> {
  const cacheKey = type;
  if (credentialsCache.has(cacheKey)) {
    return credentialsCache.get(cacheKey)!;
  }

  const config = getTestConfig();
  let credentials: TestCredentials;

  switch (type) {
    case 'evm':
      credentials = await createTestCredentials(config.seed);
      break;
    case 'evm-wallet2':
      credentials = await createTestCredentialsWallet2(config.seed);
      break;
    case 'bitcoin':
      credentials = await createBitcoinCredentials(config.seed);
      break;
    case 'lightning':
      credentials = await createLightningCredentials(config.seed);
      break;
    case 'solana':
      credentials = await createSolanaCredentials(config.seed);
      break;
    case 'tron':
      credentials = await createTronCredentials(config.seed);
      break;
  }

  credentialsCache.set(cacheKey, credentials);
  return credentials;
}

async function authenticateWithRetry(
  request: APIRequestContext,
  credentials: TestCredentials,
  apiUrl: string = API_URL,
  maxRetries = 5,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Exponential backoff: 0, 2s, 4s, 8s, 16s
    if (attempt > 0) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.log(`Auth retry ${attempt}/${maxRetries}, waiting ${backoffMs}ms...`);
      await delay(backoffMs);
    }

    try {
      const response = await request.post(`${apiUrl}/auth`, {
        data: credentials,
        ignoreHTTPSErrors: true, // Allow self-signed certificates for dev environments
      });

      if (response.ok()) {
        const data = await response.json();
        return data.accessToken;
      }

      const status = response.status();
      if (status === 429) {
        console.log(`Rate limited (429), will retry...`);
        lastError = new Error(`Rate limited: ${status}`);
        continue;
      }

      // For other errors, fail immediately
      const body = await response.text().catch(() => 'unknown');
      throw new Error(`Auth failed with status ${status}: ${body}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Rate limited')) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error('Authentication failed after retries');
}

export async function getCachedAuth(
  request: APIRequestContext,
  type: BlockchainType,
): Promise<{ token: string; credentials: TestCredentials; lightningAddress?: string }> {
  const credentials = await generateCredentials(type);
  const cacheKey = `${type}:${credentials.address}`;

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log(`Using cached token for ${type}`);
    return { token: cached.token, credentials, lightningAddress: cached.lightningAddress };
  }

  // Serialize auth requests using mutex
  const currentMutex = authMutex;
  let resolve: () => void;
  authMutex = new Promise((r) => (resolve = r));

  try {
    await currentMutex;

    // Double-check cache after waiting for mutex
    const cachedAgain = tokenCache.get(cacheKey);
    if (cachedAgain && cachedAgain.expiry > Date.now()) {
      console.log(`Using cached token for ${type} (after mutex)`);
      return { token: cachedAgain.token, credentials, lightningAddress: cachedAgain.lightningAddress };
    }

    // Add delay between different blockchain auth requests
    await delay(1000);

    let token: string;
    let lightningAddress: string | undefined;

    if (type === 'lightning') {
      // Lightning flow: First authenticate with lightning.space to get LNURL and ownership proof
      console.log(`Authenticating ${type} address: ${credentials.address} via ${LIGHTNING_API_URL}`);
      const ldsResult = await authenticateLightning(request, credentials);
      lightningAddress = ldsResult.lightningAddress;

      // Then authenticate with DFX API using LNURL and ownership proof
      console.log(`Got Lightning address: ${lightningAddress}, LNURL: ${ldsResult.lnurl.substring(0, 30)}...`);
      console.log(`Authenticating with DFX API using LNURL...`);
      const dfxCredentials: TestCredentials = {
        address: ldsResult.lnurl,
        signature: ldsResult.ownershipProof,
      };
      token = await authenticateWithRetry(request, dfxCredentials, API_URL);
    } else {
      const apiUrl = API_URL;
      console.log(`Authenticating ${type} address: ${credentials.address} via ${apiUrl}`);
      token = await authenticateWithRetry(request, credentials, apiUrl);
    }

    // Cache for 2 hours
    tokenCache.set(cacheKey, {
      token,
      expiry: Date.now() + 2 * 60 * 60 * 1000,
      lightningAddress,
    });

    return { token, credentials, lightningAddress };
  } finally {
    resolve!();
  }
}

async function authenticateLightning(
  request: APIRequestContext,
  credentials: TestCredentials,
): Promise<{ accessToken: string; lightningAddress: string; lnurl: string; ownershipProof: string }> {
  // Step 1: Authenticate with lightning.space using Bitcoin credentials
  const authResponse = await request.post(`${LIGHTNING_API_URL}/auth`, {
    data: credentials,
    ignoreHTTPSErrors: true,
  });

  if (!authResponse.ok()) {
    const body = await authResponse.text().catch(() => 'unknown');
    throw new Error(`Lightning auth failed with status ${authResponse.status()}: ${body}`);
  }

  const authData = await authResponse.json();
  const ldsToken = authData.accessToken;
  const lightningAddress = authData.lightningAddress;

  // Step 2: Get user info with LNURL and ownership proof for DFX login
  const userResponse = await request.get(`${LIGHTNING_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${ldsToken}`,
    },
    ignoreHTTPSErrors: true,
  });

  if (!userResponse.ok()) {
    const body = await userResponse.text().catch(() => 'unknown');
    throw new Error(`Lightning user info failed with status ${userResponse.status()}: ${body}`);
  }

  const userData = await userResponse.json();

  return {
    accessToken: ldsToken,
    lightningAddress,
    lnurl: userData.lightning.addressLnurl,
    ownershipProof: userData.lightning.addressOwnershipProof,
  };
}

export function getTestIban(): string {
  return getTestConfig().iban;
}
