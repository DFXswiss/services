import { createTestCredentials, TestCredentials } from './helpers/test-wallet';

const API_URL = 'https://dev.api.dfx.swiss/v1';

interface AuthResponse {
  accessToken: string;
}

interface SignInfoResponse {
  message: string;
  blockchains: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticate(
  credentials: TestCredentials,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const data: AuthResponse = await response.json();
      return { success: true, token: data.accessToken };
    }

    const errorBody = await response.json().catch(() => ({}));
    return { success: false, error: (errorBody as { message?: string }).message || `HTTP ${response.status}` };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

async function getSignInfo(
  address: string,
  retries = 3,
): Promise<SignInfoResponse | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_URL}/auth/signMessage?address=${address}`);
      if (response.ok) {
        return response.json();
      }
      if (response.status === 429) {
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

// API Integration tests for Authentication (EVM only)
describe('Authentication - API Integration', () => {
  describe('EVM Authentication', () => {
    let evmCredentials: TestCredentials;

    beforeAll(async () => {
      evmCredentials = await createTestCredentials();
      console.log(`EVM test address: ${evmCredentials.address}`);
    }, 30000);

    test('should authenticate with Ethereum address', async () => {
      const result = await authenticate(evmCredentials);
      expect(result.success).toBeTruthy();
      expect(result.token).toBeTruthy();
      console.log('Ethereum login successful');
    });

    test('should get correct sign info for EVM address', async () => {
      const signInfo = await getSignInfo(evmCredentials.address);
      expect(signInfo).toBeTruthy();
      if (!signInfo) return;
      expect(signInfo.blockchains).toContain('Ethereum');
      expect(signInfo.blockchains).toContain('Polygon');
      expect(signInfo.blockchains).toContain('Arbitrum');
      expect(signInfo.blockchains).toContain('Optimism');
      expect(signInfo.blockchains).toContain('Base');
      expect(signInfo.blockchains).toContain('BinanceSmartChain');
      console.log(`EVM blockchains: ${signInfo.blockchains.join(', ')}`);
    });

    test('should reject invalid EVM signature', async () => {
      const invalidCredentials = {
        address: evmCredentials.address,
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      };

      const result = await authenticate(invalidCredentials);
      expect(result.success).toBeFalsy();
      console.log(`Invalid signature rejected: ${result.error}`);
    });
  });

  describe('Address Format Verification', () => {
    test('should generate valid EVM address format', async () => {
      const evmCreds = await createTestCredentials();
      expect(evmCreds.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      console.log(`Generated EVM address: ${evmCreds.address}`);
    });

    test('should verify API recognizes EVM address', async () => {
      const evmCreds = await createTestCredentials();
      const evmInfo = await getSignInfo(evmCreds.address);
      expect(evmInfo?.blockchains).toContain('Ethereum');
    });
  });
});
