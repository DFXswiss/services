import { Asset, Blockchain } from '@dfx.swiss/react';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useBlockchainTransaction } from './blockchain-transaction.hook';

export interface TronInterface {
  createCoinTransaction(fromAddress: string, toAddress: string, amount: BigNumber): Promise<object>;
  createTokenTransaction(fromAddress: string, toAddress: string, token: Asset, amount: BigNumber): Promise<object>;
  broadcastTransaction(signedTransaction: object): Promise<string>;
}

export function useTron(): TronInterface {
  const { createTronTransaction, broadcastTransaction } = useBlockchainTransaction();

  async function createCoinTransaction(
    fromAddress: string,
    toAddress: string,
    amount: BigNumber,
  ): Promise<object> {
    return createTronTransaction(fromAddress, toAddress, amount.toNumber());
  }

  async function createTokenTransaction(
    fromAddress: string,
    toAddress: string,
    token: Asset,
    amount: BigNumber,
  ): Promise<object> {
    return createTronTransaction(fromAddress, toAddress, amount.toNumber(), token);
  }

  async function broadcastSignedTransaction(signedTransaction: object): Promise<string> {
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
