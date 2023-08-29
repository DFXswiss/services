import TrezorConnect from '@trezor/connect-web';
import { useEffect, useState } from 'react';
import KeyPath from '../../config/key-path';
import { WalletType } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';

type TrezorWallet = WalletType.TREZOR_BTC | WalletType.TREZOR_ETH;

export interface TrezorInterface {
  isSupported: () => boolean;
  connect: (wallet: TrezorWallet) => Promise<string>;
  signMessage: (msg: string, wallet: TrezorWallet) => Promise<string>;
}

export function useTrezor(): TrezorInterface {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (!isInitialized) init();
  }, [isInitialized]);

  async function init() {
    await TrezorConnect.init({
      popup: true,
      debug: false,
      lazyLoad: false,
      manifest: {
        email: 'support@dfx.swiss',
        appUrl: window.location.origin,
      },
      transports: ['WebUsbTransport'],
    })
      .then(() => {
        setIsInitialized(true);
      })
      .catch(() => {
        setIsInitialized(false);
      });
  }

  function isSupported(): boolean {
    return isInitialized;
  }

  async function connect(wallet: TrezorWallet): Promise<string> {
    const result =
      wallet === WalletType.TREZOR_BTC
        ? await TrezorConnect.getAddress({ path: KeyPath.BTC.address, showOnTrezor: false })
        : await TrezorConnect.ethereumGetAddress({ path: KeyPath.ETH.address, showOnTrezor: false });

    if (result.success) {
      return result.payload.address;
    }

    handlePayloadError('Trezor not connected', result.payload.error);
  }

  async function signMessage(msg: string, wallet: TrezorWallet): Promise<string> {
    const result =
      wallet === WalletType.TREZOR_BTC
        ? await TrezorConnect.signMessage({ path: KeyPath.BTC.address, message: msg, coin: 'btc' })
        : await TrezorConnect.ethereumSignMessage({ path: KeyPath.ETH.address, message: msg });

    if (result.success) {
      return result.payload.signature;
    }

    handlePayloadError('Cannot sign message', result.payload.error);
  }

  function handlePayloadError(message: string, payloadError: string): never {
    if (payloadError === 'Permissions not granted' || payloadError.toLowerCase().includes('cancel')) {
      throw new AbortError('User cancelled');
    }

    throw new Error(`${message}: ${payloadError}`);
  }

  return {
    isSupported,
    connect,
    signMessage,
  };
}
