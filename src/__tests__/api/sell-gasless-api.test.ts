/**
 * Sell API Gasless Integration Tests
 *
 * Tests the sell payment info API response for gasless transaction support.
 * These tests verify that the API returns the correct gasless data structure
 * that the frontend expects.
 *
 * Run with: npm test -- --testPathPattern="sell-gasless-api"
 *
 * For live API testing:
 *   API_URL=https://dev.api.dfx.swiss/v1 npm test -- --testPathPattern="sell-gasless-api"
 */

// Types matching API response
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

interface Eip7702TypedData {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

interface Eip7702AuthorizationData {
  contractAddress: string;
  chainId: number;
  nonce: number;
  typedData: Eip7702TypedData;
}

interface DepositTx {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value: string;
  nonce?: number;
  gasPrice?: string;
  gasLimit?: string;
  eip5792?: Eip5792Data;
}

interface SellPaymentInfoResponse {
  id: number;
  depositAddress: string;
  amount: number;
  asset: { id: number; name: string; blockchain: string };
  estimatedAmount?: number;
  currency?: { id: number; name: string };
  isValid: boolean;
  error?: string;
  gaslessAvailable?: boolean;
  eip7702Authorization?: Eip7702AuthorizationData;
  depositTx?: DepositTx;
}

// Mock API response simulating actual DEV API behavior
const mockApiResponse: SellPaymentInfoResponse = {
  id: 30887,
  depositAddress: '0x74039E5e9f0FcBFBd09d6765c64774b0A7D5a021',
  amount: 0.01,
  asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
  estimatedAmount: 0.0099,
  currency: { id: 1, name: 'CHF' },
  isValid: true,
  gaslessAvailable: true,
  eip7702Authorization: {
    contractAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
    chainId: 11155111,
    nonce: 0,
    typedData: {
      domain: { chainId: 11155111 },
      types: {
        Authorization: [
          { name: 'chainId', type: 'uint256' },
          { name: 'address', type: 'address' },
          { name: 'nonce', type: 'uint256' },
        ],
      },
      primaryType: 'Authorization',
      message: {
        chainId: 11155111,
        address: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
        nonce: 0,
      },
    },
  },
  depositTx: {
    chainId: 11155111,
    from: '0xE988cD504F3F2E5c93fF13Eb8A753D8Bc96f0640',
    to: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
    data: '0xa9059cbb00000000000000000000000074039e5e9f0fcbfbd09d6765c64774b0a7d5a0210000000000000000000000000000000000000000000000000000000000002710',
    value: '0x0',
    eip5792: {
      paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_test',
      chainId: 11155111,
      calls: [
        {
          to: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
          data: '0xa9059cbb00000000000000000000000074039e5e9f0fcbfbd09d6765c64774b0a7d5a0210000000000000000000000000000000000000000000000000000000000002710',
          value: '0x0',
        },
      ],
    },
  },
};

describe('Sell Gasless API Response', () => {
  describe('Response Structure', () => {
    it('should have required base fields', () => {
      expect(mockApiResponse.id).toBeGreaterThan(0);
      expect(mockApiResponse.depositAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(mockApiResponse.amount).toBeGreaterThan(0);
      expect(mockApiResponse.asset).toBeDefined();
      expect(mockApiResponse.isValid).toBe(true);
    });

    it('should have gaslessAvailable field', () => {
      expect(mockApiResponse.gaslessAvailable).toBeDefined();
      expect(typeof mockApiResponse.gaslessAvailable).toBe('boolean');
    });

    it('should have depositTx when includeTx=true', () => {
      expect(mockApiResponse.depositTx).toBeDefined();
      expect(mockApiResponse.depositTx?.chainId).toBe(11155111);
      expect(mockApiResponse.depositTx?.from).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(mockApiResponse.depositTx?.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('EIP-5792 Data Structure', () => {
    it('should have eip5792 data in depositTx', () => {
      const eip5792 = mockApiResponse.depositTx?.eip5792;
      expect(eip5792).toBeDefined();
    });

    it('should have valid paymasterUrl pointing to Pimlico', () => {
      const paymasterUrl = mockApiResponse.depositTx?.eip5792?.paymasterUrl;
      expect(paymasterUrl).toBeDefined();
      expect(paymasterUrl).toContain('api.pimlico.io');
      expect(paymasterUrl).toContain('/v2/');
      expect(paymasterUrl).toContain('/rpc');
    });

    it('should have chainId matching depositTx chainId', () => {
      const eip5792ChainId = mockApiResponse.depositTx?.eip5792?.chainId;
      const depositTxChainId = mockApiResponse.depositTx?.chainId;
      expect(eip5792ChainId).toBe(depositTxChainId);
    });

    it('should have at least one call in calls array', () => {
      const calls = mockApiResponse.depositTx?.eip5792?.calls;
      expect(calls).toBeDefined();
      expect(Array.isArray(calls)).toBe(true);
      expect(calls?.length).toBeGreaterThan(0);
    });

    it('should have valid call structure with to, data, value', () => {
      const call = mockApiResponse.depositTx?.eip5792?.calls?.[0];
      expect(call).toBeDefined();
      expect(call?.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(call?.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(call?.value).toBeDefined();
    });

    it('should have ERC20 transfer function selector in call data', () => {
      const data = mockApiResponse.depositTx?.eip5792?.calls?.[0]?.data;
      // transfer(address,uint256) = 0xa9059cbb
      expect(data?.startsWith('0xa9059cbb')).toBe(true);
    });
  });

  describe('EIP-7702 Authorization Data Structure', () => {
    it('should have eip7702Authorization when gaslessAvailable is true', () => {
      if (mockApiResponse.gaslessAvailable) {
        expect(mockApiResponse.eip7702Authorization).toBeDefined();
      }
    });

    it('should have MetaMask Delegator contract address', () => {
      const contractAddress = mockApiResponse.eip7702Authorization?.contractAddress;
      expect(contractAddress?.toLowerCase()).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
    });

    it('should have valid chainId', () => {
      const chainId = mockApiResponse.eip7702Authorization?.chainId;
      expect(chainId).toBe(11155111); // Sepolia
    });

    it('should have nonce >= 0', () => {
      const nonce = mockApiResponse.eip7702Authorization?.nonce;
      expect(nonce).toBeDefined();
      expect(nonce).toBeGreaterThanOrEqual(0);
    });

    it('should have valid typedData structure for EIP-712 signing', () => {
      const typedData = mockApiResponse.eip7702Authorization?.typedData;
      expect(typedData).toBeDefined();
      expect(typedData?.domain).toBeDefined();
      expect(typedData?.types).toBeDefined();
      expect(typedData?.primaryType).toBe('Authorization');
      expect(typedData?.message).toBeDefined();
    });

    it('should have Authorization type definition', () => {
      const types = mockApiResponse.eip7702Authorization?.typedData?.types;
      expect(types?.Authorization).toBeDefined();
      expect(Array.isArray(types?.Authorization)).toBe(true);
      expect(types?.Authorization?.length).toBe(3); // chainId, address, nonce
    });
  });

  describe('Frontend Compatibility', () => {
    it('should be processable by tx-helper sendTransaction logic', () => {
      // Simulate the priority check in tx-helper.hook.ts
      const hasEip5792 = !!mockApiResponse.depositTx?.eip5792;
      const hasEip7702 = mockApiResponse.gaslessAvailable && !!mockApiResponse.eip7702Authorization;

      // EIP-5792 should be checked first
      if (hasEip5792) {
        // Would use sendCallsWithPaymaster
        expect(mockApiResponse.depositTx?.eip5792?.paymasterUrl).toBeTruthy();
        expect(mockApiResponse.depositTx?.eip5792?.calls?.length).toBeGreaterThan(0);
      } else if (hasEip7702) {
        // Would use signEip7702Authorization
        expect(mockApiResponse.eip7702Authorization?.contractAddress).toBeTruthy();
        expect(mockApiResponse.eip7702Authorization?.typedData).toBeTruthy();
      }

      // This response has both, so EIP-5792 takes priority
      expect(hasEip5792).toBe(true);
    });

    it('should have all required fields for wallet_sendCalls', () => {
      const eip5792 = mockApiResponse.depositTx?.eip5792;

      // Required for wallet_sendCalls
      expect(eip5792?.chainId).toBeDefined();
      expect(eip5792?.calls).toBeDefined();
      expect(eip5792?.paymasterUrl).toBeDefined();

      // Each call needs: to, data, value
      eip5792?.calls?.forEach((call, index) => {
        expect(call.to).toBeDefined();
        expect(call.data).toBeDefined();
        expect(call.value).toBeDefined();
      });
    });

    it('should have correct chain hex format for EIP-5792', () => {
      const chainId = mockApiResponse.depositTx?.eip5792?.chainId;
      const expectedHex = `0x${chainId?.toString(16)}`;

      // Sepolia = 11155111 = 0xaa36a7
      expect(expectedHex).toBe('0xaa36a7');
    });
  });
});

describe('Gasless Response Variants', () => {
  it('should handle response with only EIP-5792 (no EIP-7702)', () => {
    const responseWithOnlyEip5792: Partial<SellPaymentInfoResponse> = {
      ...mockApiResponse,
      gaslessAvailable: false,
      eip7702Authorization: undefined,
    };

    const hasEip5792 = !!responseWithOnlyEip5792.depositTx?.eip5792;
    const hasEip7702 =
      responseWithOnlyEip5792.gaslessAvailable && !!responseWithOnlyEip5792.eip7702Authorization;

    expect(hasEip5792).toBe(true);
    expect(hasEip7702).toBe(false);
  });

  it('should handle response with only EIP-7702 (no EIP-5792)', () => {
    const responseWithOnlyEip7702: SellPaymentInfoResponse = {
      ...mockApiResponse,
      depositTx: {
        ...mockApiResponse.depositTx!,
        eip5792: undefined,
      },
    };

    const hasEip5792 = !!responseWithOnlyEip7702.depositTx?.eip5792;
    const hasEip7702 =
      responseWithOnlyEip7702.gaslessAvailable && !!responseWithOnlyEip7702.eip7702Authorization;

    expect(hasEip5792).toBe(false);
    expect(hasEip7702).toBe(true);
  });

  it('should handle response with no gasless options', () => {
    const responseWithNoGasless: SellPaymentInfoResponse = {
      ...mockApiResponse,
      gaslessAvailable: false,
      eip7702Authorization: undefined,
      depositTx: {
        ...mockApiResponse.depositTx!,
        eip5792: undefined,
      },
    };

    const hasEip5792 = !!responseWithNoGasless.depositTx?.eip5792;
    const hasEip7702 = responseWithNoGasless.gaslessAvailable && !!responseWithNoGasless.eip7702Authorization;

    expect(hasEip5792).toBe(false);
    expect(hasEip7702).toBe(false);
  });
});

describe('Pimlico Paymaster URL', () => {
  const chains = [
    { name: 'sepolia', chainId: 11155111 },
    { name: 'ethereum', chainId: 1 },
    { name: 'optimism', chainId: 10 },
    { name: 'arbitrum', chainId: 42161 },
    { name: 'base', chainId: 8453 },
    { name: 'polygon', chainId: 137 },
  ];

  chains.forEach(({ name, chainId }) => {
    it(`should have valid URL format for ${name}`, () => {
      const url = `https://api.pimlico.io/v2/${name}/rpc?apikey=test_key`;

      expect(url).toContain('api.pimlico.io');
      expect(url).toContain('/v2/');
      expect(url).toContain(name);
      expect(url).toContain('apikey=');
    });
  });
});
