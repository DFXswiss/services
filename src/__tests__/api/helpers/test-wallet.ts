// Pre-computed test credentials
// Generated from mnemonic: "below debris olive author enhance ankle drum angle buyer cruel school milk"
// WARNING: This is for testing only! Never use for real funds!
const PRECOMPUTED_EVM_ADDRESS = '0x4B33B90cFC38341Db2b9EC5cF3B737508801c617';
const PRECOMPUTED_EVM_SIGNATURE =
  '0x18e4049227f7006f6820233b5dd4ff9e76af0b2125d2d927efc5e6934db1837313ffa8ed80556c3bc558e44d6c6971bec8db12d3db9d99364ec2992d3e4a1f511c';
const TEST_IBAN_DEFAULT = 'CH9300762011623852957';

export interface TestCredentials {
  address: string;
  signature: string;
}

export function getTestIban(): string {
  return TEST_IBAN_DEFAULT;
}

/**
 * Returns pre-computed EVM test credentials.
 * Using pre-computed values to avoid webpack Buffer polyfill conflicts with ethers.js.
 */
export async function createTestCredentials(): Promise<TestCredentials> {
  return {
    address: PRECOMPUTED_EVM_ADDRESS,
    signature: PRECOMPUTED_EVM_SIGNATURE,
  };
}
