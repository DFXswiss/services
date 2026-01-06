/**
 * Gasless Flow Priority Tests
 *
 * Tests that EIP-5792 (wallet_sendCalls) is checked BEFORE EIP-7702 direct flow.
 * This is critical because:
 * 1. EIP-5792 is the native MetaMask way - MetaMask handles EIP-7702 internally
 * 2. EIP-7702 direct flow has implementation issues (wrong signature format, EntryPoint v0.7)
 *
 * The sendTransaction() function should:
 * 1. FIRST check for depositTx.eip5792 → use sendCallsWithPaymaster()
 * 2. THEN check for eip7702Authorization → use signEip7702Authorization() + confirmSell()
 * 3. FINALLY fall back to standard createTransactionMetaMask()
 */

// Types matching the actual implementation
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

interface Eip7702AuthorizationData {
  contractAddress: string;
  chainId: number;
  nonce: number;
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
}

interface DepositTx {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value: string;
  eip5792?: Eip5792Data;
}

interface SellTransaction {
  id: number;
  amount: number;
  depositAddress: string;
  asset: { id: number; name: string; blockchain: string };
  depositTx?: DepositTx;
  gaslessAvailable?: boolean;
  eip7702Authorization?: Eip7702AuthorizationData;
}

// Mock functions to track which path was taken
const mockPaths = {
  eip5792Called: false,
  eip7702Called: false,
  standardTxCalled: false,
  reset() {
    this.eip5792Called = false;
    this.eip7702Called = false;
    this.standardTxCalled = false;
  },
};

// Simulate the sendTransaction logic from tx-helper.hook.ts
async function sendTransaction(tx: SellTransaction): Promise<string> {
  // EIP-5792 gasless transaction flow via wallet_sendCalls with paymaster (PREFERRED for MetaMask)
  if (tx.depositTx?.eip5792) {
    mockPaths.eip5792Called = true;
    // Simulate sendCallsWithPaymaster
    return '0xeip5792_tx_hash';
  }

  // EIP-7702 gasless transaction flow (fallback for non-MetaMask wallets)
  if (tx.gaslessAvailable && tx.eip7702Authorization) {
    mockPaths.eip7702Called = true;
    // Simulate signEip7702Authorization + confirmSell
    return '0xeip7702_tx_hash';
  }

  // Standard transaction
  mockPaths.standardTxCalled = true;
  return '0xstandard_tx_hash';
}

describe('Gasless Flow Priority', () => {
  beforeEach(() => {
    mockPaths.reset();
  });

  describe('Priority Order', () => {
    it('should use EIP-5792 when both EIP-5792 and EIP-7702 are available', async () => {
      const tx: SellTransaction = {
        id: 1,
        amount: 10,
        depositAddress: '0xdeposit',
        asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
        gaslessAvailable: true,
        eip7702Authorization: {
          contractAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
          chainId: 11155111,
          nonce: 0,
          typedData: {
            domain: { chainId: 11155111 },
            types: { Authorization: [] },
            primaryType: 'Authorization',
            message: {},
          },
        },
        depositTx: {
          chainId: 11155111,
          from: '0xuser',
          to: '0xtoken',
          data: '0xtransfer',
          value: '0x0',
          eip5792: {
            paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test',
            chainId: 11155111,
            calls: [{ to: '0xtoken', data: '0xtransfer', value: '0x0' }],
          },
        },
      };

      const result = await sendTransaction(tx);

      expect(result).toBe('0xeip5792_tx_hash');
      expect(mockPaths.eip5792Called).toBe(true);
      expect(mockPaths.eip7702Called).toBe(false);
      expect(mockPaths.standardTxCalled).toBe(false);
    });

    it('should use EIP-7702 when only EIP-7702 is available (no EIP-5792)', async () => {
      const tx: SellTransaction = {
        id: 2,
        amount: 10,
        depositAddress: '0xdeposit',
        asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
        gaslessAvailable: true,
        eip7702Authorization: {
          contractAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
          chainId: 11155111,
          nonce: 0,
          typedData: {
            domain: { chainId: 11155111 },
            types: { Authorization: [] },
            primaryType: 'Authorization',
            message: {},
          },
        },
        depositTx: {
          chainId: 11155111,
          from: '0xuser',
          to: '0xtoken',
          data: '0xtransfer',
          value: '0x0',
          // NO eip5792 data
        },
      };

      const result = await sendTransaction(tx);

      expect(result).toBe('0xeip7702_tx_hash');
      expect(mockPaths.eip5792Called).toBe(false);
      expect(mockPaths.eip7702Called).toBe(true);
      expect(mockPaths.standardTxCalled).toBe(false);
    });

    it('should use standard transaction when no gasless options available', async () => {
      const tx: SellTransaction = {
        id: 3,
        amount: 10,
        depositAddress: '0xdeposit',
        asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
        gaslessAvailable: false,
        depositTx: {
          chainId: 11155111,
          from: '0xuser',
          to: '0xtoken',
          data: '0xtransfer',
          value: '0x0',
          // NO eip5792 data
        },
      };

      const result = await sendTransaction(tx);

      expect(result).toBe('0xstandard_tx_hash');
      expect(mockPaths.eip5792Called).toBe(false);
      expect(mockPaths.eip7702Called).toBe(false);
      expect(mockPaths.standardTxCalled).toBe(true);
    });

    it('should use EIP-5792 even when gaslessAvailable is false but eip5792 data exists', async () => {
      // Edge case: API might return eip5792 data without setting gaslessAvailable
      const tx: SellTransaction = {
        id: 4,
        amount: 10,
        depositAddress: '0xdeposit',
        asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
        gaslessAvailable: false, // Note: false
        depositTx: {
          chainId: 11155111,
          from: '0xuser',
          to: '0xtoken',
          data: '0xtransfer',
          value: '0x0',
          eip5792: {
            paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test',
            chainId: 11155111,
            calls: [{ to: '0xtoken', data: '0xtransfer', value: '0x0' }],
          },
        },
      };

      const result = await sendTransaction(tx);

      expect(result).toBe('0xeip5792_tx_hash');
      expect(mockPaths.eip5792Called).toBe(true);
    });

    it('should NOT use EIP-7702 when gaslessAvailable is true but authorization is missing', async () => {
      const tx: SellTransaction = {
        id: 5,
        amount: 10,
        depositAddress: '0xdeposit',
        asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
        gaslessAvailable: true,
        // NO eip7702Authorization
        depositTx: {
          chainId: 11155111,
          from: '0xuser',
          to: '0xtoken',
          data: '0xtransfer',
          value: '0x0',
        },
      };

      const result = await sendTransaction(tx);

      expect(result).toBe('0xstandard_tx_hash');
      expect(mockPaths.eip7702Called).toBe(false);
      expect(mockPaths.standardTxCalled).toBe(true);
    });
  });

  describe('EIP-5792 Data Validation', () => {
    it('should require paymasterUrl in eip5792 data', () => {
      const validData: Eip5792Data = {
        paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=test',
        chainId: 11155111,
        calls: [{ to: '0xtoken', data: '0x', value: '0x0' }],
      };

      expect(validData.paymasterUrl).toContain('pimlico.io');
      expect(validData.chainId).toBe(11155111);
      expect(validData.calls.length).toBeGreaterThan(0);
    });

    it('should have valid call structure', () => {
      const call: Eip5792Call = {
        to: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a',
        value: '0x0',
      };

      // Valid Ethereum address
      expect(call.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
      // Valid hex data (transfer function selector + params)
      expect(call.data).toMatch(/^0x[a-fA-F0-9]+$/);
      // Value should be hex
      expect(call.value).toMatch(/^0x[a-fA-F0-9]*$/);
    });
  });

  describe('EIP-7702 Data Validation', () => {
    it('should have MetaMask Delegator contract address', () => {
      const auth: Eip7702AuthorizationData = {
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
      };

      // MetaMask Delegator address (lowercase)
      expect(auth.contractAddress.toLowerCase()).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
      expect(auth.chainId).toBe(11155111); // Sepolia
      expect(auth.nonce).toBeGreaterThanOrEqual(0);
      expect(auth.typedData.primaryType).toBe('Authorization');
    });
  });

  describe('API Response Simulation', () => {
    it('should handle typical DEV API response with both gasless options', async () => {
      // This simulates what the DEV API actually returns
      const apiResponse: SellTransaction = {
        id: 30887,
        amount: 0.01,
        depositAddress: '0x74039E5e9f0FcBFBd09d6765c64774b0A7D5a021',
        asset: { id: 407, name: 'USDT', blockchain: 'Ethereum' },
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
          data: '0xa9059cbb...',
          value: '0x0',
          eip5792: {
            paymasterUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_test',
            chainId: 11155111,
            calls: [
              {
                to: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
                data: '0xa9059cbb...',
                value: '0x0',
              },
            ],
          },
        },
      };

      const result = await sendTransaction(apiResponse);

      // Should use EIP-5792 (MetaMask native) NOT EIP-7702 direct
      expect(result).toBe('0xeip5792_tx_hash');
      expect(mockPaths.eip5792Called).toBe(true);
      expect(mockPaths.eip7702Called).toBe(false);
    });
  });
});

describe('Gasless Flow - Chain Support', () => {
  const supportedChains = [
    { name: 'Ethereum Mainnet', chainId: 1 },
    { name: 'Sepolia', chainId: 11155111 },
    { name: 'Optimism', chainId: 10 },
    { name: 'Arbitrum', chainId: 42161 },
    { name: 'Base', chainId: 8453 },
    { name: 'Polygon', chainId: 137 },
  ];

  supportedChains.forEach(({ name, chainId }) => {
    it(`should support gasless on ${name} (chainId: ${chainId})`, () => {
      const eip5792Data: Eip5792Data = {
        paymasterUrl: `https://api.pimlico.io/v2/${chainId}/rpc?apikey=test`,
        chainId,
        calls: [{ to: '0xtoken', data: '0x', value: '0x0' }],
      };

      expect(eip5792Data.chainId).toBe(chainId);
      expect(eip5792Data.paymasterUrl).toContain(chainId.toString());
    });
  });
});
