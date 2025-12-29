import { Asset, Blockchain } from '@dfx.swiss/react';
import { Transaction, SignedTransaction } from '@tronweb3/tronwallet-abstract-adapter';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useBlockchainTransaction } from './blockchain-transaction.hook';

export interface TronInterface {
  createCoinTransaction(fromAddress: string, toAddress: string, amount: BigNumber): Promise<Transaction>;
  createTokenTransaction(fromAddress: string, toAddress: string, token: Asset, amount: BigNumber): Promise<Transaction>;
  broadcastTransaction(signedTransaction: SignedTransaction): Promise<string>;
}

export function useTron(): TronInterface {
  const { createTronTransaction, broadcastTransaction } = useBlockchainTransaction();

  async function createCoinTransaction(
    fromAddress: string,
    toAddress: string,
    amount: BigNumber,
  ): Promise<Transaction> {
    return createTronTransaction(fromAddress, toAddress, amount.toNumber()) as Promise<Transaction>;
  }

  async function createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<Transaction> {
    return createTronTransaction(fromAddress, toAddress, amount.toNumber(), token) as Promise<Transaction>;
  }

  async function broadcastSignedTransaction(signedTransaction: SignedTransaction): Promise<string> {
    const serialized = JSON.stringify(signedTransaction);
    return broadcastTransaction(Blockchain.TRON, serialized);
  }

  return useMemo(
    () => ({
      createCoinTransaction,
      createTokenTransaction,
      broadcastTransaction: broadcastSignedTransaction,
    }),
    [createTronTransaction, broadcastTransaction],
  );
}
