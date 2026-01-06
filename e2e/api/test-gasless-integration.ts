/**
 * Gasless Integration Test Script
 *
 * Tests the complete gasless transaction flow between:
 * 1. DFX API - Returns gasless data (eip7702Authorization, depositTx.eip5792)
 * 2. Pimlico Paymaster - Sponsors gas for transactions
 * 3. Frontend hooks - Process gasless data correctly
 *
 * Usage:
 *   API_URL=http://localhost:3000/v1 npx tsx e2e/api/test-gasless-integration.ts
 *   API_URL=https://dev.api.dfx.swiss/v1 npx tsx e2e/api/test-gasless-integration.ts
 *
 * Requirements:
 *   - TEST_SEED_2 in .env.test (wallet with 0 ETH but USDT on Sepolia)
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  API_URL: process.env.API_URL || 'https://dev.api.dfx.swiss/v1',
  TEST_SEED: process.env.TEST_SEED_2 || '',
  TEST_IBAN: process.env.TEST_IBAN || 'CH9300762011623852957',
  // Sepolia USDT (DFX asset ID 407)
  SEPOLIA_USDT_ID: 407,
  CHF_CURRENCY_ID: 1,
  USDT_AMOUNT: 0.01,
  // Expected Pimlico RPC URL pattern
  PIMLICO_URL_PATTERN: /api\.pimlico\.io\/v2\/.*\/rpc/,
};

// ============================================================================
// TYPES
// ============================================================================

interface SignMessageResponse {
  message: string;
}

interface AuthResponse {
  accessToken: string;
}

interface Eip7702TypedData {
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

interface Eip7702AuthorizationData {
  contractAddress: string;
  chainId: number;
  nonce: number;
  typedData: Eip7702TypedData;
}

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

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

const results: TestResult[] = [];

function test(name: string, passed: boolean, message: string, details?: unknown): void {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details && !passed) {
    console.log(`   Details: ${JSON.stringify(details, null, 2).substring(0, 500)}`);
  }
}

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ============================================================================
// API HELPERS
// ============================================================================

async function getAuthToken(wallet: ethers.Wallet): Promise<string> {
  const signMsgRes = await fetch(`${CONFIG.API_URL}/auth/signMessage?address=${wallet.address}`);
  if (!signMsgRes.ok) {
    throw new Error(`Failed to get sign message: ${signMsgRes.status}`);
  }
  const signMsgData: SignMessageResponse = await signMsgRes.json();

  const signature = await wallet.signMessage(signMsgData.message);

  const authRes = await fetch(`${CONFIG.API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  if (!authRes.ok) {
    throw new Error(`Failed to authenticate: ${authRes.status}`);
  }
  const authData: AuthResponse = await authRes.json();
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
    throw new Error(`Failed to get sell payment info: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// TEST CASES
// ============================================================================

async function testApiReturnsGaslessFields(token: string): Promise<SellPaymentInfoResponse | null> {
  section('Test 1: API Returns Gasless Fields');

  try {
    const paymentInfo = await getSellPaymentInfo(
      token,
      CONFIG.USDT_AMOUNT,
      CONFIG.SEPOLIA_USDT_ID,
      CONFIG.CHF_CURRENCY_ID,
      CONFIG.TEST_IBAN,
      true,
    );

    // Test: Response has required base fields
    test(
      'API Response Structure',
      !!paymentInfo.id && !!paymentInfo.depositAddress,
      paymentInfo.id ? `ID: ${paymentInfo.id}, Address: ${paymentInfo.depositAddress}` : 'Missing required fields',
    );

    // Test: gaslessAvailable field exists
    test(
      'gaslessAvailable Field',
      paymentInfo.gaslessAvailable !== undefined,
      `gaslessAvailable = ${paymentInfo.gaslessAvailable}`,
    );

    // Test: depositTx exists when includeTx=true
    test('depositTx Field', !!paymentInfo.depositTx, paymentInfo.depositTx ? 'Present' : 'Missing');

    // Test: isValid is true (quote is valid)
    test(
      'Quote Valid',
      paymentInfo.isValid === true,
      paymentInfo.isValid ? 'Quote is valid' : `Invalid: ${paymentInfo.error}`,
    );

    return paymentInfo;
  } catch (error) {
    test('API Call', false, `Error: ${(error as Error).message}`);
    return null;
  }
}

function testEip7702AuthorizationData(paymentInfo: SellPaymentInfoResponse): void {
  section('Test 2: EIP-7702 Authorization Data');

  const auth = paymentInfo.eip7702Authorization;

  if (!auth) {
    test(
      'EIP-7702 Authorization',
      false,
      'Not provided - API may not support EIP-7702 or wallet has ETH balance',
    );
    return;
  }

  // Test: Contract address is valid
  test(
    'Contract Address',
    /^0x[a-fA-F0-9]{40}$/.test(auth.contractAddress),
    `Address: ${auth.contractAddress}`,
  );

  // Test: Chain ID is Sepolia (11155111)
  test(
    'Chain ID',
    auth.chainId === 11155111,
    `ChainId: ${auth.chainId} (expected 11155111 for Sepolia)`,
  );

  // Test: Nonce is a number
  test('Nonce', typeof auth.nonce === 'number' && auth.nonce >= 0, `Nonce: ${auth.nonce}`);

  // Test: TypedData structure
  const typedData = auth.typedData;
  if (typedData) {
    test(
      'TypedData Domain',
      !!typedData.domain && typeof typedData.domain === 'object',
      typedData.domain ? 'Present' : 'Missing',
    );

    test(
      'TypedData Types',
      !!typedData.types && typeof typedData.types === 'object',
      typedData.types ? `Types: ${Object.keys(typedData.types).join(', ')}` : 'Missing',
    );

    test('TypedData PrimaryType', !!typedData.primaryType, `PrimaryType: ${typedData.primaryType}`);

    test(
      'TypedData Message',
      !!typedData.message && typeof typedData.message === 'object',
      typedData.message ? 'Present' : 'Missing',
    );
  } else {
    test('TypedData', false, 'Missing typedData in authorization');
  }
}

function testEip5792Data(paymentInfo: SellPaymentInfoResponse): void {
  section('Test 3: EIP-5792 Data (Fallback)');

  const eip5792 = paymentInfo.depositTx?.eip5792;

  if (!eip5792) {
    test(
      'EIP-5792 Data',
      false,
      'Not provided - API may not support EIP-5792 or wallet has ETH balance',
    );
    return;
  }

  // Test: Paymaster URL exists and matches Pimlico pattern
  test(
    'Paymaster URL',
    CONFIG.PIMLICO_URL_PATTERN.test(eip5792.paymasterUrl),
    `URL: ${eip5792.paymasterUrl?.substring(0, 60)}...`,
  );

  // Test: Chain ID is Sepolia
  test(
    'Chain ID',
    eip5792.chainId === 11155111,
    `ChainId: ${eip5792.chainId} (expected 11155111)`,
  );

  // Test: Calls array exists and has entries
  test(
    'Calls Array',
    Array.isArray(eip5792.calls) && eip5792.calls.length > 0,
    `${eip5792.calls?.length || 0} call(s)`,
  );

  // Test each call
  if (eip5792.calls) {
    eip5792.calls.forEach((call, index) => {
      test(
        `Call ${index}: To Address`,
        /^0x[a-fA-F0-9]{40}$/.test(call.to),
        `To: ${call.to}`,
      );

      test(
        `Call ${index}: Data`,
        call.data?.startsWith('0x'),
        `Data: ${call.data?.substring(0, 20)}...`,
      );

      test(
        `Call ${index}: Value`,
        call.value !== undefined,
        `Value: ${call.value}`,
      );
    });
  }
}

async function testPimlicoPaymasterConnectivity(paymentInfo: SellPaymentInfoResponse): Promise<void> {
  section('Test 4: Pimlico Paymaster Connectivity');

  const paymasterUrl = paymentInfo.depositTx?.eip5792?.paymasterUrl;

  if (!paymasterUrl) {
    test('Paymaster URL', false, 'No paymaster URL available to test');
    return;
  }

  try {
    // Test: URL is reachable (JSON-RPC endpoint)
    // We send a minimal JSON-RPC request to check connectivity
    const response = await fetch(paymasterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_supportedEntryPoints',
        params: [],
      }),
    });

    test(
      'Paymaster Reachable',
      response.ok || response.status === 400, // 400 is OK for invalid params, means server responded
      `Status: ${response.status}`,
    );

    if (response.ok) {
      const data = await response.json();
      test(
        'Paymaster Response',
        !!data.result || !!data.error,
        data.result ? `EntryPoints: ${JSON.stringify(data.result)}` : `Error: ${data.error?.message}`,
      );
    }
  } catch (error) {
    test('Paymaster Connectivity', false, `Error: ${(error as Error).message}`);
  }
}

async function testEip7702SignatureSimulation(
  wallet: ethers.Wallet,
  paymentInfo: SellPaymentInfoResponse,
): Promise<void> {
  section('Test 5: EIP-7702 Signature Simulation');

  const auth = paymentInfo.eip7702Authorization;

  if (!auth) {
    test('EIP-7702 Signature', false, 'No authorization data to sign');
    return;
  }

  try {
    // Simulate signing the EIP-712 typed data (as the frontend would do)
    // Note: MetaMask uses eth_signTypedData_v4, we simulate with ethers

    const domain = auth.typedData.domain;
    const types = { ...auth.typedData.types };
    // Remove EIP712Domain from types if present (ethers adds it automatically)
    delete (types as any).EIP712Domain;

    const message = auth.typedData.message;

    // Sign typed data
    const signature = await wallet.signTypedData(
      domain as ethers.TypedDataDomain,
      types,
      message,
    );

    // Parse signature into r, s, v
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    const yParity = v - 27;

    test('Signature Generated', signature.length === 132, `Signature: ${signature.substring(0, 20)}...`);
    test('R Component', r.length === 66 && r.startsWith('0x'), `r: ${r.substring(0, 20)}...`);
    test('S Component', s.length === 66 && s.startsWith('0x'), `s: ${s.substring(0, 20)}...`);
    test('yParity', yParity === 0 || yParity === 1, `yParity: ${yParity}`);

    // Build the signed authorization object (as frontend would send to API)
    const signedAuth = {
      chainId: auth.chainId,
      address: auth.contractAddress,
      nonce: auth.nonce,
      r,
      s,
      yParity,
    };

    test(
      'Signed Authorization Structure',
      !!signedAuth.chainId && !!signedAuth.address && !!signedAuth.r && !!signedAuth.s,
      'All fields present',
      signedAuth,
    );
  } catch (error) {
    test('Signature Generation', false, `Error: ${(error as Error).message}`);
  }
}

function testFrontendHookCompatibility(paymentInfo: SellPaymentInfoResponse): void {
  section('Test 6: Frontend Hook Compatibility');

  // Test: Data matches what tx-helper.hook.ts expects

  // EIP-7702 path check
  const wouldUseEip7702 = paymentInfo.gaslessAvailable === true && !!paymentInfo.eip7702Authorization;
  test(
    'EIP-7702 Path Condition',
    wouldUseEip7702 || !paymentInfo.gaslessAvailable,
    wouldUseEip7702
      ? 'Would use EIP-7702 gasless flow'
      : paymentInfo.gaslessAvailable
        ? 'gaslessAvailable=true but missing eip7702Authorization'
        : 'gaslessAvailable=false (standard tx)',
  );

  // EIP-5792 path check
  const wouldUseEip5792 = !!paymentInfo.depositTx?.eip5792;
  test(
    'EIP-5792 Path Condition',
    wouldUseEip5792 || !paymentInfo.depositTx,
    wouldUseEip5792
      ? 'Would use EIP-5792 gasless flow (fallback)'
      : 'No EIP-5792 data (would use standard tx)',
  );

  // Check depositTx.eip5792 structure matches Eip5792Data type
  if (paymentInfo.depositTx?.eip5792) {
    const eip5792 = paymentInfo.depositTx.eip5792;
    const hasRequiredFields =
      typeof eip5792.paymasterUrl === 'string' &&
      typeof eip5792.chainId === 'number' &&
      Array.isArray(eip5792.calls);

    test(
      'EIP-5792 Type Compatibility',
      hasRequiredFields,
      hasRequiredFields
        ? 'Matches Eip5792Data interface'
        : 'Missing required fields for Eip5792Data',
    );
  }

  // Check eip7702Authorization structure matches Eip7702AuthorizationData type
  if (paymentInfo.eip7702Authorization) {
    const auth = paymentInfo.eip7702Authorization;
    const hasRequiredFields =
      typeof auth.contractAddress === 'string' &&
      typeof auth.chainId === 'number' &&
      typeof auth.nonce === 'number' &&
      !!auth.typedData;

    test(
      'EIP-7702 Type Compatibility',
      hasRequiredFields,
      hasRequiredFields
        ? 'Matches Eip7702AuthorizationData interface'
        : 'Missing required fields for Eip7702AuthorizationData',
    );
  }
}

async function testConfirmSellWithAuthorization(
  token: string,
  wallet: ethers.Wallet,
  paymentInfo: SellPaymentInfoResponse,
): Promise<void> {
  section('Test 7: Confirm Sell with EIP-7702 Authorization (DRY RUN)');

  const auth = paymentInfo.eip7702Authorization;

  if (!auth) {
    test('Confirm Sell', false, 'No authorization data available');
    return;
  }

  try {
    // Generate signed authorization
    const domain = auth.typedData.domain;
    const types = { ...auth.typedData.types };
    delete (types as any).EIP712Domain;
    const message = auth.typedData.message;

    const signature = await wallet.signTypedData(
      domain as ethers.TypedDataDomain,
      types,
      message,
    );

    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    const yParity = v - 27;

    const signedAuth = {
      chainId: auth.chainId,
      address: auth.contractAddress,
      nonce: auth.nonce,
      r,
      s,
      yParity,
    };

    // Send to confirmSell endpoint
    const confirmUrl = `${CONFIG.API_URL}/sell/paymentInfos/${paymentInfo.id}/confirm`;
    console.log(`\nCalling: PUT ${confirmUrl}`);
    console.log(`Authorization payload: chainId=${signedAuth.chainId}, address=${signedAuth.address}, nonce=${signedAuth.nonce}`);

    const response = await fetch(confirmUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ authorization: signedAuth }),
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`Response Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(responseData, null, 2).substring(0, 500)}`);

    // Analyze response
    if (response.ok) {
      test(
        'Confirm Sell Response',
        true,
        `Transaction submitted! ID: ${responseData.id || 'unknown'}`,
        responseData,
      );

      // Check if we got a transaction hash
      if (responseData.txHash || responseData.transactionHash) {
        test(
          'Transaction Hash',
          true,
          `TxHash: ${responseData.txHash || responseData.transactionHash}`,
        );
      }
    } else {
      // Check specific error types
      const errorMessage = responseData.message || responseData.error || responseText;

      // AA13 = initCode failed (EntryPoint issue)
      if (errorMessage.includes('AA13')) {
        test(
          'Confirm Sell',
          false,
          'AA13 Error - initCode failed. API likely using wrong EntryPoint version or field format.',
          { error: errorMessage },
        );
      }
      // AA21 = didn't pay prefund
      else if (errorMessage.includes('AA21')) {
        test(
          'Confirm Sell',
          false,
          'AA21 Error - Paymaster did not pay prefund. Paymaster sponsorship issue.',
          { error: errorMessage },
        );
      }
      // Invalid signature
      else if (errorMessage.includes('signature') || errorMessage.includes('Signature')) {
        test(
          'Confirm Sell',
          false,
          'Signature Error - EIP-7702 signature format may be incorrect.',
          { error: errorMessage },
        );
      }
      // Generic error
      else {
        test(
          'Confirm Sell',
          false,
          `Error: ${errorMessage}`,
          responseData,
        );
      }
    }
  } catch (error) {
    test('Confirm Sell', false, `Exception: ${(error as Error).message}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const runLiveTest = process.argv.includes('--live');

  console.log('='.repeat(60));
  console.log('  GASLESS INTEGRATION TEST');
  console.log('='.repeat(60));
  console.log(`\nAPI URL: ${CONFIG.API_URL}`);
  console.log(`Live Test: ${runLiveTest ? 'YES (will call confirmSell)' : 'NO (use --live to enable)'}`);

  // Validate config
  if (!CONFIG.TEST_SEED) {
    console.error('\nERROR: TEST_SEED_2 not set in .env.test');
    console.error('This test requires a wallet with 0 ETH but USDT on Sepolia');
    process.exit(1);
  }

  try {
    // Create wallet from seed
    const wallet = ethers.Wallet.fromPhrase(CONFIG.TEST_SEED);
    console.log(`\nTest Wallet: ${wallet.address}`);

    // Authenticate
    section('Authentication');
    console.log('Getting auth token...');
    const token = await getAuthToken(wallet);
    test('Authentication', !!token, 'Token received');

    // Run tests
    const paymentInfo = await testApiReturnsGaslessFields(token);

    if (paymentInfo) {
      testEip7702AuthorizationData(paymentInfo);
      testEip5792Data(paymentInfo);
      await testPimlicoPaymasterConnectivity(paymentInfo);
      await testEip7702SignatureSimulation(wallet, paymentInfo);
      testFrontendHookCompatibility(paymentInfo);

      // Live test: Actually call confirmSell endpoint
      if (runLiveTest) {
        await testConfirmSellWithAuthorization(token, wallet, paymentInfo);
      } else {
        console.log('\n[SKIPPED] Test 7: Confirm Sell (use --live flag to enable)');
      }
    }

    // Summary
    section('TEST SUMMARY');
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.message}`);
        });
    }

    // Exit code based on results
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  }
}

// Run
main();
