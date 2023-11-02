import { Blockchain } from '@dfx.swiss/react';
import { PairedBitBox, bitbox02ConnectWebHID } from 'bitbox-api';
import { hasWebHID } from 'bitbox-api/webhid';
import { useMemo } from 'react';
import KeyPath, { BitcoinAddressType } from '../../config/key-path';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';
import { useBlockchain } from '../blockchain.hook';

interface BitboxError {
  code: string;
  message: string;
}

type BtcSimpleType = 'p2tr' | 'p2wpkh' | 'p2wpkhP2sh';

export type BitboxWallet = WalletType.BITBOX_BTC | WalletType.BITBOX_ETH;

export interface BitboxInterface {
  isSupported: () => Promise<boolean>;
  addressTypes: BitcoinAddressType[];
  defaultAddressType: BitcoinAddressType;
  connect: (
    wallet: BitboxWallet,
    blockchain: Blockchain,
    bitcoinAddressType: BitcoinAddressType,
    onPairing: (code: string) => void,
  ) => Promise<string>;
  fetchAddresses: (
    wallet: BitboxWallet,
    blockchain: Blockchain,
    bitcoinAddressType: BitcoinAddressType,
    startIndex: number,
    count: number,
  ) => Promise<string[]>;
  signMessage: (
    msg: string,
    wallet: BitboxWallet,
    blockchain: Blockchain,
    bitcoinAddressType: BitcoinAddressType,
    addressIndex: number,
  ) => Promise<string>;
}

export function useBitbox(): BitboxInterface {
  const storageKey = 'BitBoxClient';
  const { get, put } = useSettingsContext();
  const { toChainId } = useBlockchain();

  let tmpClient: PairedBitBox;

  async function isSupported(): Promise<boolean> {
    return hasWebHID();
  }

  async function connect(
    wallet: BitboxWallet,
    blockchain: Blockchain,
    bitcoinAddressType: BitcoinAddressType,
    onPairing: (code: string) => void,
  ): Promise<string> {
    let bitBox: PairedBitBox | undefined = tmpClient ?? get<PairedBitBox>(storageKey);

    try {
      if (!bitBox) {
        const unpaired = await bitbox02ConnectWebHID(undefined);
        const pairing = await unpaired.unlockAndPair();

        const pairingCode = pairing.getPairingCode();
        if (pairingCode) onPairing(pairingCode);

        bitBox = await pairing.waitConfirm();

        tmpClient = bitBox;
        put<PairedBitBox>(storageKey, bitBox);
      }

      // verify product
      if (wallet !== WalletType.BITBOX_BTC && !bitBox.ethSupported())
        throw new TranslatedError('Your BitBox only supports Bitcoin');

      // fetch address
      return wallet === WalletType.BITBOX_BTC
        ? (await getBtcAddress(bitcoinAddressType, 0, 1))[0]
        : (await getEthAddress(blockchain, 0, 1))[0];
    } catch (e) {
      const { code, message } = e as BitboxError;
      if (code && message) {
        if (message.includes('User cancelled')) {
          throw new AbortError(message);
        } else if (code.includes('user-abort')) {
          throw new TranslatedError('Please connect your BitBox.');
        } else if (code.includes('could-not-open')) {
          throw new TranslatedError('There is already an open connection, please reload the page and retry.');
        } else if (code.includes('pairing-rejected')) {
          throw new TranslatedError('Please accept the pairing code.');
        }
      }

      throw e;
    }
  }

  async function fetchAddresses(
    wallet: BitboxWallet,
    blockchain: Blockchain,
    bitcoinAddressType: BitcoinAddressType,
    startIndex: number,
    count: number,
  ): Promise<string[]> {
    try {
      return wallet === WalletType.BITBOX_BTC
        ? await getBtcAddress(bitcoinAddressType, startIndex, count)
        : await getEthAddress(blockchain, startIndex, count);
    } catch (e) {
      throw e;
    }
  }

  async function getBtcAddress(
    bitcoinAddressType: BitcoinAddressType,
    startIndex: number,
    count: number,
  ): Promise<string[]> {
    const bitBox = tmpClient ?? get<PairedBitBox>(storageKey);
    if (!bitBox) throw new Error('Bitbox not connected');

    const addresses = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      addresses.push(
        await bitBox.btcAddress(
          'btc',
          KeyPath.BTC(bitcoinAddressType).address(i),
          { simpleType: KeyPath.BTC(bitcoinAddressType).simpleType as BtcSimpleType },
          false,
        ),
      );
    }
    return addresses;
  }

  async function getEthAddress(blockchain: Blockchain, startIndex: number, count: number): Promise<string[]> {
    const bitBox = tmpClient ?? get<PairedBitBox>(storageKey);
    if (!bitBox) throw new Error('Bitbox not connected');

    const chainId = toChainId(blockchain);
    if (!chainId) throw new Error('Invalid blockchain');

    const addresses = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      addresses.push(await bitBox.ethAddress(BigInt(chainId), KeyPath.ETH.address(i), false));
    }
    return addresses;
  }

  async function signMessage(
    msg: string,
    wallet: BitboxWallet,
    blockchain: Blockchain,
    bitcoinAddressType: BitcoinAddressType,
    addressIndex: number,
  ): Promise<string> {
    const bitBox = tmpClient ?? get<PairedBitBox>(storageKey);
    if (!bitBox) throw new Error('Bitbox not connected');

    try {
      return wallet === WalletType.BITBOX_BTC
        ? await signBtcMessage(bitBox, msg, bitcoinAddressType, addressIndex)
        : await signEthMessage(bitBox, msg, blockchain, addressIndex);
    } catch (e) {
      const { code, message } = e as BitboxError;
      if (code && message) {
        if (code.includes('bitbox-user-abort')) {
          throw new AbortError(message);
        }
      }

      throw new Error(message);
    }
  }

  async function signBtcMessage(
    bitBox: PairedBitBox,
    msg: string,
    bitcoinAddressType: BitcoinAddressType,
    addressIndex: number,
  ): Promise<string> {
    const { electrumSig65 } = await bitBox.btcSignMessage(
      'btc',
      {
        keypath: KeyPath.BTC(bitcoinAddressType).address(addressIndex),
        scriptConfig: { simpleType: KeyPath.BTC(bitcoinAddressType).simpleType as BtcSimpleType },
      },
      Buffer.from(msg),
    );

    return Buffer.from(electrumSig65).toString('base64');
  }

  async function signEthMessage(
    bitBox: PairedBitBox,
    msg: string,
    blockchain: Blockchain,
    addressIndex: number,
  ): Promise<string> {
    const chainId = toChainId(blockchain);
    if (!chainId) throw new Error('Invalid blockchain');

    const { r, s, v } = await bitBox.ethSignMessage(
      BigInt(chainId),
      KeyPath.ETH.address(addressIndex),
      Buffer.from(msg),
    );
    return `0x${Buffer.from([...Array.from(r), ...Array.from(s), ...Array.from(v)]).toString('hex')}`;
  }

  return useMemo(
    () => ({
      isSupported,
      addressTypes: [BitcoinAddressType.NATIVE_SEGWIT, BitcoinAddressType.SEGWIT],
      defaultAddressType: BitcoinAddressType.NATIVE_SEGWIT,
      connect,
      signMessage,
      fetchAddresses,
    }),
    [],
  );
}
