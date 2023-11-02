import EthClient from '@ledgerhq/hw-app-eth';
import Transport from '@ledgerhq/hw-transport';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import BtcClient, { DefaultDescriptorTemplate, DefaultWalletPolicy } from 'ledger-bitcoin';
import { useMemo } from 'react';
import KeyPath, { BitcoinAddressType } from '../../config/key-path';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';
import { timeout } from '../../util/utils';

interface LedgerError extends Error {
  statusCode: number;
  statusText: string;
}

export type LedgerWallet = WalletType.LEDGER_BTC | WalletType.LEDGER_ETH;

export interface LedgerInterface {
  isSupported: () => Promise<boolean>;
  addressTypes: BitcoinAddressType[];
  defaultAddressType: BitcoinAddressType;
  connect: (wallet: LedgerWallet, addressType: BitcoinAddressType) => Promise<string>;
  fetchAddresses: (
    wallet: LedgerWallet,
    startIndex: number,
    count: number,
    addressType: BitcoinAddressType,
  ) => Promise<string[]>;
  signMessage: (
    msg: string,
    wallet: LedgerWallet,
    addressIndex: number,
    addressType: BitcoinAddressType,
  ) => Promise<string>;
}

export function useLedger(): LedgerInterface {
  const { get, put } = useSettingsContext();

  const transportStorageKey = 'LedgerTransport';
  const btcStorageKey = 'LedgerBtc';
  const ethStorageKey = 'LedgerEth';

  let tmpBtcClient: BtcClient;
  let tmpEthClient: EthClient;

  async function isSupported(): Promise<boolean> {
    return TransportWebHID.isSupported();
  }

  async function connect(wallet: LedgerWallet, addressType: BitcoinAddressType): Promise<string> {
    return wallet === WalletType.LEDGER_BTC ? await connectBtc(addressType) : await connectEth();
  }

  async function connectBtc(addressType: BitcoinAddressType): Promise<string> {
    const client = get<BtcClient>(btcStorageKey) ?? (await setupBtcConnection());

    tmpBtcClient = client;
    put(btcStorageKey, client);

    return fetchAddress(fetchBtcAddress(addressType, 0, 1), () => {
      client.transport.close();
      put(btcStorageKey, undefined);
    }).then((a) => a[0]);
  }

  async function connectEth(): Promise<string> {
    const client = get<EthClient>(ethStorageKey) ?? (await setupEthConnection());

    tmpEthClient = client;
    put(ethStorageKey, client);

    return fetchAddress(fetchEthAddress(0, 1), () => {
      client.transport.close();
      put(ethStorageKey, undefined);
    }).then((a) => a[0]);
  }

  async function fetchAddress(addressFetch: Promise<string[]>, onTimeout: () => void): Promise<string[]> {
    try {
      return await timeout(addressFetch, 10000);
    } catch (e) {
      const { name, message, statusText } = e as LedgerError;

      if (message?.includes('Timeout')) {
        onTimeout();
        throw new TranslatedError('Connection timed out. Please retry.');
      } else if (name === 'LockedDeviceError') {
        throw new TranslatedError('Please unlock your Ledger.');
      } else if (name === 'TransportRaceCondition') {
        throw new TranslatedError('There is already a request pending. Please reload the page and retry.');
      } else if (statusText === 'CLA_NOT_SUPPORTED' || statusText === 'INS_NOT_SUPPORTED') {
        throw new TranslatedError(
          'You are using a wrong or outdated Ledger app. Please install the newest version of the Bitcoin app on your Ledger.',
        );
      } else if (statusText === 'UNKNOWN_ERROR') {
        throw new TranslatedError('Please open the Bitcoin app on your Ledger.');
      }

      throw e;
    }
  }

  async function setupTransport(): Promise<Transport> {
    try {
      const tmpTransport = get<Transport>(transportStorageKey) ?? (await TransportWebHID.create());
      put(transportStorageKey, tmpTransport);

      return tmpTransport;
    } catch (e) {
      const { name } = e as Error;

      if (name === 'TransportOpenUserCancelled') {
        throw new TranslatedError('Please connect your Ledger.');
      }

      throw e;
    }
  }

  async function setupBtcConnection(): Promise<BtcClient> {
    const tmpTransport = await setupTransport();
    return new BtcClient(tmpTransport);
  }

  async function setupEthConnection(): Promise<EthClient> {
    const tmpTransport = await setupTransport();
    return new EthClient(tmpTransport);
  }

  async function fetchBtcAddress(
    addressType: BitcoinAddressType,
    startIndex: number,
    count: number,
  ): Promise<string[]> {
    const client = tmpBtcClient ?? get(btcStorageKey);
    if (!client) throw new Error('Ledger not connected');

    const fpr = await client.getMasterFingerprint();
    const pubKey = await client.getExtendedPubkey(KeyPath.BTC(addressType).xPub);

    const policy = new DefaultWalletPolicy(
      KeyPath.BTC(addressType).addressStandard as DefaultDescriptorTemplate,
      `[${fpr}/${KeyPath.BTC(addressType).root}]${pubKey}`,
    );

    const addresses = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      addresses.push(await client.getWalletAddress(policy, null, 0, i, false));
    }
    return addresses;
  }

  async function fetchEthAddress(startIndex: number, count: number): Promise<string[]> {
    const client = tmpEthClient ?? get(ethStorageKey);
    if (!client) throw new Error('Ledger not connected');

    const addresses = [];
    for (let i = startIndex; i < startIndex + count; i++) {
      addresses.push(await client.getAddress(KeyPath.ETH.address(i), false, false).then((r) => r.address));
    }
    return addresses;
  }

  async function fetchAddresses(
    wallet: LedgerWallet,
    startIndex: number,
    count: number,
    addressType: BitcoinAddressType,
  ): Promise<string[]> {
    try {
      return wallet === WalletType.LEDGER_BTC
        ? await fetchBtcAddress(addressType, startIndex, count)
        : await fetchEthAddress(startIndex, count);
    } catch (e) {
      const { statusText } = e as LedgerError;

      if (statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED') {
        throw new AbortError('User cancelled');
      }

      throw e;
    }
  }

  async function signMessage(
    msg: string,
    wallet: LedgerWallet,
    addressIndex: number,
    addressType: BitcoinAddressType,
  ): Promise<string> {
    try {
      return wallet === WalletType.LEDGER_BTC
        ? await signBtcMessage(msg, addressType, addressIndex)
        : await signEthMessage(msg, addressIndex);
    } catch (e) {
      const { statusText } = e as LedgerError;

      if (statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED') {
        throw new AbortError('User cancelled');
      }

      throw e;
    }
  }

  async function signBtcMessage(msg: string, addressType: BitcoinAddressType, addressIndex: number): Promise<string> {
    const client = tmpBtcClient ?? get(btcStorageKey);
    if (!client) throw new Error('Ledger not connected');
    return client.signMessage(Buffer.from(msg), KeyPath.BTC(addressType).address(addressIndex));
  }

  async function signEthMessage(msg: string, addressIndex: number): Promise<string> {
    const client = tmpEthClient ?? get(ethStorageKey);
    if (!client) throw new Error('Ledger not connected');

    const signature = await client.signPersonalMessage(
      KeyPath.ETH.address(addressIndex),
      Buffer.from(msg).toString('hex'),
    );
    return '0x' + signature.r + signature.s + signature.v.toString(16);
  }

  return useMemo(
    () => ({
      isSupported,
      addressTypes: [BitcoinAddressType.NATIVE_SEGWIT, BitcoinAddressType.SEGWIT, BitcoinAddressType.LEGACY],
      defaultAddressType: BitcoinAddressType.NATIVE_SEGWIT,
      connect,
      fetchAddresses,
      signMessage,
    }),
    [],
  );
}
