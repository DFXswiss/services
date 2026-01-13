/**
 * Gasless Sell Transaction Test Script
 *
 * This script tests the complete gasless sell flow on Sepolia:
 * 1. Authenticates with the DFX API
 * 2. Fetches sell payment info with includeTx=true
 * 3. Checks for gaslessAvailable and eip7702Authorization
 * 4. Signs EIP-7702 authorization (simulated)
 * 5. Confirms the sell transaction via API
 *
 * Usage:
 *   npx tsx e2e/api/test-gasless-sell.ts
 *
 * Requirements:
 *   - TEST_SEED_2 in .env.test (wallet with 0 ETH but USDT on Sepolia)
 *   - PIMLICO_API_KEY configured on API server
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'https://dev.api.dfx.swiss/v1',
  TEST_SEED: process.env.TEST_SEED_2 || '', // Wallet2 with 0 ETH
  USDT_AMOUNT: 0.01,
  TEST_IBAN: process.env.TEST_IBAN || 'CH9300762011623852957',
  // Sepolia USDT asset ID
  SEPOLIA_USDT_ID: 407,
  CHF_CURRENCY_ID: 1,
};

// Types
interface SignMessageResponse {
  message: string;
}

interface AuthResponse {
  accessToken: string;
}

interface Eip7702TypedData {
  domain: { chainId: number };
  types: Record<string, any>;
  primaryType: string;
  message: Record<string, any>;
}

interface Eip7702AuthorizationData {
  contractAddress: string;
  chainId: number;
  nonce: number;
  typedData: Eip7702TypedData;
}

interface Eip5792Data {
  paymasterUrl: string;
  chainId: number;
  calls: Array<{ to: string; data: string; value: string }>;
}

interface DepositTx {
  chainId: number;
  from: string;
  to: string;
  data: string;
  value: string;
  nonce: number;
  gasPrice: string;
  gasLimit: string;
  eip5792?: Eip5792Data;
}

interface SellPaymentInfoResponse {
  id: number;
  depositAddress: string;
  amount: number;
  asset: { id: number; name: string; blockchain: string };
  estimatedAmount: number;
  currency: { id: number; name: string };
  isValid: boolean;
  error?: string;
  // Gasless fields
  gaslessAvailable?: boolean;
  eip7702Authorization?: Eip7702AuthorizationData;
  depositTx?: DepositTx;
}

interface SignedEip7702Authorization {
  chainId: number;
  address: string;
  nonce: number;
  r: string;
  s: string;
  yParity: number;
}

// Helper functions
async function getAuthToken(wallet: ethers.Wallet): Promise<string> {
  console.log('\n1. Getting auth token...');
  console.log(`   Wallet address: ${wallet.address}`);

  // Get sign message
  const signMsgRes = await fetch(`${CONFIG.API_URL}/auth/signMessage?address=${wallet.address}`);
  if (!signMsgRes.ok) {
    throw new Error(`Failed to get sign message: ${signMsgRes.status} ${await signMsgRes.text()}`);
  }
  const signMsgData: SignMessageResponse = await signMsgRes.json();
  console.log('   Sign message received');

  // Sign message
  const signature = await wallet.signMessage(signMsgData.message);
  console.log('   Message signed');

  // Authenticate
  const authRes = await fetch(`${CONFIG.API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  if (!authRes.ok) {
    throw new Error(`Failed to authenticate: ${authRes.status} ${await authRes.text()}`);
  }
  const authData: AuthResponse = await authRes.json();
  console.log('   Auth token received');

  return authData.accessToken;
}

async function getSellPaymentInfo(
  token: string,
  amount: number,
  assetId: number,
  currencyId: number,
  iban: string,
  includeTx: boolean = true,
): Promise<SellPaymentInfoResponse> {
  console.log('\n2. Getting sell payment info...');
  console.log(`   Amount: ${amount}`);
  console.log(`   Asset ID: ${assetId}`);
  console.log(`   Currency ID: ${currencyId}`);
  console.log(`   IBAN: ${iban}`);
  console.log(`   includeTx: ${includeTx}`);

  const url = `${CONFIG.API_URL}/sell/paymentInfos${includeTx ? '?includeTx=true' : ''}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      iban,
      asset: { id: assetId },
      amount,
      currency: { id: currencyId },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get sell payment info: ${response.status} ${errorText}`);
  }

  const data: SellPaymentInfoResponse = await response.json();
  console.log('   Payment info received');

  return data;
}

function signEip7702Authorization(
  wallet: ethers.Wallet,
  authData: Eip7702AuthorizationData,
): SignedEip7702Authorization {
  console.log('\n4. Signing EIP-7702 authorization...');
  console.log(`   Contract address: ${authData.contractAddress}`);
  console.log(`   Chain ID: ${authData.chainId}`);
  console.log(`   Nonce: ${authData.nonce}`);

  // EIP-7702 uses a SPECIAL signature format, NOT EIP-712!
  // Format: sign(keccak256(0x05 || rlp([chainId, address, nonce])))
  // where 0x05 is the EIP-7702 magic byte

  // RLP encode [chainId, address, nonce]
  const { RLP } = require('@ethereumjs/rlp');

  const chainIdBigInt = BigInt(authData.chainId);
  const nonceBigInt = BigInt(authData.nonce);

  // Convert to RLP-friendly format (remove leading zeros for integers)
  const chainIdBytes =
    chainIdBigInt === 0n ? new Uint8Array() : hexToBytes(bigIntToHex(chainIdBigInt));
  const addressBytes = hexToBytes(authData.contractAddress);
  const nonceBytes = nonceBigInt === 0n ? new Uint8Array() : hexToBytes(bigIntToHex(nonceBigInt));

  const rlpEncoded = RLP.encode([chainIdBytes, addressBytes, nonceBytes]);

  // Prepend magic byte 0x05
  const magicByte = new Uint8Array([0x05]);
  const toSign = new Uint8Array(magicByte.length + rlpEncoded.length);
  toSign.set(magicByte);
  toSign.set(rlpEncoded, magicByte.length);

  // Hash and sign
  const messageHash = ethers.keccak256(toSign);
  const signature = wallet.signingKey.sign(messageHash);

  const r = signature.r;
  const s = signature.s;
  const yParity = signature.yParity;

  console.log('   Authorization signed (EIP-7702 format)');
  console.log(`   r: ${r.slice(0, 20)}...`);
  console.log(`   s: ${s.slice(0, 20)}...`);
  console.log(`   yParity: ${yParity}`);

  return {
    chainId: authData.chainId,
    address: authData.contractAddress,
    nonce: authData.nonce,
    r,
    s,
    yParity,
  };
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bigIntToHex(value: bigint): string {
  const hex = value.toString(16);
  return '0x' + (hex.length % 2 ? '0' + hex : hex);
}

async function confirmSellWithAuthorization(
  token: string,
  sellId: number,
  authorization: SignedEip7702Authorization,
): Promise<any> {
  console.log('\n5. Confirming sell with authorization...');
  console.log(`   Sell ID: ${sellId}`);

  const url = `${CONFIG.API_URL}/sell/paymentInfos/${sellId}/confirm`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ authorization }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.log('   Confirmation failed:', JSON.stringify(data, null, 2));
    return { success: false, error: data };
  }

  console.log('   Sell confirmed successfully!');
  return { success: true, data };
}

function analyzePaymentInfo(info: SellPaymentInfoResponse): void {
  console.log('\n3. Analyzing payment info response...');
  console.log('   ========================================');

  console.log(`   ID: ${info.id}`);
  console.log(`   Deposit Address: ${info.depositAddress}`);
  console.log(`   Amount: ${info.amount} ${info.asset?.name}`);
  console.log(`   Estimated: ${info.estimatedAmount} ${info.currency?.name}`);
  console.log(`   Is Valid: ${info.isValid}`);

  if (info.error) {
    console.log(`   Error: ${info.error}`);
  }

  console.log('\n   --- GASLESS FIELDS ---');
  console.log(`   gaslessAvailable: ${info.gaslessAvailable ?? 'NOT PRESENT'}`);

  if (info.eip7702Authorization) {
    console.log('   eip7702Authorization: PRESENT');
    console.log(`     - contractAddress: ${info.eip7702Authorization.contractAddress}`);
    console.log(`     - chainId: ${info.eip7702Authorization.chainId}`);
    console.log(`     - nonce: ${info.eip7702Authorization.nonce}`);
    console.log(`     - typedData: ${info.eip7702Authorization.typedData ? 'PRESENT' : 'MISSING'}`);
  } else {
    console.log('   eip7702Authorization: NOT PRESENT');
  }

  if (info.depositTx) {
    console.log('   depositTx: PRESENT');
    console.log(`     - chainId: ${info.depositTx.chainId}`);
    console.log(`     - from: ${info.depositTx.from}`);
    console.log(`     - to: ${info.depositTx.to}`);

    if (info.depositTx.eip5792) {
      console.log('     - eip5792: PRESENT');
      console.log(`       - paymasterUrl: ${info.depositTx.eip5792.paymasterUrl?.slice(0, 50)}...`);
      console.log(`       - chainId: ${info.depositTx.eip5792.chainId}`);
      console.log(`       - calls: ${info.depositTx.eip5792.calls?.length} call(s)`);
    } else {
      console.log('     - eip5792: NOT PRESENT');
    }
  } else {
    console.log('   depositTx: NOT PRESENT');
  }

  console.log('   ========================================');
}

async function main() {
  console.log('='.repeat(60));
  console.log('   GASLESS SELL TRANSACTION TEST');
  console.log('='.repeat(60));

  // Validate config
  if (!CONFIG.TEST_SEED) {
    console.error('\nERROR: TEST_SEED_2 not set in .env.test');
    console.error('This test requires a wallet with 0 ETH but USDT on Sepolia');
    process.exit(1);
  }

  try {
    // Create wallet from seed
    const wallet = ethers.Wallet.fromPhrase(CONFIG.TEST_SEED);
    console.log(`\nUsing wallet: ${wallet.address}`);

    // Step 1: Get auth token
    const token = await getAuthToken(wallet);

    // Step 2: Get sell payment info with includeTx=true
    const paymentInfo = await getSellPaymentInfo(
      token,
      CONFIG.USDT_AMOUNT,
      CONFIG.SEPOLIA_USDT_ID,
      CONFIG.CHF_CURRENCY_ID,
      CONFIG.TEST_IBAN,
      true, // includeTx=true
    );

    // Step 3: Analyze response
    analyzePaymentInfo(paymentInfo);

    // Check if gasless is available
    if (!paymentInfo.gaslessAvailable) {
      console.log('\n⚠️  Gasless is NOT available for this transaction');
      console.log('   Possible reasons:');
      console.log('   - User has ETH balance (gasless only for 0 balance)');
      console.log('   - PIMLICO_API_KEY not configured on server');
      console.log('   - Blockchain not supported for gasless');
      console.log('   - Quote is not valid');

      if (!paymentInfo.isValid) {
        console.log(`\n   Quote error: ${paymentInfo.error || 'Unknown'}`);
      }

      return;
    }

    console.log('\n✅ Gasless IS available!');

    // Check which method is available
    if (paymentInfo.eip7702Authorization) {
      console.log('   Using: EIP-7702 Authorization flow');

      // Step 4: Sign the authorization
      const signedAuth = signEip7702Authorization(wallet, paymentInfo.eip7702Authorization);

      // Step 5: Confirm the sell
      const result = await confirmSellWithAuthorization(token, paymentInfo.id, signedAuth);

      if (result.success) {
        console.log('\n' + '='.repeat(60));
        console.log('   SUCCESS! Gasless sell transaction executed!');
        console.log('='.repeat(60));
        console.log('\nTransaction details:');
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log('\n' + '='.repeat(60));
        console.log('   FAILED: Gasless transaction not executed');
        console.log('='.repeat(60));
        console.log('\nError:');
        console.log(JSON.stringify(result.error, null, 2));
      }
    } else if (paymentInfo.depositTx?.eip5792) {
      console.log('   Using: EIP-5792 Paymaster flow');
      console.log('   (This requires MetaMask with wallet_sendCalls support)');
      console.log('   Cannot test EIP-5792 from Node.js - requires browser wallet');
      console.log('\n   EIP-5792 Data available:');
      console.log(`   - Paymaster URL: ${paymentInfo.depositTx.eip5792.paymasterUrl}`);
      console.log(`   - Calls: ${JSON.stringify(paymentInfo.depositTx.eip5792.calls, null, 2)}`);
    } else {
      console.log('\n⚠️  gaslessAvailable=true but no authorization data provided!');
      console.log('   This is a bug in the API.');
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
main();
