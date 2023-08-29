import TrezorConnect from '@trezor/connect-web';
import { useEffect, useState } from 'react';

export interface TrezorInterface {
  connect: () => Promise<string>;
  signMessage: (msg: string) => Promise<string>;
  isSupported: () => boolean;
}

export function useTrezor(): TrezorInterface {
  const derivationPath = "m/84'/0'/0'/0/0";

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

  async function connect(): Promise<string> {
    const result = await TrezorConnect.getAddress({ path: derivationPath, showOnTrezor: false });

    if (result.success) {
      return result.payload.address;
    }

    throw new Error('Trezor not connected');
  }

  async function signMessage(message: string): Promise<string> {
    const result = await TrezorConnect.signMessage({
      path: derivationPath,
      message: message,
      coin: 'btc',
    });

    if (result.success) {
      return result.payload.signature;
    }

    throw new Error(`Cannot sign message: ${result.payload.error}`);
  }

  function isSupported(): boolean {
    return isInitialized;
  }

  return {
    connect,
    signMessage,
    isSupported,
  };
}
