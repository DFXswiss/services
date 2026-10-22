import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Sell-Page Scenarios with a Mock EIP-5792 Provider
 *
 * These tests load sell-page scenarios with mocked wallet capabilities and call statuses.
 *
 * Note: These tests use a mock MetaMask provider since real MetaMask
 * extension testing requires complex browser automation.
 */

/**
 * Mock EIP-5792 wallet capabilities response
 */
const MOCK_CAPABILITIES = {
  '0x1': { paymasterService: { supported: true } }, // Ethereum
  '0xaa36a7': { paymasterService: { supported: true } }, // Sepolia
  '0xa': { paymasterService: { supported: true } }, // Optimism
  '0x89': { paymasterService: { supported: true } }, // Polygon
};

/**
 * Inject a mock ethereum provider into the page
 */
async function injectMockEthereumProvider(
  page: Page,
  options: {
    account?: string;
    chainId?: number;
    supportsPaymaster?: boolean;
    transactionResult?: 'confirmed' | 'failed' | 'pending';
  },
) {
  const {
    account = '0x1234567890123456789012345678901234567890',
    chainId = 1,
    supportsPaymaster = true,
    transactionResult = 'confirmed',
  } = options;

  await page.addInitScript(
    ({ account, chainId, supportsPaymaster, transactionResult }) => {
      const chainHex = `0x${chainId.toString(16)}`;

      // Track calls for assertions
      (window as any).__eip5792Calls = [];

      (window as any).ethereum = {
        isMetaMask: true,
        selectedAddress: account,
        chainId: chainHex,

        request: async ({ method, params }: { method: string; params?: any[] }) => {
          // Log the call for later assertion
          (window as any).__eip5792Calls.push({ method, params });

          switch (method) {
            case 'eth_accounts':
            case 'eth_requestAccounts':
              return [account];

            case 'eth_chainId':
              return chainHex;

            case 'wallet_switchEthereumChain':
              return null;

            case 'wallet_getCapabilities':
              if (supportsPaymaster) {
                return {
                  [chainHex]: { paymasterService: { supported: true } },
                };
              }
              return {};

            case 'wallet_sendCalls':
              // Simulate wallet_sendCalls for EIP-5792
              console.log('[Mock] wallet_sendCalls called with:', JSON.stringify(params));
              return { id: 'mock-calls-id-123' };

            case 'wallet_getCallsStatus':
              // Simulate different transaction states
              if (transactionResult === 'confirmed') {
                return {
                  status: 200,
                  receipts: [{ transactionHash: '0xmocktxhash123456789abcdef' }],
                };
              } else if (transactionResult === 'failed') {
                return { status: 500 };
              } else {
                return { status: 100 };
              }

            case 'personal_sign':
            case 'eth_sign':
              // Sign message
              return '0xmocksignature123456789';

            default:
              console.log('[Mock] Unknown method:', method);
              return null;
          }
        },

        on: (event: string, callback: Function) => {
          // Mock event listeners
        },

        removeListener: () => {},
      };
    },
    { account, chainId, supportsPaymaster, transactionResult },
  );
}

/**
 * Get the EIP-5792 calls made by the page
 */
async function getEip5792Calls(page: Page): Promise<Array<{ method: string; params?: any[] }>> {
  return page.evaluate(() => (window as any).__eip5792Calls || []);
}

test.describe('EIP-5792 Sell-Page Mock Scenarios', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('logs wallet calls after loading the sell page', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find a wallet_getCapabilities call if one occurred.
    const calls = await getEip5792Calls(page);
    const capabilitiesCall = calls.find((c) => c.method === 'wallet_getCapabilities');

    // The call is optional on page load; this test only logs observed calls.
    console.log('EIP-5792 calls made:', JSON.stringify(calls, null, 2));
  });

  test('checks that the sell page has content', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Read the sell page content; this test does not select an asset.
    const pageContent = await page.textContent('body');

    // This assertion only checks for non-empty page content.
    expect(pageContent).toBeTruthy();
  });

  test('checks v2 parameters when wallet_sendCalls is observed', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 11155111, // Sepolia
      transactionResult: 'confirmed',
    });

    await page.goto(`/sell?session=${token}&blockchain=Sepolia`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Fill in sell amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill('0.01');
      await page.waitForTimeout(1500);
    }

    // Try to initiate transaction
    const walletButton = page.locator('button:has-text("Wallet"), button:has-text("Transaktion")').first();
    if (await walletButton.isVisible().catch(() => false)) {
      await walletButton.click();
      await page.waitForTimeout(3000);
    }

    // Check the calls made
    const calls = await getEip5792Calls(page);
    console.log('All EIP-5792 calls:', JSON.stringify(calls, null, 2));

    // Look for wallet_sendCalls
    const sendCallsCall = calls.find((c) => c.method === 'wallet_sendCalls');
    if (sendCallsCall) {
      console.log('wallet_sendCalls params:', JSON.stringify(sendCallsCall.params, null, 2));

      // Verify paymasterService capability is included
      const params = sendCallsCall.params?.[0];
      expect(params?.version).toBe('2.0.0');
      expect(params?.atomicRequired).toBe(true);
      expect(params?.capabilities?.paymasterService).toBeDefined();
      expect(params?.capabilities?.paymasterService?.url).toContain('pimlico.io');
    }
  });

  test('loads the sell page with a rejection provider mock', async ({ page }) => {
    // Inject provider that simulates user rejection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        selectedAddress: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
        request: async ({ method }: { method: string }) => {
          if (method === 'wallet_sendCalls') {
            throw { code: 4001, message: 'User rejected the request' };
          }
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'wallet_getCapabilities') {
            return { '0x1': { paymasterService: { supported: true } } };
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    // The test only checks that the page has content.
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('logs wallet calls when paymaster support is absent', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: false, // No paymaster support
      chainId: 1,
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const calls = await getEip5792Calls(page);

    // Locate wallet_sendCalls if present; this test does not assert the fallback.
    const sendCallsCall = calls.find((c) => c.method === 'wallet_sendCalls');

    // Log observed calls without asserting which transaction path was used.
    console.log('Calls made (no paymaster):', JSON.stringify(calls, null, 2));
  });
});

test.describe('EIP-5792 Status Mock Page Scenarios', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('loads the sell page with a pending status mock', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
      transactionResult: 'pending', // Return the v2 pending status.
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    // The test only checks that the page has content.
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('loads the sell page with a failed status mock', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
      transactionResult: 'failed',
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    // The test only checks that the page has content.
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Sell-Page Chain Route Scenarios', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  const supportedChains = [
    { name: 'Ethereum', chainId: 1 },
    { name: 'Sepolia', chainId: 11155111 },
    { name: 'Optimism', chainId: 10 },
    { name: 'Polygon', chainId: 137 },
    { name: 'Arbitrum', chainId: 42161 },
    { name: 'Base', chainId: 8453 },
  ];

  for (const chain of supportedChains) {
    test(`loads the sell page with the ${chain.name} route parameter`, async ({ page }) => {
      await injectMockEthereumProvider(page, {
        supportsPaymaster: true,
        chainId: chain.chainId,
      });

      await page.goto(`/sell?session=${token}&blockchain=${chain.name}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });
  }
});
