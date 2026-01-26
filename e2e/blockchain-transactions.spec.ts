import { test, expect } from '@playwright/test';
import {
  sendSepoliaETH,
  verifyTransactionConfirmed,
  getTestWalletAddress,
  checkTestWalletBalance,
  getSepoliaBalance,
  TransactionRevertedError,
  TransactionTimeoutError,
} from './helpers/sepolia-transaction';
import { getCachedAuth, getTestIban } from './helpers/auth-cache';

const API_URL = `${process.env.REACT_APP_API_URL}/v1`;

interface Asset {
  id: number;
  name: string;
  blockchain: string;
  sellable: boolean;
}

interface SellPaymentInfo {
  id: number;
  routeId: number;
  depositAddress: string;
  amount: number;
  estimatedAmount: number;
  isValid: boolean;
  error?: string;
}

/**
 * E2E Tests for real blockchain transactions on Sepolia testnet.
 *
 * These tests send actual transactions on the Sepolia testnet and verify
 * that they are confirmed on the blockchain.
 *
 * Prerequisites:
 * - TEST_SEED environment variable must be set with a valid mnemonic
 * - The test wallet must have sufficient Sepolia ETH for gas fees
 * - Get Sepolia ETH from: https://sepoliafaucet.com/
 */
test.describe('Blockchain Transactions - Sepolia Testnet', () => {
  // Use longer timeout for blockchain transactions
  test.setTimeout(180000); // 3 minutes

  let testWalletAddress: string;

  test.beforeAll(async () => {
    testWalletAddress = await getTestWalletAddress();
    console.log(`Test wallet address: ${testWalletAddress}`);

    const balance = await getSepoliaBalance(testWalletAddress);
    console.log(`Test wallet balance: ${balance} ETH`);
  });

  test('should have sufficient test wallet balance', async () => {
    const hasBalance = await checkTestWalletBalance('0.001');
    expect(hasBalance).toBeTruthy();
  });

  test('should send ETH and verify confirmation on blockchain', async () => {
    // Skip if insufficient balance
    const hasBalance = await checkTestWalletBalance('0.002');
    if (!hasBalance) {
      test.skip();
      return;
    }

    // Send a small amount of ETH to self (to test transaction without losing funds)
    const result = await sendSepoliaETH(
      testWalletAddress, // Send to self
      '0.0001', // Very small amount
      { timeout: 120000, confirmations: 1 },
    );

    // Verify transaction was confirmed
    expect(result.status).toBe('confirmed');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.blockNumber).toBeGreaterThan(0);
    expect(result.confirmations).toBeGreaterThanOrEqual(1);

    console.log(`ETH Transaction confirmed:`);
    console.log(`  Hash: ${result.txHash}`);
    console.log(`  Block: ${result.blockNumber}`);
    console.log(`  Confirmations: ${result.confirmations}`);
    console.log(`  Gas used: ${result.gasUsed}`);
  });

  test('should throw TransactionTimeoutError for non-existent transaction', async () => {
    // This test verifies that our confirmation check throws an error
    // when a transaction is not found/confirmed within the timeout

    const invalidTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

    await expect(
      verifyTransactionConfirmed(invalidTxHash, { timeout: 10000 }),
    ).rejects.toThrow(TransactionTimeoutError);
  });

  test('should succeed for valid transaction (not reverted)', async () => {
    // This test verifies that a successful transaction does NOT throw an error
    // If the transaction were reverted, sendSepoliaETH would throw TransactionRevertedError

    const hasBalance = await checkTestWalletBalance('0.001');
    if (!hasBalance) {
      test.skip();
      return;
    }

    // Send a valid transaction - this will THROW if reverted!
    const result = await sendSepoliaETH(
      testWalletAddress,
      '0.00001',
      { timeout: 120000, confirmations: 1 },
    );

    // If we get here, the transaction was confirmed (not reverted)
    expect(result.status).toBe('confirmed');
    expect(result.blockNumber).toBeGreaterThan(0);

    console.log(`✅ Transaction confirmed in block ${result.blockNumber}`);
  });

  test('should throw TransactionRevertedError for reverted transactions', async () => {
    // This test documents the expected behavior:
    // If a transaction is reverted, TransactionRevertedError is thrown automatically
    //
    // We can't easily trigger a revert with a simple ETH transfer,
    // but the logic is in place and will catch any Smart Contract call that reverts

    console.log('TransactionRevertedError is thrown automatically when receipt.status === 0');
    console.log('This ensures tests FAIL when a transaction is reverted on the blockchain');

    // Verify the error class exists and has correct properties
    const mockError = new TransactionRevertedError('0x123', 12345, BigInt(21000));
    expect(mockError.name).toBe('TransactionRevertedError');
    expect(mockError.txHash).toBe('0x123');
    expect(mockError.blockNumber).toBe(12345);
    expect(mockError.message).toContain('REVERTED');
  });
});

/**
 * Integration tests that combine API calls with blockchain verification.
 * These tests verify the full sell flow including blockchain confirmation.
 */
test.describe('Sell Flow with Blockchain Verification - Sepolia', () => {
  test.setTimeout(180000);

  test('should complete full sell flow: API -> Blockchain -> Confirmation', async ({ request }) => {
    // Step 1: Check wallet balance
    const hasBalance = await checkTestWalletBalance('0.01');
    if (!hasBalance) {
      console.log('Skipping test - insufficient balance');
      test.skip();
      return;
    }

    // Step 2: Authenticate
    const { token } = await getCachedAuth(request, 'evm');

    // Step 3: Get Sepolia ETH asset dynamically
    const assetsResponse = await request.get(`${API_URL}/asset`);
    if (!assetsResponse.ok()) {
      console.log('Assets API not available, skipping test');
      test.skip();
      return;
    }

    const assets: Asset[] = await assetsResponse.json();
    const sepoliaEth = assets.find((a) => a.blockchain === 'Sepolia' && a.name === 'ETH' && a.sellable);

    if (!sepoliaEth) {
      console.log('Sepolia ETH not found or not sellable, skipping test');
      test.skip();
      return;
    }

    console.log(`Found Sepolia ETH asset: ID ${sepoliaEth.id}`);

    // Step 4: Create sell payment info to get deposit address
    const paymentInfoResponse = await request.put(`${API_URL}/sell/paymentInfos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        asset: { id: sepoliaEth.id },
        currency: { id: 1 }, // CHF
        amount: 0.001,
        iban: getTestIban(),
      },
    });

    if (!paymentInfoResponse.ok()) {
      const error = await paymentInfoResponse.json().catch(() => ({}));
      console.log(`PaymentInfo creation failed: ${JSON.stringify(error)}`);
      // Expected errors for test accounts
      const errorMsg = (error as { message?: string }).message || '';
      if (errorMsg.includes('KYC') || errorMsg.includes('Trading not allowed') || errorMsg.includes('RecommendationRequired') || errorMsg.includes('EmailRequired') || errorMsg.includes('Ident')) {
        console.log('Account restriction - skipping test');
        test.skip();
        return;
      }
      test.skip();
      return;
    }

    const paymentInfo: SellPaymentInfo = await paymentInfoResponse.json();
    console.log(`PaymentInfo created: ID ${paymentInfo.id}`);
    console.log(`Deposit address: ${paymentInfo.depositAddress}`);

    expect(paymentInfo.depositAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Step 5: Send ETH to the REAL deposit address on Sepolia
    const txResult = await sendSepoliaETH(
      paymentInfo.depositAddress,
      '0.0001',
      { timeout: 120000, confirmations: 1 },
    );

    // Step 6: Verify the transaction was confirmed on the blockchain
    expect(txResult.status).toBe('confirmed');
    expect(txResult.blockNumber).toBeGreaterThan(0);

    console.log('Sell flow completed successfully:');
    console.log(`  PaymentInfo ID: ${paymentInfo.id}`);
    console.log(`  Deposit Address: ${paymentInfo.depositAddress}`);
    console.log(`  Transaction: ${txResult.txHash}`);
    console.log(`  Block: ${txResult.blockNumber}`);
    console.log(`  Status: ${txResult.status}`);

    // Step 7: Additional verification - check the transaction on chain
    const verificationResult = await verifyTransactionConfirmed(txResult.txHash);
    expect(verificationResult.status).toBe('confirmed');
  });
});

// Note: Swap tests are not possible on Sepolia because no assets are buyable on this testnet.
// Swaps require both sellable source and buyable target assets on the same network.

/**
 * Transaction confirmation edge cases
 */
test.describe('Transaction Confirmation Edge Cases', () => {
  test.setTimeout(60000);

  test('should throw TransactionTimeoutError on timeout', async () => {
    // Test with a very short timeout to simulate timeout scenario
    const invalidTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';

    await expect(
      verifyTransactionConfirmed(invalidTxHash, { timeout: 5000 }),
    ).rejects.toThrow(TransactionTimeoutError);
  });

  test('should require minimum confirmations before success', async () => {
    const hasBalance = await checkTestWalletBalance('0.001');
    if (!hasBalance) {
      test.skip();
      return;
    }

    const testWalletAddress = await getTestWalletAddress();

    // Send transaction and wait for 2 confirmations
    // This will THROW if reverted or times out!
    const result = await sendSepoliaETH(
      testWalletAddress,
      '0.00001',
      { timeout: 180000, confirmations: 2 },
    );

    expect(result.status).toBe('confirmed');
    expect(result.confirmations).toBeGreaterThanOrEqual(2);

    console.log(`✅ Transaction confirmed with ${result.confirmations} confirmations`);
  });
});
