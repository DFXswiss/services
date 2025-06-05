import { Asset, AssetType } from '@dfx.swiss/react';
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
  const { createCoinTransaction, createTokenTransaction } = useSolana();

  function getProvider() {
    return (window as any).phantom?.solana;
  }

  function isInstalled(): boolean {
    const provider = getProvider();
    return Boolean(provider?.isPhantom);
  }

  async function connect(): Promise<string> {
    const provider = getProvider();

    try {
      const resp = await provider.connect();
      return resp.publicKey.toString();
    } catch (error) {
      handleError(error);
    }
  }

  async function signMessage(_address: string, message: string): Promise<string> {
    const provider = getProvider();

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
      return encodeBase58(signedMessage.signature);
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

      const { signature } = await provider.signAndSendTransaction(transaction).catch((e: unknown) => handleError(e));
      return signature;
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(error: unknown): never {
    console.log(error);
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
