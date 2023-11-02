import { Blockchain } from '@dfx.swiss/react';
import { PairedBitBox, bitbox02ConnectWebHID } from 'bitbox-api';
import { hasWebHID } from 'bitbox-api/webhid';
import { useMemo } from 'react';
import KeyPath from '../../config/key-path';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';
import { useBlockchain } from '../blockchain.hook';

interface BitboxError {
  code: string;
  message: string;
}

export type BitboxWallet = WalletType.BITBOX_BTC | WalletType.BITBOX_ETH;

export interface BitboxInterface {
  isSupported: () => Promise<boolean>;
  connect: (wallet: BitboxWallet, blockchain: Blockchain, onPairing: (code: string) => void) => Promise<string>;
  signMessage: (wallet: BitboxWallet, blockchain: Blockchain, msg: string) => Promise<string>;
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
      return wallet === WalletType.BITBOX_BTC ? await getBtcAddress(bitBox) : await getEthAddress(bitBox, blockchain);
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

  async function getBtcAddress(bitBox: PairedBitBox): Promise<string> {
    return bitBox.btcAddress('btc', KeyPath.BTC.address, { simpleType: 'p2wpkh' }, false);
  }

  async function getEthAddress(bitBox: PairedBitBox, blockchain: Blockchain): Promise<string> {
    const chainId = toChainId(blockchain);
    if (!chainId) throw new Error('Invalid blockchain');

    return bitBox.ethAddress(BigInt(chainId), KeyPath.ETH.address, false);
  }

  async function signMessage(wallet: BitboxWallet, blockchain: Blockchain, msg: string): Promise<string> {
    const bitBox = tmpClient ?? get<PairedBitBox>(storageKey);
    if (!bitBox) throw new Error('Bitbox not connected');

    try {
      return wallet === WalletType.BITBOX_BTC
        ? await signBtcMessage(bitBox, msg)
        : await signEthMessage(bitBox, blockchain, msg);
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

  async function signBtcMessage(bitBox: PairedBitBox, msg: string): Promise<string> {
    const { electrumSig65 } = await bitBox.btcSignMessage(
      'btc',
      { keypath: KeyPath.BTC.address, scriptConfig: { simpleType: 'p2wpkh' } },
      Buffer.from(msg),
    );

    return Buffer.from(electrumSig65).toString('base64');
  }

  async function signEthMessage(bitBox: PairedBitBox, blockchain: Blockchain, msg: string): Promise<string> {
    const chainId = toChainId(blockchain);
    if (!chainId) throw new Error('Invalid blockchain');

    const { r, s, v } = await bitBox.ethSignMessage(BigInt(chainId), KeyPath.ETH.address, Buffer.from(msg));
    return `0x${Buffer.from([...Array.from(r), ...Array.from(s), ...Array.from(v)]).toString('hex')}`;
  }

  return useMemo(() => ({ isSupported, connect, signMessage }), []);
}
