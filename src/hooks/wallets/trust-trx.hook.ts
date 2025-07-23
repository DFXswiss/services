import { Asset, AssetType } from '@dfx.swiss/react';
import { TrustAdapter } from '@tronweb3/tronwallet-adapter-trust';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useTron } from '../tron.hook';

export interface TrustInterface {
  isInstalled: () => boolean;
  connect: () => Promise<string>;
  signMessage: (address: string, message: string) => Promise<string>;
  createTransaction: (amount: BigNumber, asset: Asset, from: string, to: string) => Promise<string>;
}

export function useTrustTrx(): TrustInterface {
  const { createCoinTransaction, createTokenTransaction } = useTron();

  const wallet = useMemo(() => new TrustAdapter(), []);

  function getProvider() {
    return wallet;
  }

  function isInstalled(): boolean {
    return (window as any).ethereum?.isTrustWallet;
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
    const tronWeb = (window as any).trustwallet.tronLink.tronWeb;

    try {
      const unsignedTransaction =
        asset.type === AssetType.COIN
          ? await createCoinTransaction(from, to, amount)
          : await createTokenTransaction(from, to, asset, amount);

      const signedTransaction = await provider.signTransaction(unsignedTransaction);

      return await tronWeb.trx.sendRawTransaction(signedTransaction);
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
