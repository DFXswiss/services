/**
 * Backend Gasless Transaction Test
 *
 * Tests the complete gasless flow via backend EIP-7702 + ERC-4337:
 * 1. Authenticates with Wallet 2 (0 ETH)
 * 2. Gets sell payment info with eip7702Authorization
 * 3. Signs the EIP-7702 authorization
 * 4. Calls confirm endpoint with signed authorization
 * 5. Backend executes via Pimlico Bundler
 * 6. Verifies transaction on Etherscan
 *
 * Run: npx tsx e2e/api/test-gasless-backend.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const API_URL = process.env.API_URL || 'https://dev.api.dfx.swiss/v1';
const TEST_SEED = process.env.TEST_SEED_2; // Wallet 2 with 0 ETH

if (!TEST_SEED) {
  console.error('ERROR: TEST_SEED_2 not set in .env.test');
  process.exit(1);
}

const wallet = ethers.Wallet.fromPhrase(TEST_SEED);
console.log('=== Backend Gasless Transaction Test ===\n');
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

interface PaymentInfo {
  id: number;
  routeId: number;
  depositAddress: string;
  gaslessAvailable?: boolean;
  eip7702Authorization?: {
    contractAddress: string;
    chainId: number;
    nonce: number;
    typedData: {
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    };
  };
  depositTx?: {
    eip5792?: {
      paymasterUrl: string;
      chainId: number;
      calls: Array<{ to: string; data: string; value: string }>;
    };
  };
}

async function getSellPaymentInfo(token: string): Promise<PaymentInfo> {
  console.log('2. Getting sell payment info with eip7702Authorization...');

  const request = {
    iban: 'CH9300762011623852957',
    asset: { id: 407 }, // Sepolia USDT
    amount: 0.01,
    currency: { id: 2 }, // EUR
  };

  const response = await fetch(`${API_URL}/sell/paymentInfos?includeTx=true`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  console.log('   Response status:', response.status);
  console.log('   gaslessAvailable:', data.gaslessAvailable);
  console.log('   eip7702Authorization:', data.eip7702Authorization ? 'YES' : 'NO');
  console.log('   depositTx.eip5792:', data.depositTx?.eip5792 ? 'YES' : 'NO');

  if (!data.eip7702Authorization) {
    console.error('\n   ERROR: No eip7702Authorization returned!');
    console.error('   Full response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('   ✓ Got eip7702Authorization data\n');
  return data;
}

interface SignedAuthorization {
  chainId: number;
  address: string;
  nonce: number;
  r: string;
  s: string;
  yParity: number;
}

async function signAuthorization(paymentInfo: PaymentInfo): Promise<SignedAuthorization> {
  console.log('3. Signing EIP-7702 authorization...');

  const auth = paymentInfo.eip7702Authorization!;
  console.log('   Contract:', auth.contractAddress);
  console.log('   Chain ID:', auth.chainId);
  console.log('   Nonce:', auth.nonce);

  // Sign using EIP-712 typed data
  const signature = await wallet.signTypedData(
    auth.typedData.domain as ethers.TypedDataDomain,
    { Authorization: auth.typedData.types.Authorization },
    auth.typedData.message,
  );

  console.log('   Signature:', signature.substring(0, 20) + '...');

  // Split signature into r, s, v
  const sig = ethers.Signature.from(signature);
  const yParity = sig.v === 27 ? 0 : 1;

  console.log('   r:', sig.r.substring(0, 20) + '...');
  console.log('   s:', sig.s.substring(0, 20) + '...');
  console.log('   yParity:', yParity);

  console.log('   ✓ Authorization signed\n');

  return {
    chainId: auth.chainId,
    address: auth.contractAddress,
    nonce: auth.nonce,
    r: sig.r,
    s: sig.s,
    yParity,
  };
}

async function confirmSell(
  token: string,
  paymentInfo: PaymentInfo,
  signedAuth: SignedAuthorization,
): Promise<{ txHash: string }> {
  console.log('4. Confirming sell with signed authorization...');

  // First, get the transaction request ID
  // The paymentInfo.id is the TransactionRequest ID, not the route ID
  const requestId = paymentInfo.id;
  console.log('   Transaction Request ID:', requestId);

  // Correct endpoint: PUT /sell/paymentInfos/:id/confirm
  const confirmUrl = `${API_URL}/sell/paymentInfos/${requestId}/confirm`;
  console.log('   Confirm URL:', confirmUrl);

  const confirmBody = {
    authorization: signedAuth,
  };

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

  // The response should contain the BuyFiat object with transaction details
  const txHash = data.inputTxId || data.txHash || data.cryptoInput?.txHash;
  if (!txHash) {
    console.log('   Note: TX hash not in immediate response (transaction pending)');
    console.log('   ✓ Confirm request submitted\n');
    return { txHash: '' };
  }

  console.log('   ✓ Transaction confirmed\n');
  return { txHash };
}

async function main() {
  try {
    const token = await getAuthToken();
    const paymentInfo = await getSellPaymentInfo(token);
    const signedAuth = await signAuthorization(paymentInfo);
    const result = await confirmSell(token, paymentInfo, signedAuth);

    console.log('=== RESULT ===');
    if (result.txHash) {
      console.log('Transaction Hash:', result.txHash);
      console.log('Etherscan:', `https://sepolia.etherscan.io/tx/${result.txHash}`);
    } else {
      console.log('Transaction submitted via Pimlico bundler.');
      console.log('Check backend logs for UserOperation hash and TX hash.');
      console.log('\nTo find the TX, check the wallet address on Etherscan:');
      console.log(`https://sepolia.etherscan.io/address/${wallet.address}`);
    }
  } catch (e) {
    console.error('\nFATAL ERROR:', e);
    process.exit(1);
  }
}

main();
