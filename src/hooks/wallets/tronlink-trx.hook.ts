import { Asset, AssetType } from '@dfx.swiss/react';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapter-tronlink';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useTron } from '../tron.hook';

export interface TronLinkInterface {
  isInstalled: () => boolean;
  connect: () => Promise<string>;
  signMessage: (address: string, message: string) => Promise<string>;
  createTransaction: (amount: BigNumber, asset: Asset, from: string, to: string) => Promise<string>;
}

export function useTronLinkTrx(): TronLinkInterface {
  const { createCoinTransaction, createTokenTransaction, broadcastTransaction } = useTron();

  const wallet = useMemo(() => new TronLinkAdapter(), []);

  function getProvider() {
    return wallet;
  }

  function isInstalled(): boolean {
    return Boolean((window as any).tronLink);
  }

  async function connect(): Promise<string> {
    const provider = getProvider();

    try {
      await provider.connect();
      if (provider.address) return provider.address;
      throw new Error('No address found');
    } catch (error) {
      handleError(error);
    }
  }

  async function signMessage(address: string, message: string): Promise<string> {
    const provider = getProvider();

    try {
      const signedMessage = await provider.signMessage(message);
      return signedMessage;
    } catch (error) {
      handleError(error);
    }
  }

  async function createTransaction(amount: BigNumber, asset: Asset, from: string, to: string): Promise<string> {
    const provider = getProvider();

    try {
      const unsignedTransaction =
        asset.type === AssetType.COIN
          ? await createCoinTransaction(from, to, amount)
          : await createTokenTransaction(from, to, asset, amount);

      const signedTransaction = await provider.signTransaction(unsignedTransaction);

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
