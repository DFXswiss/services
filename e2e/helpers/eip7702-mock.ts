import { Page } from '@playwright/test';

/**
 * EIP-7702 Mock Provider Helper
 *
 * This helper provides utilities for testing EIP-7702 gasless transaction flows
 * where users can sell tokens without having ETH for gas fees.
 *
 * Key EIP-7702 Concepts:
 * - User signs an authorization allowing their EOA to temporarily delegate to a smart contract
 * - The DelegationManager contract validates the authorization and executes the transfer
 * - A relayer pays the gas fees on behalf of the user
 *
 * Contract Addresses (CREATE2 deployed on all supported chains):
 * - MetaMask Delegator: 0x63c0c19a282a1b52b07dd5a65b58948a07dae32b
 * - DelegationManager: 0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3
 */

// Known token addresses on Sepolia
export const SEPOLIA_TOKENS = {
  USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
  USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  DAI: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6',
};

// EIP-7702 Contract addresses
export const EIP7702_CONTRACTS = {
  METAMASK_DELEGATOR: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
  DELEGATION_MANAGER: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
  ROOT_AUTHORITY: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
};

// Chain IDs for supported networks
export const CHAIN_IDS = {
  ETHEREUM: 1,
  SEPOLIA: 11155111,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  POLYGON: 137,
  BASE: 8453,
  BSC: 56,
  GNOSIS: 100,
};

export interface Eip7702MockOptions {
  /** User's wallet address */
  account?: string;
  /** Chain ID (default: Sepolia) */
  chainId?: number;
  /** ETH balance in wei (default: 0 for gasless scenario) */
  ethBalance?: string;
  /** Token balances by address */
  tokenBalances?: Record<string, { balance: string; decimals: number; symbol: string }>;
  /** Whether backend returns gaslessAvailable */
  gaslessAvailable?: boolean;
  /** Result of eth_signTypedData_v4 */
  signatureResult?: 'success' | 'reject' | 'error' | 'timeout';
  /** Custom signature to return (hex string) */
  customSignature?: string;
  /** Simulate slow signing (ms) */
  signDelay?: number;
}

/**
 * Default token balances for common test scenarios
 */
export const DEFAULT_TOKEN_BALANCES: Record<string, { balance: string; decimals: number; symbol: string }> = {
  [SEPOLIA_TOKENS.USDT.toLowerCase()]: { balance: '100000000', decimals: 6, symbol: 'USDT' }, // 100 USDT
  [SEPOLIA_TOKENS.USDC.toLowerCase()]: { balance: '50000000', decimals: 6, symbol: 'USDC' }, // 50 USDC
  [SEPOLIA_TOKENS.DAI.toLowerCase()]: { balance: '25000000000000000000', decimals: 18, symbol: 'DAI' }, // 25 DAI
};

/**
 * Encode a uint256 value for EVM calls
 */
export function encodeUint256(value: string): string {
  const hex = BigInt(value).toString(16).padStart(64, '0');
  return '0x' + hex;
}

/**
 * Encode a string for EVM calls (ABI encoded)
 */
export function encodeString(str: string): string {
  const offset = '0000000000000000000000000000000000000000000000000000000000000020';
  const length = str.length.toString(16).padStart(64, '0');
  const hexStr = Buffer.from(str).toString('hex').padEnd(64, '0');
  return '0x' + offset + length + hexStr;
}

/**
 * Generate a mock EIP-7702 signature
 */
export function generateMockSignature(): string {
  const r = 'a'.repeat(64);
  const s = 'b'.repeat(64);
  const v = '1b'; // 27 in hex
  return '0x' + r + s + v;
}

/**
 * Create mock EIP-712 typed data for delegation
 */
export function createMockTypedData(
  chainId: number,
  delegatorAddress: string,
  relayerAddress: string = '0x1234567890123456789012345678901234567890',
) {
  return {
    domain: {
      name: 'DelegationManager',
      version: '1',
      chainId: chainId,
      verifyingContract: EIP7702_CONTRACTS.DELEGATION_MANAGER,
    },
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Delegation: [
        { name: 'delegate', type: 'address' },
        { name: 'delegator', type: 'address' },
        { name: 'authority', type: 'bytes32' },
        { name: 'caveats', type: 'Caveat[]' },
        { name: 'salt', type: 'uint256' },
      ],
      Caveat: [
        { name: 'enforcer', type: 'address' },
        { name: 'terms', type: 'bytes' },
      ],
    },
    primaryType: 'Delegation',
    message: {
      delegate: relayerAddress,
      delegator: delegatorAddress,
      authority: EIP7702_CONTRACTS.ROOT_AUTHORITY,
      caveats: [],
      salt: '0',
    },
  };
}

/**
 * Inject EIP-7702 mock Ethereum provider into page
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 */
export async function injectEip7702MockProvider(page: Page, options: Eip7702MockOptions = {}): Promise<void> {
  const {
    account = '0x1234567890123456789012345678901234567890',
    chainId = CHAIN_IDS.SEPOLIA,
    ethBalance = '0',
    tokenBalances = DEFAULT_TOKEN_BALANCES,
    gaslessAvailable = true,
    signatureResult = 'success',
    customSignature,
    signDelay = 0,
  } = options;

  await page.addInitScript(
    ({ account, chainId, ethBalance, tokenBalances, signatureResult, customSignature, signDelay }) => {
      const chainHex = `0x${chainId.toString(16)}`;

      // Initialize tracking
      (window as any).__eip7702Calls = [];
      (window as any).__eip7702Config = {
        account,
        chainId,
        ethBalance,
        tokenBalances,
        signatureResult,
      };

      // Helper to encode uint256
      const encodeUint256 = (value: string) => {
        const hex = BigInt(value).toString(16).padStart(64, '0');
        return '0x' + hex;
      };

      // Create mock provider
      (window as any).ethereum = {
        isMetaMask: true,
        selectedAddress: account,
        chainId: chainHex,
        networkVersion: chainId.toString(),

        request: async ({ method, params }: { method: string; params?: any[] }) => {
          // Track all calls
          (window as any).__eip7702Calls.push({
            method,
            params,
            timestamp: Date.now(),
          });

          console.log(`[EIP-7702 Mock] ${method}`, params);

          switch (method) {
            // Account methods
            case 'eth_accounts':
            case 'eth_requestAccounts':
              return [account];

            // Chain methods
            case 'eth_chainId':
              return chainHex;

            case 'wallet_switchEthereumChain':
              return null;

            case 'wallet_addEthereumChain':
              return null;

            // Balance methods
            case 'eth_getBalance':
              return encodeUint256(ethBalance);

            // Contract calls (ERC20)
            case 'eth_call': {
              const callData = params?.[0];
              if (!callData?.to) return '0x';

              const to = callData.to.toLowerCase();
              const data = (callData.data as string) || '';
              const tokenInfo = tokenBalances[to];

              if (tokenInfo) {
                // balanceOf(address) - 0x70a08231
                if (data.startsWith('0x70a08231')) {
                  return encodeUint256(tokenInfo.balance);
                }

                // decimals() - 0x313ce567
                if (data.startsWith('0x313ce567')) {
                  return encodeUint256(tokenInfo.decimals.toString());
                }

                // symbol() - 0x95d89b41
                if (data.startsWith('0x95d89b41')) {
                  // ABI encode the symbol string
                  const symbol = tokenInfo.symbol;
                  const offset = '0000000000000000000000000000000000000000000000000000000000000020';
                  const length = symbol.length.toString(16).padStart(64, '0');
                  const hexSymbol = Array.from(symbol)
                    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
                    .join('')
                    .padEnd(64, '0');
                  return '0x' + offset + length + hexSymbol;
                }

                // name() - 0x06fdde03
                if (data.startsWith('0x06fdde03')) {
                  const name = 'Tether USD';
                  const offset = '0000000000000000000000000000000000000000000000000000000000000020';
                  const length = name.length.toString(16).padStart(64, '0');
                  const hexName = Array.from(name)
                    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
                    .join('')
                    .padEnd(64, '0');
                  return '0x' + offset + length + hexName;
                }
              }

              return '0x';
            }

            // EIP-5792 capabilities (return empty - we're testing EIP-7702)
            case 'wallet_getCapabilities':
              return {};

            // EIP-7702 signing (eth_signTypedData_v4)
            case 'eth_signTypedData_v4': {
              console.log('[EIP-7702 Mock] eth_signTypedData_v4 called');

              // Simulate delay if configured
              if (signDelay > 0) {
                await new Promise((resolve) => setTimeout(resolve, signDelay));
              }

              switch (signatureResult) {
                case 'reject':
                  throw { code: 4001, message: 'User rejected the request' };

                case 'error':
                  throw { code: -32603, message: 'Internal JSON-RPC error' };

                case 'timeout':
                  await new Promise((resolve) => setTimeout(resolve, 60000));
                  throw { code: -32603, message: 'Request timed out' };

                case 'success':
                default:
                  if (customSignature) {
                    return customSignature;
                  }
                  // Generate mock signature: r (32 bytes) + s (32 bytes) + v (1 byte)
                  return '0x' + 'a'.repeat(64) + 'b'.repeat(64) + '1b';
              }
            }

            // Standard signing (for DFX auth)
            case 'personal_sign':
              return '0x' + 'c'.repeat(130);

            // Transaction sending (should NOT be called in gasless flow)
            case 'eth_sendTransaction':
              console.warn('[EIP-7702 Mock] eth_sendTransaction called - unexpected in gasless flow');
              return '0x' + 'd'.repeat(64);

            // Gas estimation
            case 'eth_estimateGas':
              return '0x5208'; // 21000 gas

            case 'eth_gasPrice':
              return '0x3b9aca00'; // 1 gwei

            // Block info
            case 'eth_blockNumber':
              return '0x1234567';

            default:
              console.log('[EIP-7702 Mock] Unhandled method:', method);
              return null;
          }
        },

        on: (event: string, callback: Function) => {
          console.log('[EIP-7702 Mock] Event listener registered:', event);
        },

        removeListener: (event: string, callback: Function) => {
          console.log('[EIP-7702 Mock] Event listener removed:', event);
        },

        removeAllListeners: () => {},

        // Legacy methods for compatibility
        enable: async () => [account],
        send: async (method: string, params?: any[]) => {
          return (window as any).ethereum.request({ method, params });
        },
        sendAsync: (request: any, callback: Function) => {
          (window as any).ethereum
            .request(request)
            .then((result: any) => callback(null, { result }))
            .catch((error: any) => callback(error));
        },
      };

      // Also set as window.web3 for legacy compatibility
      (window as any).web3 = {
        currentProvider: (window as any).ethereum,
      };
    },
    {
      account,
      chainId,
      ethBalance,
      tokenBalances,
      signatureResult,
      customSignature,
      signDelay,
    },
  );
}

/**
 * Get all EIP-7702 related RPC calls made by the page
 */
export async function getEip7702Calls(
  page: Page,
): Promise<Array<{ method: string; params?: any[]; timestamp: number }>> {
  return page.evaluate(() => (window as any).__eip7702Calls || []);
}

/**
 * Check if eth_signTypedData_v4 was called (indicates EIP-7702 flow)
 */
export async function wasEip7702SigningCalled(page: Page): Promise<boolean> {
  const calls = await getEip7702Calls(page);
  return calls.some((c) => c.method === 'eth_signTypedData_v4');
}

/**
 * Get the typed data that was passed to eth_signTypedData_v4
 */
export async function getSignedTypedData(page: Page): Promise<any | null> {
  const calls = await getEip7702Calls(page);
  const signCall = calls.find((c) => c.method === 'eth_signTypedData_v4');

  if (signCall?.params?.[1]) {
    try {
      return JSON.parse(signCall.params[1]);
    } catch {
      return signCall.params[1];
    }
  }

  return null;
}

/**
 * Get the current mock configuration from the page
 */
export async function getMockConfig(page: Page): Promise<Eip7702MockOptions | null> {
  return page.evaluate(() => (window as any).__eip7702Config || null);
}

/**
 * Update token balance dynamically during test
 */
export async function updateTokenBalance(
  page: Page,
  tokenAddress: string,
  balance: string,
  decimals?: number,
  symbol?: string,
): Promise<void> {
  await page.evaluate(
    ({ tokenAddress, balance, decimals, symbol }) => {
      const config = (window as any).__eip7702Config;
      if (config?.tokenBalances) {
        const existing = config.tokenBalances[tokenAddress.toLowerCase()];
        config.tokenBalances[tokenAddress.toLowerCase()] = {
          balance,
          decimals: decimals ?? existing?.decimals ?? 18,
          symbol: symbol ?? existing?.symbol ?? 'TOKEN',
        };
      }
    },
    { tokenAddress, balance, decimals, symbol },
  );
}

/**
 * Update ETH balance dynamically during test
 */
export async function updateEthBalance(page: Page, balance: string): Promise<void> {
  await page.evaluate(
    ({ balance }) => {
      const config = (window as any).__eip7702Config;
      if (config) {
        config.ethBalance = balance;
      }
    },
    { balance },
  );
}

/**
 * Wait for a specific RPC method to be called
 */
export async function waitForRpcCall(
  page: Page,
  method: string,
  timeout: number = 10000,
): Promise<{ method: string; params?: any[]; timestamp: number } | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const calls = await getEip7702Calls(page);
    const call = calls.find((c) => c.method === method);
    if (call) return call;
    await page.waitForTimeout(100);
  }

  return null;
}
