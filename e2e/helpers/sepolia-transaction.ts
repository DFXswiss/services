import { JsonRpcProvider, Wallet, HDNodeWallet, parseEther, formatEther, Contract } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getTestConfig } from '../test-wallet';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Sepolia RPC endpoints (public)
const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://sepolia.drpc.org',
];

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export interface TransactionResult {
  txHash: string;
  status: 'confirmed' | 'failed' | 'pending';
  blockNumber?: number;
  confirmations: number;
  gasUsed?: bigint;
  error?: string;
}

/**
 * Error thrown when a transaction is reverted on the blockchain
 */
export class TransactionRevertedError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly blockNumber: number,
    public readonly gasUsed?: bigint,
  ) {
    super(`Transaction ${txHash} was REVERTED in block ${blockNumber}. The transaction was included in the blockchain but the execution failed.`);
    this.name = 'TransactionRevertedError';
  }
}

/**
 * Error thrown when a transaction confirmation times out
 */
export class TransactionTimeoutError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly timeoutMs: number,
  ) {
    super(`Transaction ${txHash} was not confirmed within ${timeoutMs}ms. The transaction may still be pending.`);
    this.name = 'TransactionTimeoutError';
  }
}

export interface TransactionConfig {
  /** Timeout in ms for waiting for confirmation (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Number of confirmations to wait for (default: 1) */
  confirmations?: number;
  /** Gas price in gwei (optional, uses network estimate if not provided) */
  gasPrice?: number;
}

const DEFAULT_TIMEOUT = 120000;
const DEFAULT_CONFIRMATIONS = 1;

/**
 * Creates a Sepolia provider with fallback RPC endpoints
 */
export async function createSepoliaProvider(): Promise<JsonRpcProvider> {
  for (const url of SEPOLIA_RPC_URLS) {
    try {
      const provider = new JsonRpcProvider(url);
      // Test the connection
      await provider.getBlockNumber();
      console.log(`Connected to Sepolia via ${url}`);
      return provider;
    } catch (error) {
      console.warn(`Failed to connect to ${url}, trying next...`);
    }
  }
  throw new Error('Failed to connect to any Sepolia RPC endpoint');
}

/**
 * Creates a wallet from the test seed phrase
 */
export async function createTestWallet(): Promise<{ wallet: HDNodeWallet; provider: JsonRpcProvider }> {
  const config = getTestConfig();
  const provider = await createSepoliaProvider();
  const wallet = Wallet.fromPhrase(config.seed).connect(provider);
  return { wallet, provider };
}

/**
 * Gets the ETH balance of an address on Sepolia
 */
export async function getSepoliaBalance(address: string): Promise<string> {
  const provider = await createSepoliaProvider();
  const balance = await provider.getBalance(address);
  return formatEther(balance);
}

/**
 * Sends ETH on Sepolia and waits for confirmation
 */
export async function sendSepoliaETH(
  toAddress: string,
  amountInEther: string,
  config?: TransactionConfig,
): Promise<TransactionResult> {
  const { wallet, provider } = await createTestWallet();
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const requiredConfirmations = config?.confirmations ?? DEFAULT_CONFIRMATIONS;

  console.log(`Sending ${amountInEther} ETH to ${toAddress} on Sepolia...`);
  console.log(`From address: ${wallet.address}`);

  // Check balance first
  const balance = await provider.getBalance(wallet.address);
  const amountWei = parseEther(amountInEther);

  if (balance < amountWei) {
    throw new Error(
      `Insufficient balance: ${formatEther(balance)} ETH, need ${amountInEther} ETH`,
    );
  }

  // Send transaction
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: amountWei,
    ...(config?.gasPrice && { gasPrice: BigInt(config.gasPrice) * BigInt(1e9) }),
  });

  console.log(`Transaction sent: ${tx.hash}`);

  // Wait for confirmation
  return await waitForTransactionConfirmation(
    provider,
    tx.hash,
    timeout,
    requiredConfirmations,
  );
}

/**
 * Sends ERC20 tokens on Sepolia and waits for confirmation
 */
export async function sendSepoliaToken(
  tokenAddress: string,
  toAddress: string,
  amount: string,
  config?: TransactionConfig,
): Promise<TransactionResult> {
  const { wallet, provider } = await createTestWallet();
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const requiredConfirmations = config?.confirmations ?? DEFAULT_CONFIRMATIONS;

  const tokenContract = new Contract(tokenAddress, ERC20_ABI, wallet);

  // Get token info
  const [decimals, symbol] = await Promise.all([
    tokenContract.decimals(),
    tokenContract.symbol(),
  ]);

  const amountWei = BigInt(parseFloat(amount) * Math.pow(10, Number(decimals)));

  console.log(`Sending ${amount} ${symbol} to ${toAddress} on Sepolia...`);
  console.log(`From address: ${wallet.address}`);

  // Check token balance
  const balance = await tokenContract.balanceOf(wallet.address);
  if (balance < amountWei) {
    throw new Error(
      `Insufficient ${symbol} balance: ${Number(balance) / Math.pow(10, Number(decimals))}, need ${amount}`,
    );
  }

  // Send transaction
  const tx = await tokenContract.transfer(toAddress, amountWei);

  console.log(`Transaction sent: ${tx.hash}`);

  // Wait for confirmation
  return await waitForTransactionConfirmation(
    provider,
    tx.hash,
    timeout,
    requiredConfirmations,
  );
}

/**
 * Waits for a transaction to be confirmed and returns the result.
 * THROWS an error if the transaction is reverted or times out.
 */
export async function waitForTransactionConfirmation(
  provider: JsonRpcProvider,
  txHash: string,
  timeout: number = DEFAULT_TIMEOUT,
  requiredConfirmations: number = DEFAULT_CONFIRMATIONS,
): Promise<TransactionResult> {
  const startTime = Date.now();

  console.log(`Waiting for transaction ${txHash} to be confirmed...`);

  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (receipt) {
        const currentBlock = await provider.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber + 1;

        // CRITICAL: Check if transaction was reverted (status === 0)
        // A reverted transaction is included in the blockchain but FAILED execution
        if (receipt.status === 0) {
          console.error(`❌ Transaction ${txHash} REVERTED in block ${receipt.blockNumber}`);
          console.error(`   Gas used: ${receipt.gasUsed}`);
          console.error(`   This means the transaction was included but execution FAILED!`);

          // THROW an error - a reverted transaction is a test failure!
          throw new TransactionRevertedError(txHash, receipt.blockNumber, receipt.gasUsed);
        }

        // Check if we have enough confirmations
        if (confirmations >= requiredConfirmations) {
          console.log(
            `✅ Transaction ${txHash} CONFIRMED in block ${receipt.blockNumber} with ${confirmations} confirmations`,
          );
          return {
            txHash,
            status: 'confirmed',
            blockNumber: receipt.blockNumber,
            confirmations,
            gasUsed: receipt.gasUsed,
          };
        }

        console.log(`⏳ Transaction has ${confirmations}/${requiredConfirmations} confirmations...`);
      }
    } catch (error) {
      // Re-throw TransactionRevertedError - this is a real failure!
      if (error instanceof TransactionRevertedError) {
        throw error;
      }
      // Ignore other errors and continue polling
      console.warn(`Error checking transaction: ${error}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timeout is also a failure - we don't know if the transaction succeeded
  console.error(`❌ Transaction ${txHash} confirmation TIMED OUT after ${timeout}ms`);
  throw new TransactionTimeoutError(txHash, timeout);
}

/**
 * Verifies a transaction was confirmed on Sepolia.
 * Throws TransactionRevertedError if reverted, TransactionTimeoutError if timed out.
 */
export async function verifyTransactionConfirmed(
  txHash: string,
  config?: TransactionConfig,
): Promise<TransactionResult> {
  const provider = await createSepoliaProvider();
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const requiredConfirmations = config?.confirmations ?? DEFAULT_CONFIRMATIONS;

  // This will throw TransactionRevertedError or TransactionTimeoutError on failure
  return await waitForTransactionConfirmation(
    provider,
    txHash,
    timeout,
    requiredConfirmations,
  );
}

/**
 * Gets the test wallet address
 */
export async function getTestWalletAddress(): Promise<string> {
  const { wallet } = await createTestWallet();
  return wallet.address;
}

/**
 * Checks if the test wallet has sufficient ETH balance for testing
 */
export async function checkTestWalletBalance(minEthRequired = '0.01'): Promise<boolean> {
  const { wallet, provider } = await createTestWallet();
  const balance = await provider.getBalance(wallet.address);
  const minRequired = parseEther(minEthRequired);

  const hasEnough = balance >= minRequired;

  if (!hasEnough) {
    console.warn(
      `Test wallet ${wallet.address} has insufficient balance: ${formatEther(balance)} ETH, need at least ${minEthRequired} ETH`,
    );
    console.warn('Get Sepolia ETH from: https://sepoliafaucet.com/');
  }

  return hasEnough;
}
