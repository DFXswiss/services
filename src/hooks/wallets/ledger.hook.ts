import { Blockchain } from '@dfx.swiss/react';
import Transport from '@ledgerhq/hw-transport';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';
import { useState } from 'react';
import { AbortError } from '../../util/abort-error';
import Eth from '../../util/hw-app-eth';
import { TranslatedError } from '../../util/translated-error';
import { timeout } from '../../util/utils';

interface LedgerError extends Error {
  statusCode: number;
  statusText: string;
}

export interface LedgerInterface {
  connect: (blockchain: Blockchain) => Promise<string>;
  signMessage: (msg: string, blockchain: Blockchain) => Promise<string>;
  isSupported: () => Promise<boolean>;
}

export function useLedger(): LedgerInterface {
  const rootPathBtc = "84'/0'/0'";
  const rootPathEth = "44'/60'/0'";

  let tmpClient: AppClient;
  const [appClient, setAppClient] = useState<AppClient>();

  let tmpEthClient: Eth;
  const [ethClient, setEthClient] = useState<Eth>();

  const [transport, setTransport] = useState<Transport>();

  async function isSupported(): Promise<boolean> {
    return TransportWebHID.isSupported();
  }

  async function connect(blockchain: Blockchain): Promise<string> {
    return blockchain == Blockchain.BITCOIN ? connectBtc() : connectEth();
  }

  async function connectBtc(): Promise<string> {
    const client = appClient ?? (await setupBtcConnection());

    tmpClient = client;
    setAppClient(client);

    try {
      return await timeout(fetchBtcAddress(client), 5000);
    } catch (e) {
      const { name, message, statusText } = e as LedgerError;

      if (message?.includes('Timeout')) {
        client.transport.close();
        setAppClient(undefined);
        throw new TranslatedError('Connection timed out. Please retry.');
      } else if (name === 'LockedDeviceError') {
        throw new TranslatedError('Please unlock your Ledger');
      } else if (name === 'TransportRaceCondition') {
        throw new TranslatedError('There is already a request pending. Please reload the page and retry.');
      } else if (statusText === 'CLA_NOT_SUPPORTED') {
        throw new TranslatedError(
          'You are using a wrong or outdated Ledger app. Please install the newest version of the Bitcoin app on your Ledger.',
        );
      } else if (statusText === 'UNKNOWN_ERROR') {
        throw new TranslatedError('Please open the Bitcoin app on your Ledger');
      }

      throw e;
    }
  }

  async function connectEth(): Promise<string> {
    const client = ethClient ?? (await setupEthConnection());

    tmpEthClient = client;
    setEthClient(client);

    try {
      return await timeout(fetchEthAddress(client), 5000);
    } catch (e) {
      const { name, message, statusText } = e as LedgerError;

      if (message?.includes('Timeout')) {
        client.transport.close();
        setAppClient(undefined);
        throw new TranslatedError('Connection timed out. Please retry.');
      } else if (name === 'LockedDeviceError') {
        throw new TranslatedError('Please unlock your Ledger');
      } else if (name === 'TransportRaceCondition') {
        throw new TranslatedError('There is already a request pending. Please reload the page and retry.');
      } else if (statusText === 'CLA_NOT_SUPPORTED') {
        throw new TranslatedError(
          'You are using a wrong or outdated Ledger app. Please install the newest version of the Bitcoin app on your Ledger.',
        );
      } else if (statusText === 'UNKNOWN_ERROR') {
        throw new TranslatedError('Please open the Bitcoin app on your Ledger');
      }

      throw e;
    }
  }

  async function setupBtcConnection(): Promise<AppClient> {
    try {
      const tmpTransport = transport ?? (await TransportWebHID.create());
      setTransport(tmpTransport);
      return new AppClient(tmpTransport);
    } catch (e) {
      const { name } = e as Error;

      if (name === 'TransportOpenUserCancelled') {
        throw new TranslatedError('Please connect your Ledger');
      }

      throw e;
    }
  }

  async function setupEthConnection(): Promise<Eth> {
    try {
      const tmpTransport = transport ?? (await TransportWebHID.create());
      setTransport(tmpTransport);
      return new Eth(tmpTransport);
    } catch (e) {
      const { name } = e as Error;

      if (name === 'TransportOpenUserCancelled') {
        throw new TranslatedError('Please connect your Ledger');
      }

      throw e;
    }
  }

  async function fetchBtcAddress(client: AppClient): Promise<string> {
    const fpr = await client.getMasterFingerprint();
    const pubKey = await client.getExtendedPubkey(`m/${rootPathBtc}`);
    const policy = new DefaultWalletPolicy('wpkh(@0/**)', `[${fpr}/${rootPathBtc}]${pubKey}`);

    return client.getWalletAddress(policy, null, 0, 0, false);
  }

  async function fetchEthAddress(client: Eth): Promise<string> {
    const { address } = await client.getAddress("44'/60'/0'/0/0", false, false);
    return address;
  }

  async function signMessage(msg: string, blockchain: Blockchain): Promise<string> {
    return blockchain == Blockchain.BITCOIN ? signBtcMessage(msg) : signEthMessage(msg);
  }

  async function signBtcMessage(msg: string): Promise<string> {
    const client = appClient ?? tmpClient;
    if (!client) throw new Error('Ledger not connected');

    try {
      return await client.signMessage(Buffer.from(msg), `m/${rootPathBtc}/0/0`);
    } catch (e) {
      const { statusText } = e as LedgerError;

      if (statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED') {
        throw new AbortError('User cancelled');
      }

      throw e;
    }
  }

  async function signEthMessage(msg: string): Promise<string> {
    const client = ethClient ?? tmpEthClient;
    if (!client) throw new Error('Ledger not connected');

    console.log(msg);
    try {
      const signature = await client.signPersonalMessage(`m/${rootPathEth}/0/0`, Buffer.from(msg).toString('hex'));
      return '0x' + signature.r + signature.s + signature.v.toString(16);
    } catch (e) {
      const { statusText } = e as LedgerError;

      if (statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED') {
        throw new AbortError('User cancelled');
      }

      throw e;
    }
  }

  return {
    connect,
    signMessage,
    isSupported,
  };
}
