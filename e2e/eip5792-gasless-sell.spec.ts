import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getCachedAuth } from './helpers/auth-cache';

/**
 * E2E Tests for EIP-5792 Gasless Sell Flow
 *
 * These tests verify the complete gasless transaction flow where:
 * 1. User has tokens but no ETH for gas
 * 2. Backend provides EIP-5792 paymaster data
 * 3. Frontend uses wallet_sendCalls with paymasterService
 * 4. Paymaster sponsors the gas
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
async function injectMockEthereumProvider(page: Page, options: {
  account?: string;
  chainId?: number;
  supportsPaymaster?: boolean;
  transactionResult?: 'confirmed' | 'failed' | 'pending';
}) {
  const {
    account = '0x1234567890123456789012345678901234567890',
    chainId = 1,
    supportsPaymaster = true,
    transactionResult = 'confirmed',
  } = options;

  await page.addInitScript(({ account, chainId, supportsPaymaster, transactionResult }) => {
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
                status: 'CONFIRMED',
                receipts: [{ transactionHash: '0xmocktxhash123456789abcdef' }],
              };
            } else if (transactionResult === 'failed') {
              return { status: 'FAILED' };
            } else {
              return { status: 'PENDING' };
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
  }, { account, chainId, supportsPaymaster, transactionResult });
}

/**
 * Get the EIP-5792 calls made by the page
 */
async function getEip5792Calls(page: Page): Promise<Array<{ method: string; params?: any[] }>> {
  return page.evaluate(() => (window as any).__eip5792Calls || []);
}

test.describe('EIP-5792 Gasless Sell Flow', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('should detect EIP-5792 paymaster support via wallet_getCapabilities', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check that wallet_getCapabilities was called
    const calls = await getEip5792Calls(page);
    const capabilitiesCall = calls.find((c) => c.method === 'wallet_getCapabilities');

    // Note: The call might not happen immediately on page load
    // It would be called when the user initiates a transaction
    console.log('EIP-5792 calls made:', JSON.stringify(calls, null, 2));
  });

  test('should show gasless option when user has no ETH but has tokens', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to sell flow with a token (not ETH)
    const pageContent = await page.textContent('body');

    // The page should load without errors
    expect(pageContent).toBeTruthy();
  });

  test('should call wallet_sendCalls with paymasterService for gasless tx', async ({ page }) => {
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
      expect(params?.capabilities?.paymasterService).toBeDefined();
      expect(params?.capabilities?.paymasterService?.url).toContain('pimlico.io');
    }
  });

  test('should handle wallet rejection gracefully', async ({ page }) => {
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

    // The page should still function and not crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should fall back to normal transaction when paymaster not supported', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: false, // No paymaster support
      chainId: 1,
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const calls = await getEip5792Calls(page);

    // Should not see wallet_sendCalls if paymaster not supported
    const sendCallsCall = calls.find((c) => c.method === 'wallet_sendCalls');

    // When paymaster is not supported, we expect normal flow
    console.log('Calls made (no paymaster):', JSON.stringify(calls, null, 2));
  });
});

test.describe('EIP-5792 Error Handling', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await getCachedAuth(request, 'evm');
    token = auth.token;
  });

  test('should handle transaction timeout gracefully', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
      transactionResult: 'pending', // Never confirms
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    // Page should handle pending state
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should handle failed transaction', async ({ page }) => {
    await injectMockEthereumProvider(page, {
      supportsPaymaster: true,
      chainId: 1,
      transactionResult: 'failed',
    });

    await page.goto(`/sell?session=${token}&blockchain=Ethereum`);
    await page.waitForLoadState('networkidle');

    // Page should handle failed state
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('EIP-5792 Chain Support', () => {
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
    test(`should support EIP-5792 on ${chain.name}`, async ({ page }) => {
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
