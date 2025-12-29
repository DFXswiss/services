import { Asset, Blockchain } from '@dfx.swiss/react';
import * as Solana from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useBlockchainTransaction } from './blockchain-transaction.hook';

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
    return broadcastTransaction(Blockchain.SOLANA, serialized);
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
