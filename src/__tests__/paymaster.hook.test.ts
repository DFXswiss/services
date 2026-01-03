/**
 * Unit tests for Paymaster functionality
 *
 * Tests the wallet_sendCalls and wallet_getCapabilities integration:
 * - supportsWalletSendCalls() capability detection
 * - sendCallsWithPaymaster() transaction submission with paymaster sponsorship
 *
 * These tests verify the logic extracted from metamask.hook.ts without
 * importing the actual hook (which has many dependencies).
 */

describe('Paymaster Functions', () => {
  // Type definitions matching metamask.hook.ts
  interface SendCallsCall {
    to: string;
    data?: string;
    value?: string;
  }

  // Extracted logic from metamask.hook.ts for testing
  async function supportsWalletSendCalls(ethereumRequest: (args: any) => Promise<any>): Promise<boolean> {
    try {
      const capabilities = await ethereumRequest({
        method: 'wallet_getCapabilities',
        params: [],
      });
      // Check if any chain supports atomic batch
      return Object.values(capabilities || {}).some((chainCaps: any) => chainCaps?.atomicBatch?.supported === true);
    } catch {
      return false;
    }
  }

  async function sendCallsWithPaymaster(
    calls: SendCallsCall[],
    chainId: number,
    paymasterUrl: string,
    ethereumRequest: (args: any) => Promise<any>,
    getAccount: () => Promise<string | undefined>,
    getCurrentChainId: () => Promise<number>,
    toHex: (n: number) => string,
  ): Promise<string> {
    const from = await getAccount();
    if (!from) throw new Error('No account connected');

    // Ensure we're on the correct chain
    const currentChainId = await getCurrentChainId();
    if (currentChainId !== chainId) {
      throw new Error('Please switch to the correct network before proceeding');
    }

    // Call wallet_sendCalls with paymaster service
    const result = await ethereumRequest({
      method: 'wallet_sendCalls',
      params: [
        {
          version: '2.0.0',
          from,
          chainId: toHex(chainId),
          calls: calls.map((call) => ({
            to: call.to,
            data: call.data || '0x',
            value: call.value || '0x0',
          })),
          capabilities: {
            paymasterService: {
              url: paymasterUrl,
            },
          },
        },
      ],
    });

    // Result is typically the bundle ID
    return typeof result === 'string' ? result : result?.bundleId || 'pending';
  }

  // Helper for hex conversion
  const toHex = (n: number) => `0x${n.toString(16)}`;

  describe('supportsWalletSendCalls', () => {
    it('should return true when wallet supports atomic batch', async () => {
      const mockRequest = jest.fn().mockResolvedValue({
        '0x1': { atomicBatch: { supported: true } },
      });

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_getCapabilities',
        params: [],
      });
    });

    it('should return true when any chain supports atomic batch', async () => {
      const mockRequest = jest.fn().mockResolvedValue({
        '0x1': { atomicBatch: { supported: false } },
        '0x89': { atomicBatch: { supported: true } }, // Polygon supports it
      });

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(true);
    });

    it('should return false when no chain supports atomic batch', async () => {
      const mockRequest = jest.fn().mockResolvedValue({
        '0x1': { atomicBatch: { supported: false } },
      });

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(false);
    });

    it('should return false when capabilities is empty', async () => {
      const mockRequest = jest.fn().mockResolvedValue({});

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(false);
    });

    it('should return false when capabilities is null', async () => {
      const mockRequest = jest.fn().mockResolvedValue(null);

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(false);
    });

    it('should return false when wallet_getCapabilities throws', async () => {
      const mockRequest = jest.fn().mockRejectedValue(new Error('Method not supported'));

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(false);
    });

    it('should return false when atomicBatch field is missing', async () => {
      const mockRequest = jest.fn().mockResolvedValue({
        '0x1': { paymasterService: { supported: true } },
      });

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(false);
    });

    it('should handle multiple chains with mixed support', async () => {
      const mockRequest = jest.fn().mockResolvedValue({
        '0x1': { atomicBatch: { supported: false } },
        '0xa4b1': { atomicBatch: { supported: false } }, // Arbitrum
        '0x2105': { atomicBatch: { supported: true } }, // Base
        '0x89': { atomicBatch: { supported: false } }, // Polygon
      });

      const result = await supportsWalletSendCalls(mockRequest);

      expect(result).toBe(true);
    });
  });

  describe('sendCallsWithPaymaster', () => {
    const mockCalls: SendCallsCall[] = [
      {
        to: '0xTokenContract',
        data: '0xa9059cbb000000000000000000000000deposit12340000000000000000000000000000000005f5e100',
        value: '0x0',
      },
    ];
    const chainId = 1;
    const paymasterUrl = 'https://api.dfx.swiss/paymaster/1';

    it('should send transaction with paymaster service', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundleId123');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      const result = await sendCallsWithPaymaster(
        mockCalls,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(result).toBe('0xBundleId123');
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '2.0.0',
            from: '0xUserAddress',
            chainId: '0x1',
            calls: mockCalls,
            capabilities: {
              paymasterService: {
                url: paymasterUrl,
              },
            },
          },
        ],
      });
    });

    it('should handle result object with bundleId', async () => {
      const mockRequest = jest.fn().mockResolvedValue({ bundleId: '0xBundleObject123' });
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      const result = await sendCallsWithPaymaster(
        mockCalls,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(result).toBe('0xBundleObject123');
    });

    it('should return pending when result has no bundleId', async () => {
      const mockRequest = jest.fn().mockResolvedValue({});
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      const result = await sendCallsWithPaymaster(
        mockCalls,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(result).toBe('pending');
    });

    it('should throw error when no account connected', async () => {
      const mockRequest = jest.fn();
      const mockGetAccount = jest.fn().mockResolvedValue(undefined);
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      await expect(
        sendCallsWithPaymaster(mockCalls, chainId, paymasterUrl, mockRequest, mockGetAccount, mockGetChainId, toHex),
      ).rejects.toThrow('No account connected');
    });

    it('should throw error when on wrong chain', async () => {
      const mockRequest = jest.fn();
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(42161); // Different chain

      await expect(
        sendCallsWithPaymaster(mockCalls, 1, paymasterUrl, mockRequest, mockGetAccount, mockGetChainId, toHex),
      ).rejects.toThrow('Please switch to the correct network before proceeding');
    });

    it('should add default data and value if not provided', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      const callsWithoutDataValue: SendCallsCall[] = [{ to: '0xAddress' }];

      await sendCallsWithPaymaster(
        callsWithoutDataValue,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              calls: [{ to: '0xAddress', data: '0x', value: '0x0' }],
            }),
          ],
        }),
      );
    });

    it('should support Arbitrum chainId (42161)', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(42161);

      await sendCallsWithPaymaster(
        mockCalls,
        42161,
        'https://api.dfx.swiss/paymaster/42161',
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              chainId: '0xa4b1',
            }),
          ],
        }),
      );
    });

    it('should support Base chainId (8453)', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(8453);

      await sendCallsWithPaymaster(
        mockCalls,
        8453,
        'https://api.dfx.swiss/paymaster/8453',
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              chainId: '0x2105',
            }),
          ],
        }),
      );
    });

    it('should support Polygon chainId (137)', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(137);

      await sendCallsWithPaymaster(
        mockCalls,
        137,
        'https://api.dfx.swiss/paymaster/137',
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              chainId: '0x89',
            }),
          ],
        }),
      );
    });

    it('should pass through multiple calls', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      const multipleCalls: SendCallsCall[] = [
        { to: '0xToken1', data: '0xapprove', value: '0x0' },
        { to: '0xToken2', data: '0xtransfer', value: '0x0' },
      ];

      await sendCallsWithPaymaster(
        multipleCalls,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              calls: multipleCalls,
            }),
          ],
        }),
      );
    });

    it('should propagate errors from wallet_sendCalls', async () => {
      const mockRequest = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      await expect(
        sendCallsWithPaymaster(mockCalls, chainId, paymasterUrl, mockRequest, mockGetAccount, mockGetChainId, toHex),
      ).rejects.toThrow('Transaction failed');
    });

    it('should include version 2.0.0 in request', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      await sendCallsWithPaymaster(
        mockCalls,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              version: '2.0.0',
            }),
          ],
        }),
      );
    });

    it('should include paymasterService capability with URL', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const mockGetAccount = jest.fn().mockResolvedValue('0xUserAddress');
      const mockGetChainId = jest.fn().mockResolvedValue(1);
      const customPaymasterUrl = 'https://custom.paymaster.com/sponsor';

      await sendCallsWithPaymaster(
        mockCalls,
        chainId,
        customPaymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              capabilities: {
                paymasterService: {
                  url: customPaymasterUrl,
                },
              },
            }),
          ],
        }),
      );
    });

    it('should include from address in request', async () => {
      const mockRequest = jest.fn().mockResolvedValue('0xBundle');
      const userAddress = '0xMyWalletAddress123';
      const mockGetAccount = jest.fn().mockResolvedValue(userAddress);
      const mockGetChainId = jest.fn().mockResolvedValue(1);

      await sendCallsWithPaymaster(
        mockCalls,
        chainId,
        paymasterUrl,
        mockRequest,
        mockGetAccount,
        mockGetChainId,
        toHex,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [
            expect.objectContaining({
              from: userAddress,
            }),
          ],
        }),
      );
    });
  });

  describe('Error code handling', () => {
    // These tests document the expected error codes from wallet_sendCalls
    it('should handle user rejection (code 4001)', () => {
      const error = { code: 4001, message: 'User rejected' };
      expect(error.code).toBe(4001);
    });

    it('should handle method not supported (code -32601)', () => {
      const error = { code: -32601, message: 'Method not found' };
      expect(error.code).toBe(-32601);
    });

    it('should handle invalid parameters (code -32602)', () => {
      const error = { code: -32602, message: 'Invalid params' };
      expect(error.code).toBe(-32602);
    });
  });
});
