import { Asset, Blockchain, useApi } from '@dfx.swiss/react';
import * as Solana from '@solana/web3.js';
import { useMemo } from 'react';

interface UnsignedTransactionDto {
  rawTransaction: string;
  encoding: 'base64' | 'hex';
  recentBlockhash?: string;
  expiration?: number;
}

interface BroadcastResultDto {
  txHash: string;
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

    return response.txHash;
  }

  return useMemo(() => ({ createSolanaTransaction, createTronTransaction, broadcastTransaction }), [call]);
}
