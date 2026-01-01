import { APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  createTestCredentials,
  createBitcoinCredentials,
  createSolanaCredentials,
  createTronCredentials,
  TestCredentials,
  getTestConfig,
} from '../test-wallet';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

const API_URL = 'https://dev.api.dfx.swiss/v1';

// Global cache for auth tokens to avoid rate limiting
const tokenCache: Map<string, { token: string; expiry: number }> = new Map();

// Cache for credentials
const credentialsCache: Map<string, TestCredentials> = new Map();

// Mutex for serializing auth requests
let authMutex: Promise<void> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BlockchainType = 'evm' | 'bitcoin' | 'solana' | 'tron';

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
    case 'bitcoin':
      credentials = await createBitcoinCredentials(config.seed);
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
      const response = await request.post(`${API_URL}/auth`, {
        data: credentials,
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
): Promise<{ token: string; credentials: TestCredentials }> {
  const credentials = await generateCredentials(type);
  const cacheKey = `${type}:${credentials.address}`;

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log(`Using cached token for ${type}`);
    return { token: cached.token, credentials };
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
      return { token: cachedAgain.token, credentials };
    }

    // Add delay between different blockchain auth requests
    await delay(1000);

    console.log(`Authenticating ${type} address: ${credentials.address}`);
    const token = await authenticateWithRetry(request, credentials);

    // Cache for 2 hours
    tokenCache.set(cacheKey, {
      token,
      expiry: Date.now() + 2 * 60 * 60 * 1000,
    });

    return { token, credentials };
  } finally {
    resolve!();
  }
}

export function getTestIban(): string {
  return getTestConfig().iban;
}
