import { Asset, Blockchain } from '@dfx.swiss/react';
import * as Solana from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { TransactionFailedError, TransactionTimeoutError } from '../util/transaction-confirmation';
import { TranslatedError } from '../util/translated-error';
import { useBlockchainTransaction } from './blockchain-transaction.hook';

// Solana RPC endpoints for transaction confirmation
const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
];

export interface SolanaInterface {
  createCoinTransaction(fromAddress: string, toAddress: string, amount: BigNumber): Promise<Solana.Transaction>;
  createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<Solana.Transaction>;
  broadcastTransaction(signedTransaction: Solana.Transaction): Promise<string>;
}

export function useSolana(): SolanaInterface {
  const { createSolanaTransaction, broadcastTransaction } = useBlockchainTransaction();

  async function createCoinTransaction(
    fromAddress: string,
    toAddress: string,
    amount: BigNumber,
  ): Promise<Solana.Transaction> {
    return createSolanaTransaction(fromAddress, toAddress, amount.toNumber());
  }

  async function createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<Solana.Transaction> {
    return createSolanaTransaction(fromAddress, toAddress, amount.toNumber(), token);
  }

  async function broadcastSignedTransaction(signedTransaction: Solana.Transaction): Promise<string> {
    const serialized = signedTransaction.serialize().toString('base64');
    const txHash = await broadcastTransaction(Blockchain.SOLANA, serialized);

    // Additionally verify transaction confirmation directly via Solana RPC
    try {
      await waitForSolanaConfirmation(txHash);
    } catch (error) {
      if (error instanceof TransactionFailedError) {
        throw new TranslatedError('Transaction failed on the blockchain. Please try again.');
      }
      if (error instanceof TransactionTimeoutError) {
        console.warn(`Solana transaction confirmation timed out for ${txHash}, but transaction was sent`);
      }
      // Don't throw other errors - the backend confirmation might have succeeded
    }

    return txHash;
  }

  async function waitForSolanaConfirmation(signature: string, timeoutMs = 60000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000;

    // Try to create a connection to Solana RPC
    let connection: Solana.Connection | null = null;
    for (const endpoint of SOLANA_RPC_ENDPOINTS) {
      try {
        connection = new Solana.Connection(endpoint, 'confirmed');
        break;
      } catch {
        continue;
      }
    }

    if (!connection) {
      console.warn('Could not connect to Solana RPC, skipping direct confirmation check');
      return;
    }

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await connection.getSignatureStatus(signature);

        if (status?.value) {
          if (status.value.err) {
            throw new TransactionFailedError(signature, JSON.stringify(status.value.err));
          }

          if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
            return;
          }
        }
      } catch (error) {
        if (error instanceof TransactionFailedError) {
          throw error;
        }
        // Continue polling on other errors
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new TransactionTimeoutError(signature, timeoutMs);
  }

  return useMemo(
    () => ({
      createCoinTransaction,
      createTokenTransaction,
      broadcastTransaction: broadcastSignedTransaction,
    }),
    [createSolanaTransaction, broadcastTransaction],
  );
}
