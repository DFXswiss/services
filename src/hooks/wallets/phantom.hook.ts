import { Asset, AssetType } from '@dfx.swiss/react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import BigNumber from 'bignumber.js';
import { encodeBase58 } from 'ethers';
import { useMemo } from 'react';
import { useSolana } from '../solana.hook';

export interface PhantomInterface {
  isInstalled: () => boolean;
  connect: () => Promise<string>;
  signMessage: (address: string, message: string) => Promise<string>;
  createTransaction: (amount: BigNumber, asset: Asset, from: string, to: string) => Promise<string>;
}

export function usePhantom(): PhantomInterface {
  const { createCoinTransaction, createTokenTransaction, broadcastTransaction } = useSolana();

  const wallet = useMemo(() => new PhantomWalletAdapter(), []);

  function getProvider() {
    return wallet;
  }

  function isInstalled(): boolean {
    return (window as any).phantom?.solana.isPhantom;
  }

  async function connect(): Promise<string> {
    const provider = getProvider();

    try {
      await provider.connect();
      if (provider.publicKey) return provider.publicKey.toBase58();
      throw new Error('No public key found');
    } catch (error) {
      handleError(error);
    }
  }

  async function signMessage(_address: string, message: string): Promise<string> {
    const provider = getProvider();

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await provider.signMessage(encodedMessage);
      return encodeBase58(signature);
    } catch (error) {
      handleError(error);
    }
  }

  async function createTransaction(amount: BigNumber, asset: Asset, from: string, to: string): Promise<string> {
    const provider = getProvider();

    try {
      const transaction =
        asset.type === AssetType.COIN
          ? await createCoinTransaction(from, to, amount)
          : await createTokenTransaction(from, to, asset, amount);

      const signedTransaction = await provider.signTransaction(transaction);
      return await broadcastTransaction(signedTransaction);
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(error: unknown): never {
    throw new Error((error as Error).message || 'An unexpected error occurred.');
  }

  return useMemo(
    () => ({
      isInstalled,
      connect,
      signMessage,
      createTransaction,
    }),
    [],
  );
}
