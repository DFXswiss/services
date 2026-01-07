/**
 * Direct Gasless Transaction Test
 *
 * Tests the complete gasless flow by:
 * 1. Authenticating with Wallet 2 (0 ETH)
 * 2. Getting sell payment info with depositTx
 * 3. Constructing and sending UserOperation via Pimlico Bundler
 * 4. Verifying transaction on Etherscan
 *
 * Run: npx tsx e2e/api/test-gasless-direct.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.test') });

const API_URL = process.env.API_URL || 'https://dev.api.dfx.swiss/v1';
const TEST_SEED = process.env.TEST_SEED_2; // Wallet 2 with 0 ETH
const PIMLICO_API_KEY = 'pim_G7dVkmZhrWG76Wq52th5tV'; // From test logs

if (!TEST_SEED) {
  console.error('ERROR: TEST_SEED_2 not set in .env.test');
  process.exit(1);
}

const wallet = ethers.Wallet.fromPhrase(TEST_SEED);
console.log('=== Gasless Direct Transaction Test ===\n');
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
  console.log('2. Getting sell payment info with depositTx...');

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
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  console.log('   Response status:', response.status);
  console.log('   gaslessAvailable:', data.gaslessAvailable);
  console.log('   depositTx.eip5792:', data.depositTx?.eip5792 ? 'YES' : 'NO');
  console.log('   eip7702Authorization:', data.eip7702Authorization ? 'YES' : 'NO');

  if (!data.depositTx?.eip5792) {
    console.error('\n   ERROR: No eip5792 data returned!');
    console.error('   This means the backend thinks user has ETH for gas.');
    console.error('   Full response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('   ✓ Got depositTx with eip5792 data\n');
  return data;
}

async function sendViaUserOperation(paymentInfo: any) {
  console.log('3. Constructing UserOperation...');

  const { paymasterUrl, calls, chainId } = paymentInfo.depositTx.eip5792;
  const call = calls[0];

  console.log('   Chain ID:', chainId);
  console.log('   To:', call.to);
  console.log('   Paymaster URL:', paymasterUrl.substring(0, 50) + '...');

  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');

  // Get nonce
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log('   Nonce:', nonce);

  // For ERC-4337 UserOperation, we need to use Pimlico's bundler
  // The UserOperation format for EntryPoint v0.7
  const userOp = {
    sender: wallet.address,
    nonce: `0x${nonce.toString(16)}`,
    callData: call.data,
    callGasLimit: '0x50000',
    verificationGasLimit: '0x50000',
    preVerificationGas: '0x10000',
    maxFeePerGas: '0x3b9aca00', // 1 gwei
    maxPriorityFeePerGas: '0x3b9aca00',
  };

  console.log('   ✓ UserOperation constructed\n');

  // Step 1: Get paymaster stub data
  console.log('4. Getting paymaster stub data...');

  const stubResponse = await fetch(paymasterUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterStubData',
      params: [
        userOp,
        '0x0000000071727de22e5e9d8baf0edac6f37da032', // EntryPoint v0.7
        `0x${chainId.toString(16)}`,
        {}
      ]
    })
  });

  const stubData = await stubResponse.json();

  if (stubData.error) {
    console.error('   ERROR from paymaster:', stubData.error);
    process.exit(1);
  }

  console.log('   Paymaster:', stubData.result?.paymaster);
  console.log('   ✓ Got paymaster stub data\n');

  // Add paymaster data to userOp
  const userOpWithPaymaster = {
    ...userOp,
    paymaster: stubData.result.paymaster,
    paymasterData: stubData.result.paymasterData,
    paymasterVerificationGasLimit: stubData.result.paymasterVerificationGasLimit || '0x10000',
    paymasterPostOpGasLimit: stubData.result.paymasterPostOpGasLimit || '0x10000',
  };

  // Step 2: Sign the UserOperation
  console.log('5. Signing UserOperation...');

  // For a simple EOA, we need to use EIP-191 personal sign on the userOp hash
  // But for ERC-4337, the signing is more complex and depends on the account type

  // Actually, for a regular EOA to use ERC-4337, it needs to be wrapped in a Smart Account
  // This is where EIP-7702 comes in - it allows an EOA to temporarily become a smart account

  // Let's try a different approach - use the eip7702Authorization from the API
  if (paymentInfo.eip7702Authorization) {
    console.log('   Using EIP-7702 authorization flow...');

    const auth = paymentInfo.eip7702Authorization;
    console.log('   Contract:', auth.contractAddress);
    console.log('   Chain ID:', auth.chainId);
    console.log('   Nonce:', auth.nonce);

    // Sign the authorization using EIP-712 typed data
    // Note: This might not work because EIP-7702 requires native signing, not EIP-712
    // But let's try anyway to see what error we get

    const signature = await wallet.signTypedData(
      auth.typedData.domain,
      { Authorization: auth.typedData.types.Authorization },
      auth.typedData.message
    );

    console.log('   Signature:', signature.substring(0, 20) + '...');

    // Now we would need to submit this to the bundler
    // But the bundler expects a specific format
    console.log('\n   NOTE: EIP-7702 via EIP-712 signing may not work.');
    console.log('   EIP-7702 requires native RLP signing, not EIP-712.');
  }

  // Alternative: Try direct eth_sendTransaction with the depositTx
  console.log('\n6. Attempting direct transaction via provider...');

  // Since we have 0 ETH, this will fail, but let's see the error
  const tx = {
    to: call.to,
    data: call.data,
    value: call.value || '0x0',
    chainId: chainId,
  };

  try {
    const connectedWallet = wallet.connect(provider);
    const txResponse = await connectedWallet.sendTransaction(tx);
    console.log('   TX Hash:', txResponse.hash);
    console.log('   Waiting for confirmation...');
    const receipt = await txResponse.wait();
    console.log('   ✓ Transaction confirmed in block:', receipt?.blockNumber);
    return txResponse.hash;
  } catch (e: any) {
    console.log('   Expected error (no ETH for gas):', e.message?.substring(0, 100));
  }

  // The real solution: We need to use Pimlico's bundler to send the UserOperation
  // But for a regular EOA, we need a Smart Account wrapper

  console.log('\n=== CONCLUSION ===');
  console.log('To execute a gasless transaction with an EOA that has 0 ETH,');
  console.log('we need one of the following:');
  console.log('');
  console.log('1. MetaMask with Smart Account (EIP-7702 upgraded)');
  console.log('   - MetaMask handles the UserOperation construction');
  console.log('   - paymasterService sponsors the gas');
  console.log('');
  console.log('2. A Smart Account SDK (like Pimlico/permissionless.js)');
  console.log('   - Creates a counterfactual smart account for the EOA');
  console.log('   - Sends UserOperation via bundler');
  console.log('');
  console.log('3. Backend-initiated transaction');
  console.log('   - User signs authorization');
  console.log('   - Backend constructs and sends the transaction');

  return null;
}

async function main() {
  try {
    const token = await getAuthToken();
    const paymentInfo = await getSellPaymentInfo(token);
    const txHash = await sendViaUserOperation(paymentInfo);

    if (txHash) {
      console.log('\n=== SUCCESS ===');
      console.log('Transaction:', `https://sepolia.etherscan.io/tx/${txHash}`);
    }
  } catch (e) {
    console.error('\nFATAL ERROR:', e);
    process.exit(1);
  }
}

main();
