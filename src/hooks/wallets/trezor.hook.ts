import { Blockchain } from '@dfx.swiss/react';
import TrezorConnect from '@trezor/connect-web';
import { useEffect, useState } from 'react';
import { AbortError } from '../../util/abort-error';

export interface TrezorInterface {
  connect: (blockchain: Blockchain) => Promise<string>;
  signMessage: (msg: string, blockchain: Blockchain) => Promise<string>;
  isSupported: () => boolean;
}

export function useTrezor(): TrezorInterface {
  const derivationPathBtc = "m/84'/0'/0'/0/0";
  const derivationPathEth = "m/44'/60'/0'/0/0";

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

  async function connect(blockchain: Blockchain): Promise<string> {
    return blockchain === Blockchain.BITCOIN ? connectBtc() : connectEth();
  }

  async function connectBtc(): Promise<string> {
    const result = await TrezorConnect.getAddress({ path: derivationPathBtc, showOnTrezor: false });

    if (result.success) {
      return result.payload.address;
    }

    handlePayloadError('Trezor not connected', result.payload.error);
  }

  async function connectEth(): Promise<string> {
    const result = await TrezorConnect.ethereumGetAddress({ path: derivationPathEth, showOnTrezor: false });

    if (result.success) {
      return result.payload.address;
    }

    handlePayloadError('Trezor not connected', result.payload.error);
  }

  async function signMessage(msg: string, blockchain: Blockchain): Promise<string> {
    return blockchain == Blockchain.BITCOIN ? signBtcMessage(msg) : signEthMessage(msg);
  }

  async function signBtcMessage(msg: string): Promise<string> {
    const result = await TrezorConnect.signMessage({
      path: derivationPathBtc,
      message: msg,
      coin: 'btc',
    });

    if (result.success) {
      return result.payload.signature;
    }

    handlePayloadError('Cannot sign message', result.payload.error);
  }

  async function signEthMessage(msg: string): Promise<string> {
    const result = await TrezorConnect.ethereumSignMessage({
      path: derivationPathEth,
      message: msg,
    });

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
    connect,
    signMessage,
    isSupported,
  };
}
