import TrezorConnect from '@trezor/connect-web';
import { useMemo, useState } from 'react';
import KeyPath, { BitcoinAddressType } from '../../config/key-path';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';

export type TrezorWallet = WalletType.TREZOR_BTC | WalletType.TREZOR_ETH;

export interface TrezorInterface {
  isSupported: () => Promise<boolean>;
  addressTypes: BitcoinAddressType[];
  defaultAddressType: BitcoinAddressType;
  connect: (wallet: TrezorWallet, addressType: BitcoinAddressType) => Promise<string>;
  fetchAddresses: (
    wallet: TrezorWallet,
    startIndex: number,
    count: number,
    accountIndex: number,
    addressType: BitcoinAddressType,
  ) => Promise<string[]>;
  signMessage: (
    msg: string,
    wallet: TrezorWallet,
    addressIndex: number,
    accountIndex: number,
    addressType: BitcoinAddressType,
  ) => Promise<string>;
}

export function useTrezor(): TrezorInterface {
  const storageKey = 'TrezorInitialized';
  const { get, put } = useSettingsContext();

  const [isInitialized, setIsInitialized] = useState<boolean | undefined>(get(storageKey));

  async function init(): Promise<boolean> {
    return TrezorConnect.init({
      popup: true,
      debug: false,
      lazyLoad: false,
      manifest: {
        email: 'support@dfx.swiss',
        appUrl: window.location.origin,
      },
      transports: ['WebUsbTransport'],
    })
      .then(() => initialized(true))
      .catch(() => initialized(false));
  }

  function initialized(supported: boolean): boolean {
    put(storageKey, supported);
    setIsInitialized(supported);

    return supported;
  }

  async function isSupported(): Promise<boolean> {
    if (isInitialized != null) return isInitialized;

    return init();
  }

  async function connect(wallet: TrezorWallet, addressType: BitcoinAddressType): Promise<string> {
    const result =
      wallet === WalletType.TREZOR_BTC
        ? await TrezorConnect.getAddress({
            path: KeyPath.BTC(0, addressType).address(0),
            showOnTrezor: false,
          })
        : await TrezorConnect.ethereumGetAddress({ path: KeyPath.ETH(0).address(0), showOnTrezor: false });

    if (result.success) {
      return result.payload.address;
    }

    handlePayloadError('Trezor not connected', result.payload.error);
  }

  async function fetchAddresses(
    wallet: TrezorWallet,
    accountIndex: number,
    startIndex: number,
    count: number,
    addressType: BitcoinAddressType,
  ): Promise<string[]> {
    const addressBundle = [];

    for (let i = startIndex; i < startIndex + count; i++) {
      addressBundle.push({
        path:
          wallet === WalletType.TREZOR_BTC
            ? KeyPath.BTC(accountIndex, addressType).address(i)
            : KeyPath.ETH(accountIndex).address(i),
        showOnTrezor: false,
      });
    }

    const result =
      wallet === WalletType.TREZOR_BTC
        ? await TrezorConnect.getAddress({ bundle: addressBundle })
        : await TrezorConnect.ethereumGetAddress({ bundle: addressBundle });

    if (result.success) {
      return result.payload.map((p) => p.address);
    }

    handlePayloadError('Trezor not connected', result.payload.error);
  }

  async function signMessage(
    msg: string,
    wallet: TrezorWallet,
    accountIndex: number,
    addressIndex: number,
    addressType: BitcoinAddressType,
  ): Promise<string> {
    const result =
      wallet === WalletType.TREZOR_BTC
        ? await TrezorConnect.signMessage({
            path: KeyPath.BTC(accountIndex, addressType).address(addressIndex),
            message: msg,
            coin: 'btc',
          })
        : await TrezorConnect.ethereumSignMessage({
            path: KeyPath.ETH(accountIndex).address(addressIndex),
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

  return useMemo(
    () => ({
      isSupported,
      connect,
      addressTypes: [BitcoinAddressType.NATIVE_SEGWIT, BitcoinAddressType.SEGWIT, BitcoinAddressType.LEGACY],
      defaultAddressType: BitcoinAddressType.NATIVE_SEGWIT,
      signMessage,
      fetchAddresses,
    }),
    [],
  );
}
