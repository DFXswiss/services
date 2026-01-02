import { Asset, Blockchain, useApi } from '@dfx.swiss/react';
import * as Solana from '@solana/web3.js';
import { useMemo } from 'react';
import { TransactionFailedError, TransactionTimeoutError } from '../util/transaction-confirmation';
import { TranslatedError } from '../util/translated-error';

interface UnsignedTransactionDto {
  rawTransaction: string;
  encoding: 'base64' | 'hex';
  recentBlockhash?: string;
  expiration?: number;
}

interface BroadcastResultDto {
  txHash: string;
}

interface TransactionStatusDto {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  error?: string;
}

export interface BlockchainTransactionInterface {
  createSolanaTransaction: (
    fromAddress: string,
    toAddress: string,
    amount: number,
    asset?: Asset,
  ) => Promise<Solana.Transaction>;
  createTronTransaction: (
    fromAddress: string,
    toAddress: string,
    amount: number,
    asset?: Asset,
  ) => Promise<object>;
  broadcastTransaction: (blockchain: Blockchain, signedTransaction: string) => Promise<string>;
}

export function useBlockchainTransaction(): BlockchainTransactionInterface {
  const { call } = useApi();

  async function createSolanaTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    asset?: Asset,
  ): Promise<Solana.Transaction> {
    const response = await call<UnsignedTransactionDto>({
      url: 'blockchain/transaction',
      method: 'POST',
      data: {
        blockchain: Blockchain.SOLANA,
        fromAddress,
        toAddress,
        amount,
        assetId: asset?.id,
      },
    });

    // Deserialize the transaction from base64
    const transactionBuffer = Buffer.from(response.rawTransaction, 'base64');
    return Solana.Transaction.from(transactionBuffer);
  }

  async function createTronTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    asset?: Asset,
  ): Promise<object> {
    const response = await call<UnsignedTransactionDto>({
      url: 'blockchain/transaction',
      method: 'POST',
      data: {
        blockchain: Blockchain.TRON,
        fromAddress,
        toAddress,
        amount,
        assetId: asset?.id,
      },
    });

    // Parse the transaction JSON
    return JSON.parse(response.rawTransaction);
  }

  async function broadcastTransaction(blockchain: Blockchain, signedTransaction: string): Promise<string> {
    const response = await call<BroadcastResultDto>({
      url: 'blockchain/broadcast',
      method: 'POST',
      data: {
        blockchain,
        signedTransaction,
      },
    });

    const txHash = response.txHash;

    // Wait for transaction confirmation
    try {
      await waitForTransactionConfirmation(blockchain, txHash);
    } catch (error) {
      if (error instanceof TransactionFailedError) {
        throw new TranslatedError('Transaction failed on the blockchain. Please try again.');
      }
      if (error instanceof TransactionTimeoutError) {
        // Transaction was sent but confirmation timed out - return hash anyway
        console.warn(`Transaction confirmation timed out for ${txHash}, but transaction was sent`);
      } else {
        throw error;
      }
    }

    return txHash;
  }

  async function waitForTransactionConfirmation(
    blockchain: Blockchain,
    txHash: string,
    timeoutMs = 120000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await call<TransactionStatusDto>({
          url: `blockchain/transaction/${txHash}/status`,
          method: 'GET',
          data: { blockchain },
        });

        if (status.status === 'confirmed') {
          return;
        }

        if (status.status === 'failed') {
          throw new TransactionFailedError(txHash, status.error);
        }
      } catch (error: any) {
        // If endpoint doesn't exist (404), skip confirmation check
        if (error?.status === 404 || error?.message?.includes('Not Found')) {
          console.warn('Transaction status endpoint not available, skipping confirmation check');
          return;
        }
        if (error instanceof TransactionFailedError) {
          throw error;
        }
        // Continue polling on other errors
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new TransactionTimeoutError(txHash, timeoutMs);
  }

  return useMemo(() => ({ createSolanaTransaction, createTronTransaction, broadcastTransaction }), [call]);
}
