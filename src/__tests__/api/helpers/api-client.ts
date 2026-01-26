import { createTestCredentials, TestCredentials } from './test-wallet';

const API_URL = `${process.env.REACT_APP_API_URL}/v1`;

// Global cache for auth tokens to avoid rate limiting
const tokenCache: Map<string, { token: string; expiry: number }> = new Map();

// Cache for credentials
let cachedCredentials: TestCredentials | null = null;

// Mutex for serializing auth requests
let authMutex: Promise<void> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateCredentials(): Promise<TestCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  cachedCredentials = await createTestCredentials();
  return cachedCredentials;
}

async function authenticateWithRetry(
  credentials: TestCredentials,
  maxRetries = 5,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.log(`Auth retry ${attempt}/${maxRetries}, waiting ${backoffMs}ms...`);
      await delay(backoffMs);
    }

    try {
      const response = await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const data = await response.json();
        return data.accessToken;
      }

      const status = response.status;
      if (status === 429) {
        console.log(`Rate limited (429), will retry...`);
        lastError = new Error(`Rate limited: ${status}`);
        continue;
      }

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

async function getCachedAuth(): Promise<{ token: string; credentials: TestCredentials }> {
  const credentials = await generateCredentials();
  const cacheKey = `evm:${credentials.address}`;

  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    console.log(`Using cached token for evm`);
    return { token: cached.token, credentials };
  }

  const currentMutex = authMutex;
  let resolve: () => void = () => { /* noop */ };
  authMutex = new Promise((r) => (resolve = r));

  try {
    await currentMutex;

    const cachedAgain = tokenCache.get(cacheKey);
    if (cachedAgain && cachedAgain.expiry > Date.now()) {
      console.log(`Using cached token for evm (after mutex)`);
      return { token: cachedAgain.token, credentials };
    }

    await delay(1000);

    console.log(`Authenticating evm address: ${credentials.address}`);
    const token = await authenticateWithRetry(credentials);

    tokenCache.set(cacheKey, {
      token,
      expiry: Date.now() + 2 * 60 * 60 * 1000,
    });

    return { token, credentials };
  } finally {
    resolve();
  }
}

export { getTestIban } from './test-wallet';

export class ApiClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    requireAuth = true,
  ): Promise<{ data: T | null; error: string | null; status: number }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (response.ok) {
      const json = await response.json();
      return { data: json, error: null, status: response.status };
    }

    const errorBody = await response.json().catch(() => ({}));
    return {
      data: null,
      error: (errorBody as { message?: string }).message || 'Unknown error',
      status: response.status,
    };
  }

  async get<T>(path: string, requireAuth = true): Promise<{ data: T | null; error: string | null; status: number }> {
    return this.request<T>('GET', path, undefined, requireAuth);
  }

  async post<T>(path: string, data?: unknown, requireAuth = true): Promise<{ data: T | null; error: string | null; status: number }> {
    return this.request<T>('POST', path, data, requireAuth);
  }

  async put<T>(path: string, data?: unknown, requireAuth = true): Promise<{ data: T | null; error: string | null; status: number }> {
    return this.request<T>('PUT', path, data, requireAuth);
  }

  async delete<T>(path: string, requireAuth = true): Promise<{ data: T | null; error: string | null; status: number }> {
    return this.request<T>('DELETE', path, undefined, requireAuth);
  }
}

export async function createApiClient(): Promise<{ client: ApiClient; credentials: TestCredentials }> {
  const { token, credentials } = await getCachedAuth();
  return { client: new ApiClient(token), credentials };
}
