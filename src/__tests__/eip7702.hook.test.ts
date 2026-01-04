/**
 * Unit tests for eip7702.hook.ts
 *
 * Tests the useEip7702 hook including:
 * - isSupported() blockchain validation
 * - signEip7702Data() delegation to MetaMask hook
 */

// Mock @dfx.swiss/react
jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {
    ETHEREUM: 'Ethereum',
    POLYGON: 'Polygon',
    ARBITRUM: 'Arbitrum',
    BASE: 'Base',
    OPTIMISM: 'Optimism',
    BINANCE_SMART_CHAIN: 'BinanceSmartChain',
    GNOSIS: 'Gnosis',
    BITCOIN: 'Bitcoin',
    LIGHTNING: 'Lightning',
    SOLANA: 'Solana',
  },
}));

// Mock MetaMask hook - must be defined inside the factory function
jest.mock('src/hooks/wallets/metamask.hook', () => {
  const mockFn = jest.fn();
  return {
    useMetaMask: () => ({
      signEip7702Delegation: mockFn,
    }),
    __mockSignEip7702Delegation: mockFn,
  };
});

// Import after mocks
import { Blockchain } from '@dfx.swiss/react';
import { useEip7702 } from 'src/hooks/eip7702.hook';
import { renderHook } from '@testing-library/react';

// Get reference to mock function
const { __mockSignEip7702Delegation: mockSignEip7702Delegation } = jest.requireMock('src/hooks/wallets/metamask.hook');

describe('useEip7702', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).ethereum = { isMetaMask: true };
  });

  describe('isSupported', () => {
    describe('supported blockchains', () => {
      it('should return true for Ethereum', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.ETHEREUM)).toBe(true);
      });

      it('should return true for Polygon', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.POLYGON)).toBe(true);
      });

      it('should return true for Arbitrum', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.ARBITRUM)).toBe(true);
      });

      it('should return true for Base', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.BASE)).toBe(true);
      });

      it('should return true for Optimism', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.OPTIMISM)).toBe(true);
      });

      it('should return true for BSC', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.BINANCE_SMART_CHAIN)).toBe(true);
      });

      it('should return true for Gnosis', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.GNOSIS)).toBe(true);
      });
    });

    describe('unsupported blockchains', () => {
      it('should return false for Bitcoin', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.BITCOIN)).toBe(false);
      });

      it('should return false for Lightning', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.LIGHTNING)).toBe(false);
      });

      it('should return false for Solana', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.SOLANA)).toBe(false);
      });

      it('should return false for Bitcoin (not EVM)', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.BITCOIN)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for undefined blockchain', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(undefined)).toBe(false);
      });

      it('should return false when MetaMask is not installed', () => {
        (window as any).ethereum = undefined;
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.ETHEREUM)).toBe(false);
      });

      it('should return false when wallet is not MetaMask', () => {
        (window as any).ethereum = { isMetaMask: false, isRabby: true };
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.ETHEREUM)).toBe(false);
      });
    });
  });

  describe('signEip7702Data', () => {
    const mockDelegationData = {
      relayerAddress: '0xRelayer',
      delegationManagerAddress: '0xDelegationManager',
      delegatorAddress: '0xDelegator',
      userNonce: 5,
      domain: {
        name: 'DelegationManager',
        version: '1',
        chainId: 1,
        verifyingContract: '0xDelegationManager',
      },
      types: {
        Delegation: [{ name: 'delegate', type: 'address' }],
        Caveat: [{ name: 'enforcer', type: 'address' }],
      },
      message: {
        delegate: '0xDelegate',
        delegator: '0xUser',
        authority: '0x0',
        caveats: [],
        salt: '12345',
      },
    };

    const mockSignedData = {
      delegation: {
        delegate: '0xDelegate',
        delegator: '0xUser',
        authority: '0x0',
        salt: '12345',
        signature: '0xDelegationSig',
      },
      authorization: {
        chainId: 1,
        address: '0xDelegator',
        nonce: 5,
        r: '0xR',
        s: '0xS',
        yParity: 0,
      },
    };

    it('should call signEip7702Delegation with correct parameters', async () => {
      mockSignEip7702Delegation.mockResolvedValue(mockSignedData);
      const { result } = renderHook(() => useEip7702());

      await result.current.signEip7702Data(mockDelegationData, '0xUserAddress');

      expect(mockSignEip7702Delegation).toHaveBeenCalledTimes(1);
      expect(mockSignEip7702Delegation).toHaveBeenCalledWith(mockDelegationData, '0xUserAddress');
    });

    it('should return the signed data from signEip7702Delegation', async () => {
      mockSignEip7702Delegation.mockResolvedValue(mockSignedData);
      const { result } = renderHook(() => useEip7702());

      const returnedData = await result.current.signEip7702Data(mockDelegationData, '0xUserAddress');

      expect(returnedData).toEqual(mockSignedData);
    });

    it('should propagate errors from signEip7702Delegation', async () => {
      const error = new Error('User rejected signing');
      mockSignEip7702Delegation.mockRejectedValue(error);
      const { result } = renderHook(() => useEip7702());

      await expect(result.current.signEip7702Data(mockDelegationData, '0xUserAddress')).rejects.toThrow(
        'User rejected signing',
      );
    });
  });

  describe('checkWalletCapabilities', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78';

    it('should return capabilities when wallet supports EIP-5792', async () => {
      const mockCapabilities = {
        '0x1': {
          atomicBatch: { supported: true },
          paymasterService: { supported: true },
        },
      };

      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockResolvedValue(mockCapabilities),
      };

      const { result } = renderHook(() => useEip7702());
      const capabilities = await result.current.checkWalletCapabilities(testAddress);

      expect((window as any).ethereum.request).toHaveBeenCalledWith({
        method: 'wallet_getCapabilities',
        params: [testAddress],
      });
      expect(capabilities).toEqual(mockCapabilities);
    });

    it('should return null when wallet does not support EIP-5792', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockRejectedValue(new Error('Method not supported')),
      };

      const { result } = renderHook(() => useEip7702());
      const capabilities = await result.current.checkWalletCapabilities(testAddress);

      expect(capabilities).toBeNull();
    });

    it('should return null when MetaMask is not installed', async () => {
      (window as any).ethereum = undefined;

      const { result } = renderHook(() => useEip7702());
      const capabilities = await result.current.checkWalletCapabilities(testAddress);

      expect(capabilities).toBeNull();
    });

    it('should return null when wallet is not MetaMask', async () => {
      (window as any).ethereum = {
        isMetaMask: false,
        isRabby: true,
        request: jest.fn(),
      };

      const { result } = renderHook(() => useEip7702());
      const capabilities = await result.current.checkWalletCapabilities(testAddress);

      expect(capabilities).toBeNull();
    });

    it('should handle empty capabilities response', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockResolvedValue({}),
      };

      const { result } = renderHook(() => useEip7702());
      const capabilities = await result.current.checkWalletCapabilities(testAddress);

      expect(capabilities).toEqual({});
    });
  });

  describe('isEthSignEnabled', () => {
    it('should return true when accounts are available', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78']),
      };

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect((window as any).ethereum.request).toHaveBeenCalledWith({
        method: 'eth_accounts',
      });
      expect(enabled).toBe(true);
    });

    it('should return false when no accounts are available', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockResolvedValue([]),
      };

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect(enabled).toBe(false);
    });

    it('should return false when accounts is null', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockResolvedValue(null),
      };

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect(enabled).toBe(false);
    });

    it('should return false when MetaMask is not installed', async () => {
      (window as any).ethereum = undefined;

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect(enabled).toBe(false);
    });

    it('should return false when wallet is not MetaMask', async () => {
      (window as any).ethereum = {
        isMetaMask: false,
        isRabby: true,
        request: jest.fn(),
      };

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect(enabled).toBe(false);
    });

    it('should return false when request throws error', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockRejectedValue(new Error('User rejected')),
      };

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect(enabled).toBe(false);
    });

    it('should return true when multiple accounts are available', async () => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: jest.fn().mockResolvedValue([
          '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
          '0x1234567890123456789012345678901234567890',
        ]),
      };

      const { result } = renderHook(() => useEip7702());
      const enabled = await result.current.isEthSignEnabled();

      expect(enabled).toBe(true);
    });
  });
});
