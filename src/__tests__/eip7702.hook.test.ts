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
    BITCOIN: 'Bitcoin',
    LIGHTNING: 'Lightning',
    SOLANA: 'Solana',
    OPTIMISM: 'Optimism',
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

      it('should return false for Optimism (not in supported list)', () => {
        const { result } = renderHook(() => useEip7702());
        expect(result.current.isSupported(Blockchain.OPTIMISM)).toBe(false);
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
});
