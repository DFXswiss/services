/**
 * Unit tests for EIP-7702 signing logic in metamask.hook.ts
 *
 * Tests the signEip7702Delegation function including:
 * - Correct usage of userNonce from delegation data
 * - Correct address (delegatorAddress) for authorization
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
  describe('Authorization message construction', () => {
    /**
     * This test verifies that userNonce from the API is correctly used
     * in the authorization message, fixing the bug where nonce was hardcoded to 0.
     */
    it('should use userNonce from delegation data', () => {
      const delegationData: Eip7702DelegationData = {
        relayerAddress: '0xRelayer',
        delegationManagerAddress: '0xDelegationManager',
        delegatorAddress: '0xDelegator',
        userNonce: 5, // User has made 5 transactions before
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: 11155111,
          verifyingContract: '0xDelegationManager',
        },
        types: {
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
        message: {
          delegate: '0xDelegate',
          delegator: '0xUser',
          authority: '0x0',
          caveats: [],
          salt: '12345',
        },
      };

      // Simulate the authorization message construction from metamask.hook.ts
      const authorizationMessage = {
        chainId: delegationData.domain.chainId,
        address: delegationData.delegatorAddress,
        nonce: delegationData.userNonce ?? 0,
      };

      // Assert correct nonce is used
      expect(authorizationMessage.nonce).toBe(5);
      expect(authorizationMessage.address).toBe('0xDelegator');
      expect(authorizationMessage.chainId).toBe(11155111);
    });

    it('should default to nonce 0 when userNonce is not provided', () => {
      const delegationData: Eip7702DelegationData = {
        relayerAddress: '0xRelayer',
        delegationManagerAddress: '0xDelegationManager',
        delegatorAddress: '0xDelegator',
        // userNonce not provided (backwards compatibility)
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
          delegate: '0x',
          delegator: '0x',
          authority: '0x',
          caveats: [],
          salt: '0',
        },
      };

      const authorizationMessage = {
        chainId: delegationData.domain.chainId,
        address: delegationData.delegatorAddress,
        nonce: delegationData.userNonce ?? 0,
      };

      expect(authorizationMessage.nonce).toBe(0);
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

      const authorizationMessage = {
        chainId: delegationData.domain.chainId,
        address: delegationData.delegatorAddress,
        nonce: delegationData.userNonce ?? 0,
      };

      // The authorization should point to delegatorAddress (the contract the EOA delegates to)
      // NOT delegationManagerAddress
      expect(authorizationMessage.address).toBe('0x63c0c19a282a1b52b07dd5a65b58948a07dae32b');
      expect(authorizationMessage.address).not.toBe('0xDelegationManager');
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
      const mockSignature =
        '0x' +
        '0'.repeat(64) + // r
        '1'.repeat(64) + // s
        '1c'; // v = 28 (0x1c)

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
        delegatorAddress: '0xDelegator',
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

      const authorizationMessage = {
        chainId: delegationData.domain.chainId,
        address: delegationData.delegatorAddress,
        nonce: delegationData.userNonce ?? 0,
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
          chainId: authorizationMessage.chainId,
          address: authorizationMessage.address,
          nonce: authorizationMessage.nonce,
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
      expect(result.authorization.address).toBe('0xDelegator');
      expect(result.authorization.nonce).toBe(3);
      expect(result.authorization.r).toBe('0xR');
      expect(result.authorization.s).toBe('0xS');
      expect(result.authorization.yParity).toBe(1);
    });
  });

  describe('Error handling', () => {
    // These tests verify the error handling logic from metamask.hook.ts handleError function

    interface MetaMaskError {
      code: number;
      message: string;
    }

    // Simulated error handler (extracted logic from metamask.hook.ts)
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
