/**
 * Full Gasless Sell Flow Test for USDT on Sepolia
 *
 * Tests the complete flow:
 * 1. Check wallet balances (need USDT, no ETH)
 * 2. Authenticate with DFX API
 * 3. Create sell payment info with includeTx=true
 * 4. Verify EIP-5792 data is returned
 * 5. Simulate frontend sendTransaction logic
 *
 * Run: npx ts-node e2e/api/test-full-gasless-flow.ts
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Configuration
const API_URL = process.env.API_URL || 'https://dev.api.dfx.swiss/v1';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const SEPOLIA_USDT = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0'; // Sepolia USDT
const SEPOLIA_CHAIN_ID = 11155111;

// ERC20 ABI for balance check
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function log(step: string, passed: boolean, details: string, data?: any) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${step}: ${details}`);
  if (data) console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 500));
  results.push({ step, passed, details, data });
}

async function getWalletBalances(wallet: ethers.HDNodeWallet): Promise<{ eth: string; usdt: string }> {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const connectedWallet = wallet.connect(provider);

  const ethBalance = await provider.getBalance(wallet.address);
  const usdtContract = new ethers.Contract(SEPOLIA_USDT, ERC20_ABI, provider);
  const usdtBalance = await usdtContract.balanceOf(wallet.address);

  return {
    eth: ethers.formatEther(ethBalance),
    usdt: ethers.formatUnits(usdtBalance, 6), // USDT has 6 decimals
  };
}

async function authenticate(wallet: ethers.HDNodeWallet): Promise<string> {
  // Get sign message
  const signMsgRes = await fetch(`${API_URL}/auth/signMessage?address=${wallet.address}`);
  if (!signMsgRes.ok) throw new Error(`Failed to get sign message: ${signMsgRes.status}`);
  const signMsgData = await signMsgRes.json();

  // Sign message
  const signature = await wallet.signMessage(signMsgData.message);

  // Authenticate
  const authRes = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  if (!authRes.ok) throw new Error(`Auth failed: ${authRes.status}`);
  const authData = await authRes.json();

  return authData.accessToken;
}

async function getSellPaymentInfo(token: string, amount: number): Promise<any> {
  const response = await fetch(`${API_URL}/sell/paymentInfos?includeTx=true`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      iban: 'CH93 0076 2011 6238 5295 7',
      asset: { id: 407 }, // Sepolia USDT
      amount: amount,
      currency: { id: 1 }, // CHF
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sell API failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

function simulateFrontendLogic(sellResponse: any): { path: string; ready: boolean; reason: string } {
  // Simulate tx-helper.hook.ts sendTransaction logic

  // Check 1: EIP-5792 (PREFERRED for MetaMask)
  if (sellResponse.depositTx?.eip5792) {
    const { paymasterUrl, calls, chainId } = sellResponse.depositTx.eip5792;

    if (paymasterUrl && calls?.length > 0 && chainId) {
      return {
        path: 'EIP-5792',
        ready: true,
        reason: `wallet_sendCalls with paymaster: ${paymasterUrl.substring(0, 50)}...`,
      };
    }
  }

  // Check 2: EIP-7702 (fallback)
  if (sellResponse.gaslessAvailable && sellResponse.eip7702Authorization) {
    return {
      path: 'EIP-7702',
      ready: true,
      reason: `signEip7702Authorization with contract: ${sellResponse.eip7702Authorization.contractAddress}`,
    };
  }

  // Check 3: Standard transaction (needs ETH for gas)
  if (sellResponse.depositTx) {
    return {
      path: 'Standard',
      ready: false,
      reason: 'Requires ETH for gas - user has 0 ETH',
    };
  }

  return {
    path: 'None',
    ready: false,
    reason: 'No transaction data returned',
  };
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('FULL GASLESS SELL FLOW TEST - USDT on Sepolia');
  console.log('='.repeat(60));
  console.log(`API: ${API_URL}`);
  console.log(`Chain: Sepolia (${SEPOLIA_CHAIN_ID})`);
  console.log('');

  const seed1 = process.env.TEST_SEED;
  const seed2 = process.env.TEST_SEED_2;

  if (!seed1) {
    console.error('ERROR: TEST_SEED not set in .env.test');
    process.exit(1);
  }

  // Step 1: Check wallet balances
  console.log('\n--- Step 1: Check Wallet Balances ---\n');

  const wallet1 = ethers.Wallet.fromPhrase(seed1);
  const wallet2 = seed2 ? ethers.Wallet.fromPhrase(seed2) : null;

  console.log(`Wallet 1: ${wallet1.address}`);
  const balance1 = await getWalletBalances(wallet1);
  console.log(`  ETH: ${balance1.eth}`);
  console.log(`  USDT: ${balance1.usdt}`);

  let testWallet: ethers.HDNodeWallet = wallet1;
  let testBalance = balance1;

  if (wallet2) {
    console.log(`\nWallet 2: ${wallet2.address}`);
    const balance2 = await getWalletBalances(wallet2);
    console.log(`  ETH: ${balance2.eth}`);
    console.log(`  USDT: ${balance2.usdt}`);

    // Prefer wallet with USDT but less/no ETH
    const eth1 = parseFloat(balance1.eth);
    const eth2 = parseFloat(balance2.eth);
    const usdt1 = parseFloat(balance1.usdt);
    const usdt2 = parseFloat(balance2.usdt);

    if (usdt2 > 0 && eth2 < eth1) {
      testWallet = wallet2;
      testBalance = balance2;
      console.log('\n→ Using Wallet 2 (less ETH, has USDT)');
    } else if (usdt1 > 0) {
      console.log('\n→ Using Wallet 1 (has USDT)');
    }
  }

  const hasUsdt = parseFloat(testBalance.usdt) > 0;
  const hasNoEth = parseFloat(testBalance.eth) < 0.001;

  log('Wallet Balance Check', hasUsdt,
    `ETH: ${testBalance.eth}, USDT: ${testBalance.usdt}`,
    { address: testWallet.address, ...testBalance }
  );

  if (!hasUsdt) {
    console.log('\n⚠️  WARNING: Test wallet has no USDT - test will be limited');
  }

  if (!hasNoEth) {
    console.log('\n⚠️  WARNING: Test wallet has ETH - gasless may not be triggered');
    console.log('   For full gasless test, use a wallet with USDT but 0 ETH');
  }

  // Step 2: Authenticate
  console.log('\n--- Step 2: Authenticate with DFX API ---\n');

  let token: string;
  try {
    token = await authenticate(testWallet);
    log('Authentication', true, 'JWT token obtained');
  } catch (error: any) {
    log('Authentication', false, error.message);
    console.log('\nTest aborted due to authentication failure');
    return;
  }

  // Step 3: Get sell payment info
  console.log('\n--- Step 3: Get Sell Payment Info (includeTx=true) ---\n');

  let sellResponse: any;
  try {
    sellResponse = await getSellPaymentInfo(token, 0.01);
    log('Sell Payment Info', true, `ID: ${sellResponse.id}`);
  } catch (error: any) {
    log('Sell Payment Info', false, error.message);
    console.log('\nTest aborted due to API failure');
    return;
  }

  // Step 4: Check EIP-5792 data
  console.log('\n--- Step 4: Verify EIP-5792 Data ---\n');

  const hasEip5792 = !!sellResponse.depositTx?.eip5792;
  const hasEip7702 = sellResponse.gaslessAvailable && !!sellResponse.eip7702Authorization;

  log('depositTx present', !!sellResponse.depositTx,
    sellResponse.depositTx ? `chainId: ${sellResponse.depositTx.chainId}` : 'Missing'
  );

  log('EIP-5792 data present', hasEip5792,
    hasEip5792 ? `paymasterUrl: ${sellResponse.depositTx.eip5792.paymasterUrl.substring(0, 50)}...` : 'Not included'
  );

  if (hasEip5792) {
    const eip5792 = sellResponse.depositTx.eip5792;
    log('EIP-5792 chainId', eip5792.chainId === SEPOLIA_CHAIN_ID,
      `Expected ${SEPOLIA_CHAIN_ID}, got ${eip5792.chainId}`
    );
    log('EIP-5792 calls', eip5792.calls?.length > 0,
      `${eip5792.calls?.length || 0} call(s)`,
      eip5792.calls?.[0]
    );
    log('Pimlico paymaster URL', eip5792.paymasterUrl?.includes('pimlico.io'),
      eip5792.paymasterUrl
    );
  }

  log('EIP-7702 data present', hasEip7702,
    hasEip7702 ? `contract: ${sellResponse.eip7702Authorization.contractAddress}` : 'Not included'
  );

  log('gaslessAvailable flag', sellResponse.gaslessAvailable === true,
    `Value: ${sellResponse.gaslessAvailable}`
  );

  // Step 5: Simulate frontend logic
  console.log('\n--- Step 5: Simulate Frontend Transaction Logic ---\n');

  const frontendResult = simulateFrontendLogic(sellResponse);

  log('Transaction Path', frontendResult.ready,
    `Path: ${frontendResult.path} - ${frontendResult.reason}`
  );

  if (frontendResult.path === 'EIP-5792') {
    console.log('\n✅ Frontend would use wallet_sendCalls with paymaster');
    console.log('   MetaMask 12.20+ handles EIP-7702 internally');
    console.log('   User with 0 ETH can complete gasless transaction');
  } else if (frontendResult.path === 'EIP-7702') {
    console.log('\n⚠️  Frontend would use EIP-7702 direct signing');
    console.log('   This requires API PR #2858 to be merged');
  } else {
    console.log('\n❌ Frontend cannot complete gasless transaction');
    console.log(`   Reason: ${frontendResult.reason}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nTotal: ${results.length} checks`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  console.log('\n--- Full API Response ---\n');
  console.log(JSON.stringify(sellResponse, null, 2));

  if (failed > 0) {
    console.log('\n--- Failed Checks ---\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`❌ ${r.step}: ${r.details}`);
    });
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
