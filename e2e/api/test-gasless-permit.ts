/**
 * Gasless Permit Transfer Test
 *
 * Tests the ERC-2612 permit flow for gasless transfers:
 * 1. User signs permit (no gas required)
 * 2. Backend executes transferFrom with permit (backend pays gas)
 *
 * Run: npx tsx e2e/api/test-gasless-permit.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const API_URL = process.env.API_URL || 'https://dev.api.dfx.swiss/v1';
const TEST_SEED = process.env.TEST_SEED_2;

// Sepolia USDT
const USDT_ADDRESS = '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0';

// Deposit address (from API response)
let DEPOSIT_ADDRESS = '';

// SignatureTransfer contract (Uniswap Permit2 style, or direct permit)
// For ERC-2612 we use the token directly

if (!TEST_SEED) {
  console.error('ERROR: TEST_SEED_2 not set');
  process.exit(1);
}

const wallet = ethers.Wallet.fromPhrase(TEST_SEED);
console.log('=== Gasless Permit Transfer Test ===\n');
console.log('Wallet:', wallet.address);
console.log('Expected: 0xE988cD504F3F2E5c93fF13Eb8A753D8Bc96f0640\n');

async function getAuthToken(): Promise<string> {
  console.log('1. Authenticating...');

  const signMsgRes = await fetch(`${API_URL}/auth/signMessage?address=${wallet.address}`);
  const signMsgData = await signMsgRes.json();
  const signature = await wallet.signMessage(signMsgData.message);

  const authRes = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  const authData = await authRes.json();

  if (!authData.accessToken) {
    throw new Error('Failed to get access token: ' + JSON.stringify(authData));
  }

  console.log('   ✓ Got access token\n');
  return authData.accessToken;
}

async function getSellPaymentInfo(token: string) {
  console.log('2. Getting sell payment info...');

  const request = {
    iban: 'CH9300762011623852957',
    asset: { id: 407 }, // Sepolia USDT
    amount: 0.01, // 0.01 EUR worth
    currency: { id: 2 }, // EUR
  };

  const response = await fetch(`${API_URL}/sell/paymentInfos`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  console.log('   Response status:', response.status);
  console.log('   Transaction Request ID:', data.id);
  console.log('   Deposit Address:', data.depositAddress);

  DEPOSIT_ADDRESS = data.depositAddress;

  console.log('   ✓ Got payment info\n');
  return data;
}

async function signPermit(paymentInfo: any): Promise<{
  address: string;
  signature: string;
  signatureTransferContract: string;
  permittedAmount: number;
  executorAddress: string;
  nonce: number;
  deadline: string;
}> {
  console.log('3. Signing ERC-2612 permit...');

  const chainId = 11155111; // Sepolia

  // Get nonce from contract - use multiple RPC fallbacks
  const rpcUrls = [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://1rpc.io/sepolia',
    'https://sepolia.drpc.org',
  ];

  let provider: ethers.JsonRpcProvider | null = null;
  for (const rpc of rpcUrls) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      await p.getBlockNumber();
      provider = p;
      console.log('   Using RPC:', rpc);
      break;
    } catch {
      console.log('   RPC failed:', rpc);
    }
  }

  if (!provider) {
    throw new Error('All RPCs failed');
  }
  const usdtContract = new ethers.Contract(
    USDT_ADDRESS,
    [
      'function nonces(address owner) view returns (uint256)',
      'function DOMAIN_SEPARATOR() view returns (bytes32)',
      'function name() view returns (string)',
    ],
    provider,
  );

  console.log('   Getting nonce...');
  const nonce = await usdtContract.nonces(wallet.address);
  console.log('   Nonce:', nonce.toString());

  const name = await usdtContract.name();
  console.log('   Token name:', name);

  // Amount to permit (in token units, 6 decimals for USDT)
  // From paymentInfo.minDeposit or a small fixed amount
  const amount = 10000; // 0.01 USDT (6 decimals)
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  // Build EIP-712 permit signature
  const domain = {
    name: name,
    version: '1',
    chainId: chainId,
    verifyingContract: USDT_ADDRESS,
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // The spender should be the DFX executor contract
  // For now, use the deposit address (might need adjustment)
  const spender = DEPOSIT_ADDRESS;

  const message = {
    owner: wallet.address,
    spender: spender,
    value: amount,
    nonce: nonce,
    deadline: deadline,
  };

  console.log('   Domain:', JSON.stringify(domain, null, 2));
  console.log('   Message:', JSON.stringify(message, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2));

  const signature = await wallet.signTypedData(domain, types, message);
  console.log('   Signature:', signature.substring(0, 30) + '...');

  console.log('   ✓ Permit signed\n');

  return {
    address: wallet.address,
    signature: signature,
    signatureTransferContract: USDT_ADDRESS, // For ERC-2612, this is the token itself
    permittedAmount: amount,
    executorAddress: spender,
    nonce: Number(nonce),
    deadline: deadline.toString(),
  };
}

async function confirmWithPermit(token: string, paymentInfo: any, permit: any) {
  console.log('4. Confirming sell with permit...');

  const requestId = paymentInfo.id;
  const confirmUrl = `${API_URL}/sell/paymentInfos/${requestId}/confirm`;
  console.log('   Confirm URL:', confirmUrl);

  const confirmBody = { permit };
  console.log('   Request body:', JSON.stringify(confirmBody, null, 2));

  const response = await fetch(confirmUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(confirmBody),
  });

  const data = await response.json();
  console.log('   Response status:', response.status);
  console.log('   Response:', JSON.stringify(data, null, 2));

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Confirm failed: ${JSON.stringify(data)}`);
  }

  console.log('   ✓ Confirm successful\n');
  return data;
}

async function main() {
  try {
    const token = await getAuthToken();
    const paymentInfo = await getSellPaymentInfo(token);
    const permit = await signPermit(paymentInfo);
    const result = await confirmWithPermit(token, paymentInfo, permit);

    console.log('=== RESULT ===');
    if (result.inputTxId) {
      console.log('Transaction Hash:', result.inputTxId);
      console.log('Etherscan:', `https://sepolia.etherscan.io/tx/${result.inputTxId}`);
    } else {
      console.log('Confirm response:', JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.error('\nFATAL ERROR:', e);
    process.exit(1);
  }
}

main();
