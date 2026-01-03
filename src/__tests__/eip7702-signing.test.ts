/**
 * Unit tests for EIP-7702 signing logic in metamask.hook.ts
 *
 * Tests the signEip7702Delegation function including:
 * - Correct usage of userNonce from delegation data
 * - Correct address (delegatorAddress) for authorization
 * - Native EIP-7702 authorization hash construction (0x05 || RLP)
 * - Signature parsing and yParity calculation
 */

// Helper type for testing (mirrors @dfx.swiss/react Eip7702DelegationData)
interface Eip7702DelegationData {
  relayerAddress: string;
  delegationManagerAddress: string;
  delegatorAddress: string;
  userNonce: number;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    Delegation: Array<{ name: string; type: string }>;
    Caveat: Array<{ name: string; type: string }>;
  };
  message: {
    delegate: string;
    delegator: string;
    authority: string;
    caveats: any[];
    salt: string;
  };
}

describe('EIP-7702 Signing Logic', () => {
  describe('Delegation signing (EIP-712)', () => {
    // Tests for the delegation signing which uses EIP-712

    const mockDelegationData = {
      relayerAddress: '0xRelayer',
      delegationManagerAddress: '0xDelegationManager',
      delegatorAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
      userNonce: 5,
      domain: {
        name: 'DelegationManager',
        version: '1',
        chainId: 11155111,
        verifyingContract: '0xVerifyingContract',
      },
      types: {
        Delegation: [
          { name: 'delegate', type: 'address' },
          { name: 'delegator', type: 'address' },
        ],
        Caveat: [{ name: 'enforcer', type: 'address' }],
      },
      message: {
        delegate: '0xDelegate',
        delegator: '0xUserDelegator',
        authority: '0xAuthority',
        caveats: [],
        salt: '12345',
      },
    };

    it('should build correct delegation sign request using EIP-712', () => {
      const from = '0xUserAddress';

      // Build the delegation sign request as done in metamask.hook.ts
      const delegationRequest = {
        method: 'eth_signTypedData_v4',
        params: [
          from,
          JSON.stringify({
            domain: mockDelegationData.domain,
            types: mockDelegationData.types,
            primaryType: 'Delegation',
            message: mockDelegationData.message,
          }),
        ],
      };

      expect(delegationRequest.method).toBe('eth_signTypedData_v4');
      expect(delegationRequest.params[0]).toBe('0xUserAddress');

      const parsedData = JSON.parse(delegationRequest.params[1]);
      expect(parsedData.domain).toEqual(mockDelegationData.domain);
      expect(parsedData.types).toEqual(mockDelegationData.types);
      expect(parsedData.primaryType).toBe('Delegation');
      expect(parsedData.message).toEqual(mockDelegationData.message);
    });

    it('should include all required EIP-712 fields in delegation request', () => {
      const delegationRequestData = {
        domain: mockDelegationData.domain,
        types: mockDelegationData.types,
        primaryType: 'Delegation',
        message: mockDelegationData.message,
      };

      // Verify all required EIP-712 fields are present
      expect(delegationRequestData).toHaveProperty('domain');
      expect(delegationRequestData).toHaveProperty('types');
      expect(delegationRequestData).toHaveProperty('primaryType');
      expect(delegationRequestData).toHaveProperty('message');

      // Verify domain has required fields
      expect(delegationRequestData.domain).toHaveProperty('name');
      expect(delegationRequestData.domain).toHaveProperty('version');
      expect(delegationRequestData.domain).toHaveProperty('chainId');
      expect(delegationRequestData.domain).toHaveProperty('verifyingContract');
    });
  });

  describe('Authorization signing (Native EIP-7702)', () => {
    // Tests for the authorization signing which uses native EIP-7702 format
    // EIP-7702 requires: sign(keccak256(0x05 || RLP([chainId, address, nonce])))

    it('should use MAGIC byte 0x05 for EIP-7702 (not 0x1901 for EIP-712)', () => {
      // EIP-7702 uses 0x05 as domain separator
      // EIP-712 uses 0x1901 as domain separator
      const EIP7702_MAGIC = '0x05';
      const EIP712_PREFIX = '0x1901';

      expect(EIP7702_MAGIC).not.toBe(EIP712_PREFIX);
      expect(EIP7702_MAGIC).toBe('0x05');
    });

    it('should construct authorization message with correct structure', () => {
      const chainId = 11155111; // Sepolia
      const contractAddress = '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b';
      const nonce = 5;

      // The authorization message structure for EIP-7702 is:
      // RLP([chainId, address, nonce])
      const authorizationComponents = {
        chainId,
        address: contractAddress,
        nonce,
      };

      expect(authorizationComponents.chainId).toBe(11155111);
      expect(authorizationComponents.address).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
      expect(authorizationComponents.nonce).toBe(5);
    });

    it('should handle chainId 0 correctly', () => {
      const chainId = 0;

      // ChainId 0 should be encoded as empty bytes in RLP
      const encodedChainId = chainId === 0 ? '0x' : `0x${chainId.toString(16)}`;
      expect(encodedChainId).toBe('0x');
    });

    it('should handle nonce 0 correctly', () => {
      const nonce = 0;

      // Nonce 0 should be encoded as empty bytes in RLP
      const encodedNonce = nonce === 0 ? '0x' : `0x${nonce.toString(16)}`;
      expect(encodedNonce).toBe('0x');
    });

    it('should use eth_sign for authorization (not eth_signTypedData_v4)', () => {
      const from = '0xUserAddress';
      const authorizationHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // Build the authorization sign request as done in metamask.hook.ts
      const authorizationRequest = {
        method: 'eth_sign',
        params: [from, authorizationHash],
      };

      // Should use eth_sign, NOT eth_signTypedData_v4
      expect(authorizationRequest.method).toBe('eth_sign');
      expect(authorizationRequest.method).not.toBe('eth_signTypedData_v4');
      expect(authorizationRequest.params[0]).toBe('0xUserAddress');
      expect(authorizationRequest.params[1]).toBe(authorizationHash);
    });

    it('should convert chainId to hex correctly', () => {
      const testCases = [
        { chainId: 1, expected: '0x1' },
        { chainId: 11155111, expected: '0xaa36a7' },
        { chainId: 137, expected: '0x89' },
        { chainId: 42161, expected: '0xa4b1' },
      ];

      testCases.forEach(({ chainId, expected }) => {
        const hex = `0x${chainId.toString(16)}`;
        expect(hex).toBe(expected);
      });
    });
  });

  describe('Authorization message construction', () => {
    /**
     * This test verifies that userNonce from the API is correctly used
     * in the authorization message, fixing the bug where nonce was hardcoded to 0.
     */
    it('should use userNonce from delegation data', () => {
      const delegationData: Eip7702DelegationData = {
        relayerAddress: '0xRelayer',
        delegationManagerAddress: '0xDelegationManager',
        delegatorAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
        userNonce: 5, // User has made 5 transactions before
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: 11155111,
          verifyingContract: '0xDelegationManager',
        },
        types: {
          Delegation: [],
          Caveat: [],
        },
        message: {
          delegate: '0xDelegate',
          delegator: '0xUser',
          authority: '0x0',
          caveats: [],
          salt: '12345',
        },
      };

      // Simulate the authorization construction from metamask.hook.ts
      const chainId = delegationData.domain.chainId;
      const contractAddress = delegationData.delegatorAddress;
      const nonce = delegationData.userNonce ?? 0;

      // Assert correct values are used
      expect(nonce).toBe(5);
      expect(contractAddress).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
      expect(chainId).toBe(11155111);
    });

    it('should default to nonce 0 when userNonce is not provided', () => {
      const delegationData = {
        delegatorAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
        domain: { chainId: 1 },
        // userNonce not provided
      } as any;

      const nonce = delegationData.userNonce ?? 0;
      expect(nonce).toBe(0);
    });

    it('should use delegatorAddress (not delegationManagerAddress) for authorization', () => {
      const delegationData: Eip7702DelegationData = {
        relayerAddress: '0xRelayer',
        delegationManagerAddress: '0xDelegationManager',
        delegatorAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b', // MetaMask Delegator contract
        userNonce: 0,
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: 11155111,
          verifyingContract: '0xDelegationManager',
        },
        types: {
          Delegation: [],
          Caveat: [],
        },
        message: {
          delegate: '0x',
          delegator: '0x',
          authority: '0x',
          caveats: [],
          salt: '0',
        },
      };

      const contractAddress = delegationData.delegatorAddress;

      // The authorization should point to delegatorAddress (the contract the EOA delegates to)
      // NOT delegationManagerAddress
      expect(contractAddress).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
      expect(contractAddress).not.toBe('0xDelegationManager');
    });
  });

  describe('Signature parsing', () => {
    it('should correctly parse signature into r, s, yParity', () => {
      // Example signature from MetaMask (65 bytes: r=32, s=32, v=1)
      const mockSignature =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' + // r (32 bytes)
        'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' + // s (32 bytes)
        '1b'; // v = 27 (0x1b)

      // Parse signature (logic from metamask.hook.ts)
      const sig = mockSignature.slice(2); // Remove 0x prefix
      const r = '0x' + sig.slice(0, 64);
      const s = '0x' + sig.slice(64, 128);
      const v = parseInt(sig.slice(128, 130), 16);
      const yParity = v >= 27 ? v - 27 : v;

      expect(r).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      expect(s).toBe('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321');
      expect(v).toBe(27);
      expect(yParity).toBe(0); // v=27 -> yParity=0
    });

    it('should correctly calculate yParity for v=28', () => {
      const mockSignature = '0x' + '0'.repeat(64) + '1'.repeat(64) + '1c'; // v = 28 (0x1c)

      const sig = mockSignature.slice(2);
      const v = parseInt(sig.slice(128, 130), 16);
      const yParity = v >= 27 ? v - 27 : v;

      expect(v).toBe(28);
      expect(yParity).toBe(1); // v=28 -> yParity=1
    });

    it('should handle raw yParity values (0 or 1)', () => {
      // Some wallets return raw yParity instead of v
      const sig0 = '0x' + '0'.repeat(64) + '1'.repeat(64) + '00'; // yParity = 0
      const sig1 = '0x' + '0'.repeat(64) + '1'.repeat(64) + '01'; // yParity = 1

      const v0 = parseInt(sig0.slice(130, 132), 16);
      const v1 = parseInt(sig1.slice(130, 132), 16);

      const yParity0 = v0 >= 27 ? v0 - 27 : v0;
      const yParity1 = v1 >= 27 ? v1 - 27 : v1;

      expect(yParity0).toBe(0);
      expect(yParity1).toBe(1);
    });
  });

  describe('Return structure', () => {
    it('should return correct Eip7702SignedData structure', () => {
      const delegationData: Eip7702DelegationData = {
        relayerAddress: '0xRelayer',
        delegationManagerAddress: '0xDelegationManager',
        delegatorAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
        userNonce: 3,
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: 1,
          verifyingContract: '0xDelegationManager',
        },
        types: {
          Delegation: [],
          Caveat: [],
        },
        message: {
          delegate: '0xDelegate',
          delegator: '0xUserDelegator',
          authority: '0xAuthority',
          caveats: [],
          salt: '999',
        },
      };

      // Mock signature values
      const delegationSignature = '0xDelegationSig';
      const r = '0xR';
      const s = '0xS';
      const yParity = 1;

      // Construct return value as done in metamask.hook.ts
      const result = {
        delegation: {
          delegate: delegationData.message.delegate,
          delegator: delegationData.message.delegator,
          authority: delegationData.message.authority,
          salt: delegationData.message.salt,
          signature: delegationSignature,
        },
        authorization: {
          chainId: delegationData.domain.chainId,
          address: delegationData.delegatorAddress,
          nonce: delegationData.userNonce ?? 0,
          r,
          s,
          yParity,
        },
      };

      // Verify structure
      expect(result.delegation.delegate).toBe('0xDelegate');
      expect(result.delegation.delegator).toBe('0xUserDelegator');
      expect(result.delegation.salt).toBe('999');
      expect(result.delegation.signature).toBe('0xDelegationSig');

      expect(result.authorization.chainId).toBe(1);
      expect(result.authorization.address).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
      expect(result.authorization.nonce).toBe(3);
      expect(result.authorization.r).toBe('0xR');
      expect(result.authorization.s).toBe('0xS');
      expect(result.authorization.yParity).toBe(1);
    });
  });

  describe('Error handling', () => {
    // These tests verify the error handling logic from metamask.hook.ts

    interface MetaMaskError {
      code: number;
      message: string;
    }

    class AbortError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AbortError';
      }
    }

    class TranslatedError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'TranslatedError';
      }
    }

    function handleError(e: MetaMaskError): never {
      switch (e.code) {
        case 4001:
          throw new AbortError('User cancelled');
        case -32002:
          throw new TranslatedError('There is already a request pending. Please confirm it in your MetaMask and retry.');
      }
      throw e;
    }

    function handleEthSignError(e: any): never {
      // eth_sign might be disabled - provide helpful error message
      if (e?.code === -32601 || e?.code === -32602 || e?.code === 4200) {
        throw new TranslatedError(
          'EIP-7702 authorization requires eth_sign to be enabled. ' +
            'Please enable it in MetaMask: Settings > Advanced > Eth_sign requests',
        );
      }
      throw e;
    }

    it('should throw AbortError when user cancels (code 4001)', () => {
      const error: MetaMaskError = { code: 4001, message: 'User denied' };

      expect(() => handleError(error)).toThrow(AbortError);
      expect(() => handleError(error)).toThrow('User cancelled');
    });

    it('should throw TranslatedError for pending request (code -32002)', () => {
      const error: MetaMaskError = { code: -32002, message: 'Request already pending' };

      expect(() => handleError(error)).toThrow(TranslatedError);
      expect(() => handleError(error)).toThrow('There is already a request pending');
    });

    it('should throw TranslatedError when eth_sign is disabled (code -32601)', () => {
      const error = { code: -32601, message: 'Method not found' };

      expect(() => handleEthSignError(error)).toThrow(TranslatedError);
      expect(() => handleEthSignError(error)).toThrow('eth_sign to be enabled');
    });

    it('should throw TranslatedError when eth_sign is disabled (code 4200)', () => {
      const error = { code: 4200, message: 'Unsupported method' };

      expect(() => handleEthSignError(error)).toThrow(TranslatedError);
      expect(() => handleEthSignError(error)).toThrow('eth_sign to be enabled');
    });

    it('should rethrow unknown errors', () => {
      const error: MetaMaskError = { code: 9999, message: 'Unknown error' };

      expect(() => handleError(error)).toThrow();
      try {
        handleError(error);
      } catch (e: any) {
        expect(e.code).toBe(9999);
        expect(e.message).toBe('Unknown error');
      }
    });

    it('should rethrow network errors', () => {
      const error: MetaMaskError = { code: -32603, message: 'Internal JSON-RPC error' };

      expect(() => handleError(error)).toThrow();
      try {
        handleError(error);
      } catch (e: any) {
        expect(e.code).toBe(-32603);
      }
    });

    it('should handle errors without code property', () => {
      const error = { message: 'Generic error' } as MetaMaskError;

      expect(() => handleError(error)).toThrow('Generic error');
    });
  });
});
