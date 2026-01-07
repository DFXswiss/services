/**
 * Direct Pimlico EIP-7702 Test
 *
 * Tests submitting UserOperation with eip7702Auth directly to Pimlico
 * to understand the correct format.
 *
 * Run: npx tsx e2e/api/test-pimlico-direct.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const TEST_SEED = process.env.TEST_SEED_2;
const PIMLICO_API_KEY = 'pim_G7dVkmZhrWG76Wq52th5tV';
const PIMLICO_URL = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

// MetaMask Delegator contract
const DELEGATOR_ADDRESS = '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b';

// EntryPoint v0.7
const ENTRY_POINT = '0x0000000071727de22e5e9d8baf0edac6f37da032';

// USDT on Sepolia
const USDT_ADDRESS = '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0';

// Deposit address
const DEPOSIT_ADDRESS = '0xd080E86c4da1A8977077cE76B53c7975ADB5e3af';

if (!TEST_SEED) {
  console.error('ERROR: TEST_SEED_2 not set');
  process.exit(1);
}

const wallet = ethers.Wallet.fromPhrase(TEST_SEED);
console.log('=== Direct Pimlico EIP-7702 Test ===\n');
console.log('Wallet:', wallet.address);

async function jsonRpc(method: string, params: unknown[]) {
  const response = await fetch(PIMLICO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });
  const data = await response.json();
  return data;
}

function toHex(n: bigint | number): string {
  return '0x' + BigInt(n).toString(16);
}

async function main() {
  // 1. Sign EIP-7702 authorization using correct method
  console.log('\n1. Signing EIP-7702 authorization...');

  const chainId = 11155111;
  const nonce = 0; // Account nonce

  // EIP-7702 signing: keccak256(0x05 || RLP([chain_id, address, nonce]))
  // MAGIC = 0x05

  // RLP encode [chainId, address, nonce]
  function rlpEncode(items: (number | string | bigint)[]): Uint8Array {
    const encoded: number[] = [];

    for (const item of items) {
      if (typeof item === 'number' || typeof item === 'bigint') {
        const n = BigInt(item);
        if (n === 0n) {
          encoded.push(0x80);
        } else {
          const hex = n.toString(16);
          const bytes = ethers.getBytes('0x' + (hex.length % 2 ? '0' : '') + hex);
          if (bytes.length === 1 && bytes[0] < 0x80) {
            encoded.push(bytes[0]);
          } else {
            encoded.push(0x80 + bytes.length);
            encoded.push(...bytes);
          }
        }
      } else if (typeof item === 'string') {
        const bytes = ethers.getBytes(item);
        if (bytes.length === 1 && bytes[0] < 0x80) {
          encoded.push(bytes[0]);
        } else {
          encoded.push(0x80 + bytes.length);
          encoded.push(...bytes);
        }
      }
    }

    // Wrap in list
    const totalLength = encoded.length;
    if (totalLength < 56) {
      return new Uint8Array([0xc0 + totalLength, ...encoded]);
    } else {
      const lengthBytes: number[] = [];
      let len = totalLength;
      while (len > 0) {
        lengthBytes.unshift(len & 0xff);
        len >>= 8;
      }
      return new Uint8Array([0xf7 + lengthBytes.length, ...lengthBytes, ...encoded]);
    }
  }

  // Build the authorization digest
  const authTuple = [chainId, DELEGATOR_ADDRESS, nonce];
  const rlpEncoded = rlpEncode(authTuple);
  console.log('   RLP encoded:', ethers.hexlify(rlpEncoded));

  // MAGIC || RLP
  const magicPrefix = new Uint8Array([0x05]);
  const messageToSign = new Uint8Array([...magicPrefix, ...rlpEncoded]);
  console.log('   Message to sign:', ethers.hexlify(messageToSign));

  // Hash and sign
  const digest = ethers.keccak256(messageToSign);
  console.log('   Digest:', digest);

  // Sign the digest directly (not as a message)
  const signingKey = new ethers.SigningKey(wallet.privateKey);
  const rawSig = signingKey.sign(digest);
  const sig = ethers.Signature.from(rawSig);

  console.log('   r:', sig.r.substring(0, 30) + '...');
  console.log('   s:', sig.s.substring(0, 30) + '...');
  console.log('   yParity:', sig.yParity);

  // 2. Build eip7702Auth object (Pimlico format)
  const eip7702Auth = {
    address: DELEGATOR_ADDRESS,
    chainId: toHex(chainId),
    nonce: toHex(nonce),
    r: sig.r,
    s: sig.s,
    yParity: toHex(sig.v === 27 ? 0 : 1),
  };

  console.log('   eip7702Auth:', JSON.stringify(eip7702Auth, null, 2));

  // 3. Build transfer callData (ERC20 transfer)
  console.log('\n2. Building transfer callData...');

  const amount = BigInt(10000); // 0.01 USDT (6 decimals)
  const transferABI = ['function transfer(address to, uint256 amount)'];
  const iface = new ethers.Interface(transferABI);
  const transferData = iface.encodeFunctionData('transfer', [DEPOSIT_ADDRESS, amount]);

  console.log('   Transfer data:', transferData);

  // 4. Encode execute() call for MetaMask Delegator (ERC-7821)
  console.log('\n3. Encoding execute() call...');

  // ERC-7821: execute((bytes32 mode, bytes executionData))
  // Mode: 0x01... for batch calls
  const BATCH_MODE = '0x0100000000000000000000000000000000000000000000000000000000000000';

  // executionData: abi.encode(Call[]) where Call = (address, uint256, bytes)
  // Simple single call encoding
  const executeABI = ['function execute((bytes32 mode, bytes executionData))'];
  const executeIface = new ethers.Interface(executeABI);

  // Manually encode the call struct
  const callsEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['tuple(address,uint256,bytes)[]'],
    [[[USDT_ADDRESS, 0, transferData]]],
  );

  const callData = executeIface.encodeFunctionData('execute', [[BATCH_MODE, callsEncoded]]);
  console.log('   CallData:', callData.substring(0, 60) + '...');

  // 5. Build UserOperation v0.7
  console.log('\n4. Building UserOperation...');

  // For EIP-7702 with Smart Account, we need to sign the userOpHash
  // The smart account (MetaMask Delegator) validates ownership via signature

  // First build userOp without signature to get the hash
  const userOpBase = {
    sender: wallet.address,
    nonce: '0x0',
    callData,
    callGasLimit: toHex(200000),
    verificationGasLimit: toHex(500000),
    preVerificationGas: toHex(100000),
    maxFeePerGas: toHex(1000000000), // 1 gwei
    maxPriorityFeePerGas: toHex(1000000000),
  };

  // Create a dummy signature for gas estimation
  // A valid ECDSA signature is 65 bytes
  const dummySignature =
    '0x' +
    'ff'.repeat(32) + // r
    'ff'.repeat(32) + // s
    '1b'; // v=27

  const userOp = {
    ...userOpBase,
    signature: dummySignature,
  };

  console.log('   UserOp sender:', userOp.sender);
  console.log('   UserOp nonce:', userOp.nonce);

  // 6. Get gas estimate with eip7702Auth
  console.log('\n5. Estimating gas...');

  // Try different param positions
  console.log('   Trying: [userOp, entryPoint, eip7702Auth] ...');
  let estimateResult = await jsonRpc('eth_estimateUserOperationGas', [userOp, ENTRY_POINT, eip7702Auth]);

  if (estimateResult.error) {
    console.log('   Error:', estimateResult.error.message);

    // Try with eip7702Auth in userOp
    console.log('   Trying: userOp.eip7702Auth ...');
    const userOpWithAuth = { ...userOp, eip7702Auth };
    estimateResult = await jsonRpc('eth_estimateUserOperationGas', [userOpWithAuth, ENTRY_POINT]);
  }

  console.log('   Result:', JSON.stringify(estimateResult, null, 2));

  if (estimateResult.error) {
    console.log('\n❌ Gas estimation failed:', estimateResult.error.message);

    // Try with factory approach for comparison
    console.log('\n6. Trying factory=0x7702 approach...');

    // Encode authorization as factoryData
    // Format: address (20 bytes) + nonce (32 bytes padded) + r (32) + s (32) + yParity (1)
    const paddedNonce = nonce.toString(16).padStart(64, '0');
    const factoryData =
      '0x' +
      DELEGATOR_ADDRESS.slice(2) + // 20 bytes address
      paddedNonce + // 32 bytes nonce
      sig.r.slice(2) + // 32 bytes r
      sig.s.slice(2) + // 32 bytes s
      (sig.v === 27 ? '00' : '01'); // 1 byte yParity

    console.log('   factoryData length:', factoryData.length, 'chars');

    const userOpWithFactory = {
      ...userOp,
      factory: '0x0000000000000000000000000000000000007702',
      factoryData,
    };

    const estimateResult2 = await jsonRpc('eth_estimateUserOperationGas', [userOpWithFactory, ENTRY_POINT]);
    console.log('   Result:', JSON.stringify(estimateResult2, null, 2));
  } else {
    console.log('\n✓ Gas estimation succeeded!');

    // 7. Sponsor via paymaster
    console.log('\n6. Sponsoring via paymaster...');

    const sponsorResult = await jsonRpc('pm_sponsorUserOperation', [userOp, ENTRY_POINT, { eip7702Auth }]);
    console.log('   Result:', JSON.stringify(sponsorResult, null, 2));

    if (!sponsorResult.error) {
      // 8. Send UserOperation
      console.log('\n7. Sending UserOperation...');

      const sponsoredOp = {
        ...userOp,
        paymaster: sponsorResult.result.paymaster,
        paymasterData: sponsorResult.result.paymasterData,
        paymasterVerificationGasLimit: sponsorResult.result.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: sponsorResult.result.paymasterPostOpGasLimit,
      };

      const sendResult = await jsonRpc('eth_sendUserOperation', [sponsoredOp, ENTRY_POINT, { eip7702Auth }]);
      console.log('   Result:', JSON.stringify(sendResult, null, 2));
    }
  }
}

main().catch(console.error);
