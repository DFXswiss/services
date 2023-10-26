import { BitBox02API, constants, getDevicePath, getKeypathFromString } from 'bitbox02-api';
import { useMemo } from 'react';
import KeyPath, { BitcoinAddressType } from '../../config/key-path';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';

interface BitboxError extends Error {
  ErrorType: string;
  Code: number;
  Message: string;
}

export type BitboxWallet = WalletType.BITBOX_BTC | WalletType.BITBOX_ETH;

export interface BitboxInterface {
  isSupported: () => Promise<boolean>;
  connect: (wallet: BitboxWallet, onPairing: (code: string) => Promise<void>) => Promise<string>;
  signMessage: (msg: string, wallet: BitboxWallet) => Promise<string>;
}

export function useBitbox(): BitboxInterface {
  const coinBtc = constants.messages.BTCCoin.BTC;
  const addressTypeBtc = constants.messages.BTCScriptConfig_SimpleType.P2WPKH;
  const storageKey = 'BitBoxClient';
  const { get, put } = useSettingsContext();

  let tmpClient: BitBox02API;

  async function isSupported(): Promise<boolean> {
    try {
      const devicePath = await getDevicePath();
      return devicePath === 'WEBHID';
    } catch {
      return false;
    }
  }

  async function connect(wallet: BitboxWallet, onPairing: (code: string) => Promise<void>): Promise<string> {
    const bitBox = get<BitBox02API>(storageKey) ?? new BitBox02API('WEBHID');

    tmpClient = bitBox;
    put<BitBox02API>(storageKey, bitBox);

    let attestation = false;

    let pairingConfirmed: () => void;
    let pairingRejected: (e: Error) => void;
    let onCancel: (e: Error) => void;

    function cancel(e: Error) {
      bitBox.close();
      onCancel(e);
    }

    function showPairing(code: string): Promise<void> {
      return onPairing(code)
        .then(() => (pairingConfirmed ? pairingConfirmed() : showPairing(code)))
        .catch((e) => (pairingRejected ? pairingRejected(e) : cancel(e)));
    }

    function verifyUser(): Promise<void> {
      return new Promise((res, rej) => {
        pairingConfirmed = res;
        pairingRejected = rej;
      });
    }

    try {
      if (!bitBox.connectionValid()) {
        const abort = new Promise((_, rej) => (onCancel = rej));
        const connect = bitBox.connect(
          showPairing,
          verifyUser,
          (attestationResult) => (attestation = attestationResult),
          () => undefined,
          () => undefined,
        );

        await Promise.race([connect, abort]);

        if (!attestation) throw new Error('Attestation failed.');
      }

      // verify product
      const product = bitBox.firmware().Product();
      if (wallet !== WalletType.BITBOX_BTC && product === constants.Product.BitBox02BTCOnly)
        throw new TranslatedError('Your BitBox only supports Bitcoin');

      // fetch address
      return wallet === WalletType.BITBOX_BTC ? await getBtcAddress(bitBox) : await getEthAddress(bitBox);
    } catch (e) {
      bitBox.close();

      const { message, Message } = e as BitboxError;
      const msg = message ?? Message;

      if (msg.includes('User cancelled')) {
        throw new AbortError(msg);
      } else if (msg.includes('Could not establish a connection')) {
        throw new TranslatedError('Please connect your BitBox.');
      } else if (msg.includes('The device is already open')) {
        throw new TranslatedError('There is already an open connection, please reload the page and retry.');
      } else if (msg.includes('Pairing rejected')) {
        throw new TranslatedError('Please accept the pairing code.');
      }

      throw new Error(msg);
    }
  }

  async function getBtcAddress(bitBox: BitBox02API): Promise<string> {
    const keyPath = getKeypathFromString(KeyPath.BTC(BitcoinAddressType.NATIVE_SEGWIT).address(0));
    return bitBox.btcDisplayAddressSimple(coinBtc, keyPath, addressTypeBtc, false);
  }

  async function getEthAddress(bitBox: BitBox02API): Promise<string> {
    return bitBox.ethDisplayAddress(KeyPath.ETH.address(0), false);
  }

  async function signMessage(msg: string, wallet: BitboxWallet): Promise<string> {
    const bitBox = tmpClient ?? get<BitBox02API>(storageKey);
    if (!bitBox) throw new Error('Bitbox not connected');

    try {
      return wallet === WalletType.BITBOX_BTC ? await signBtcMessage(bitBox, msg) : await signEthMessage(bitBox, msg);
    } catch (e) {
      bitBox.close();

      const { message, Message } = e as BitboxError;
      const msg = message ?? Message;

      if (msg.includes('aborted by the user') || msg.includes('User abort')) {
        throw new AbortError('User cancelled');
      }

      throw new Error(msg);
    }
  }

  async function signBtcMessage(bitBox: BitBox02API, msg: string): Promise<string> {
    const keyPath = getKeypathFromString(KeyPath.BTC(BitcoinAddressType.NATIVE_SEGWIT).address(0));
    const { electrumSignature } = await bitBox.btcSignMessage(coinBtc, addressTypeBtc, keyPath, Buffer.from(msg));
    return Buffer.from(electrumSignature).toString('base64');
  }

  async function signEthMessage(bitBox: BitBox02API, msg: string): Promise<string> {
    const { r, s, v } = await bitBox.ethSignMessage({
      keypath: KeyPath.ETH.address(0),
      message: Buffer.from(msg),
    });
    return `0x${Buffer.from([...Array.from(r), ...Array.from(s), ...Array.from(v)]).toString('hex')}`;
  }

  return useMemo(() => ({ isSupported, connect, signMessage }), []);
}
