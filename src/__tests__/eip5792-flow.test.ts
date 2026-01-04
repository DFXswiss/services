/**
 * EIP-5792 wallet_sendCalls Flow Tests
 *
 * Tests for the gasless transaction flow using EIP-5792 wallet_sendCalls
 * with Pimlico paymaster service.
 */

// Mock types
interface Eip5792Call {
  to: string;
  data: string;
  value: string;
}

interface Eip5792Data {
  paymasterUrl: string;
  chainId: number;
  calls: Eip5792Call[];
}

interface MockEthereumProvider {
  request: jest.Mock;
}

// Mock ethereum provider
const mockEthereumProvider: MockEthereumProvider = {
  request: jest.fn(),
};

// Helper to reset mocks
const resetMocks = () => {
  mockEthereumProvider.request.mockReset();
};

describe('EIP-5792 Flow', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('supportsEip5792Paymaster', () => {
    const supportsEip5792Paymaster = async (chainId: number): Promise<boolean> => {
      try {
        const account = '0x1234567890123456789012345678901234567890';
        const capabilities = await mockEthereumProvider.request({
          method: 'wallet_getCapabilities',
          params: [account],
        });

        const chainHex = `0x${chainId.toString(16)}`;
        return capabilities?.[chainHex]?.paymasterService?.supported === true;
      } catch {
        return false;
      }
    };

    it('should return true when wallet supports paymasterService on the chain', async () => {
      mockEthereumProvider.request.mockResolvedValue({
        '0x1': { paymasterService: { supported: true } },
        '0xa': { paymasterService: { supported: true } },
      });

      expect(await supportsEip5792Paymaster(1)).toBe(true); // Ethereum
      expect(await supportsEip5792Paymaster(10)).toBe(true); // Optimism
    });

    it('should return false when wallet does not support paymasterService', async () => {
      mockEthereumProvider.request.mockResolvedValue({
        '0x1': { paymasterService: { supported: false } },
      });

      expect(await supportsEip5792Paymaster(1)).toBe(false);
    });

    it('should return false when capabilities are empty', async () => {
      mockEthereumProvider.request.mockResolvedValue({});

      expect(await supportsEip5792Paymaster(1)).toBe(false);
    });

    it('should return false when chain is not in capabilities', async () => {
      mockEthereumProvider.request.mockResolvedValue({
        '0xa': { paymasterService: { supported: true } },
      });

      expect(await supportsEip5792Paymaster(1)).toBe(false); // Ethereum not in capabilities
    });

    it('should return false when request fails', async () => {
      mockEthereumProvider.request.mockRejectedValue(new Error('Wallet not connected'));

      expect(await supportsEip5792Paymaster(1)).toBe(false);
    });
  });

  describe('sendCallsWithPaymaster', () => {
    const sendCallsWithPaymaster = async (
      calls: Eip5792Call[],
      paymasterUrl: string,
      chainId: number,
    ): Promise<string> => {
      const account = '0x1234567890123456789012345678901234567890';
      const chainHex = `0x${chainId.toString(16)}`;

      // Check capabilities
      const capabilities = await mockEthereumProvider.request({
        method: 'wallet_getCapabilities',
        params: [account],
      });

      if (!capabilities?.[chainHex]?.paymasterService?.supported) {
        throw new Error('Wallet does not support EIP-5792 paymaster');
      }

      // Send calls
      const result = await mockEthereumProvider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: chainHex,
            from: account,
            calls: calls.map((c) => ({
              to: c.to,
              data: c.data,
              value: c.value,
            })),
            capabilities: {
              paymasterService: { url: paymasterUrl },
            },
          },
        ],
      });

      // Wait for confirmation
      const callsId = result.id ?? result;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const status = await mockEthereumProvider.request({
          method: 'wallet_getCallsStatus',
          params: [callsId],
        });

        if (status.status === 'CONFIRMED') {
          return status.receipts[0].transactionHash;
        }
        if (status.status === 'FAILED') {
          throw new Error('Transaction failed');
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 10)); // Short delay for test
      }

      throw new Error('Transaction timeout');
    };

    const mockCalls: Eip5792Call[] = [
      {
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a',
        value: '0x0',
      },
    ];

    const mockPaymasterUrl = 'https://api.pimlico.io/v2/ethereum/rpc?apikey=test';
    const mockChainId = 1;

    it('should successfully send transaction and return txHash', async () => {
      // Mock capabilities
      mockEthereumProvider.request.mockImplementation(async ({ method }) => {
        switch (method) {
          case 'wallet_getCapabilities':
            return { '0x1': { paymasterService: { supported: true } } };
          case 'wallet_sendCalls':
            return { id: 'calls-123' };
          case 'wallet_getCallsStatus':
            return {
              status: 'CONFIRMED',
              receipts: [{ transactionHash: '0xabc123' }],
            };
          default:
            throw new Error(`Unknown method: ${method}`);
        }
      });

      const txHash = await sendCallsWithPaymaster(mockCalls, mockPaymasterUrl, mockChainId);

      expect(txHash).toBe('0xabc123');
      expect(mockEthereumProvider.request).toHaveBeenCalledWith({
        method: 'wallet_sendCalls',
        params: expect.arrayContaining([
          expect.objectContaining({
            version: '1.0',
            chainId: '0x1',
            capabilities: {
              paymasterService: { url: mockPaymasterUrl },
            },
          }),
        ]),
      });
    });

    it('should throw error when wallet does not support paymaster', async () => {
      mockEthereumProvider.request.mockResolvedValue({
        '0x1': { paymasterService: { supported: false } },
      });

      await expect(sendCallsWithPaymaster(mockCalls, mockPaymasterUrl, mockChainId)).rejects.toThrow(
        'Wallet does not support EIP-5792 paymaster',
      );
    });

    it('should throw error when transaction fails', async () => {
      mockEthereumProvider.request.mockImplementation(async ({ method }) => {
        switch (method) {
          case 'wallet_getCapabilities':
            return { '0x1': { paymasterService: { supported: true } } };
          case 'wallet_sendCalls':
            return { id: 'calls-456' };
          case 'wallet_getCallsStatus':
            return { status: 'FAILED' };
          default:
            throw new Error(`Unknown method: ${method}`);
        }
      });

      await expect(sendCallsWithPaymaster(mockCalls, mockPaymasterUrl, mockChainId)).rejects.toThrow(
        'Transaction failed',
      );
    });

    it('should handle different chain IDs correctly', async () => {
      const testCases = [
        { chainId: 1, expected: '0x1' }, // Ethereum
        { chainId: 10, expected: '0xa' }, // Optimism
        { chainId: 137, expected: '0x89' }, // Polygon
        { chainId: 42161, expected: '0xa4b1' }, // Arbitrum
        { chainId: 8453, expected: '0x2105' }, // Base
      ];

      for (const { chainId, expected } of testCases) {
        resetMocks();

        mockEthereumProvider.request.mockImplementation(async ({ method }) => {
          switch (method) {
            case 'wallet_getCapabilities':
              return { [expected]: { paymasterService: { supported: true } } };
            case 'wallet_sendCalls':
              return { id: 'calls-test' };
            case 'wallet_getCallsStatus':
              return { status: 'CONFIRMED', receipts: [{ transactionHash: '0xtest' }] };
            default:
              throw new Error(`Unknown method: ${method}`);
          }
        });

        const txHash = await sendCallsWithPaymaster(mockCalls, mockPaymasterUrl, chainId);
        expect(txHash).toBe('0xtest');

        // Verify correct chainId was used
        const sendCallsCall = mockEthereumProvider.request.mock.calls.find(
          (call) => call[0].method === 'wallet_sendCalls',
        );
        expect(sendCallsCall[0].params[0].chainId).toBe(expected);
      }
    });
  });

  describe('EIP-5792 Data Structure', () => {
    it('should have correct structure for ERC20 transfer', () => {
      const eip5792Data: Eip5792Data = {
        paymasterUrl: 'https://api.pimlico.io/v2/ethereum/rpc?apikey=test',
        chainId: 1,
        calls: [
          {
            to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
            // transfer(address,uint256) - proper hex encoding
            data: '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000000000000000064',
            value: '0x0',
          },
        ],
      };

      expect(eip5792Data.paymasterUrl).toContain('pimlico.io');
      expect(eip5792Data.chainId).toBe(1);
      expect(eip5792Data.calls).toHaveLength(1);
      expect(eip5792Data.calls[0].to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(eip5792Data.calls[0].data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(eip5792Data.calls[0].value).toBe('0x0');
    });

    it('should support multiple calls in single transaction', () => {
      const eip5792Data: Eip5792Data = {
        paymasterUrl: 'https://api.pimlico.io/v2/ethereum/rpc?apikey=test',
        chainId: 1,
        calls: [
          { to: '0xToken1', data: '0xapprove...', value: '0x0' },
          { to: '0xToken2', data: '0xtransfer...', value: '0x0' },
        ],
      };

      expect(eip5792Data.calls).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle user rejection (code 4001)', async () => {
      const error = { code: 4001, message: 'User rejected the request' };

      mockEthereumProvider.request.mockRejectedValue(error);

      try {
        await mockEthereumProvider.request({ method: 'wallet_sendCalls', params: [] });
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe(4001);
      }
    });

    it('should handle pending request (code -32002)', async () => {
      const error = { code: -32002, message: 'Request already pending' };

      mockEthereumProvider.request.mockRejectedValue(error);

      try {
        await mockEthereumProvider.request({ method: 'wallet_sendCalls', params: [] });
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe(-32002);
      }
    });
  });
});
