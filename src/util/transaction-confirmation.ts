export interface TransactionConfirmationConfig {
  /** Maximum time to wait for confirmation in ms (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Number of confirmations to wait for (default: 1) */
  confirmations?: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  status: boolean;
  blockNumber: number;
  confirmations: number;
}

export class TransactionFailedError extends Error {
  constructor(
    public readonly txHash: string,
    message?: string,
  ) {
    super(message || `Transaction ${txHash} failed (reverted)`);
    this.name = 'TransactionFailedError';
  }
}

export class TransactionTimeoutError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly timeoutMs: number,
  ) {
    super(`Transaction ${txHash} confirmation timed out after ${timeoutMs}ms`);
    this.name = 'TransactionTimeoutError';
  }
}

const DEFAULT_TIMEOUT = 120000; // 2 minutes
const DEFAULT_CONFIRMATIONS = 1;
const POLL_INTERVAL = 2000; // 2 seconds

/**
 * Wait for an EVM transaction to be confirmed using Web3
 */
export async function waitForEvmTransactionWeb3(
  web3: any,
  txHash: string,
  config?: TransactionConfirmationConfig,
): Promise<TransactionReceipt> {
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  const requiredConfirmations = config?.confirmations ?? DEFAULT_CONFIRMATIONS;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await web3.eth.getTransactionReceipt(txHash);

      if (receipt) {
        // Check if transaction was successful (status = true or 1)
        const status = receipt.status === true || receipt.status === '0x1' || receipt.status === 1;

        if (!status) {
          throw new TransactionFailedError(txHash);
        }

        // Check confirmations
        const currentBlock = await web3.eth.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber + 1;

        if (confirmations >= requiredConfirmations) {
          return {
            transactionHash: txHash,
            status: true,
            blockNumber: Number(receipt.blockNumber),
            confirmations,
          };
        }
      }
    } catch (error) {
      if (error instanceof TransactionFailedError) {
        throw error;
      }
      // Ignore other errors and continue polling
    }

    await sleep(POLL_INTERVAL);
  }

  throw new TransactionTimeoutError(txHash, timeout);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
