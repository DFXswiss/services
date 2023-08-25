import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';
import { useState } from 'react';
import { AbortError } from '../../util/abort-error';
import { TranslatedError } from '../../util/translated-error';
import { timeout } from '../../util/utils';

interface LedgerError extends Error {
  statusCode: number;
  statusText: string;
}

export interface LedgerInterface {
  connect: () => Promise<string>;
  signMessage: (msg: string) => Promise<string>;
  isSupported: () => Promise<boolean>;
}

export function useLedger(): LedgerInterface {
  const rootPath = "84'/0'/0'";

  let tmpClient: AppClient;
  const [appClient, setAppClient] = useState<AppClient>();

  async function isSupported(): Promise<boolean> {
    return TransportWebHID.isSupported();
  }

  async function connect(): Promise<string> {
    const client = appClient ?? (await setupConnection());

    tmpClient = client;
    setAppClient(client);

    try {
      return await timeout(fetchAddress(client), 5000);
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
      } else if (statusText === 'CLA_NOT_SUPPORTED' || statusText === 'INS_NOT_SUPPORTED') {
        throw new TranslatedError(
          'You are using a wrong or outdated Ledger app. Please install the newest version of the Bitcoin app on your Ledger.',
        );
      } else if (statusText === 'UNKNOWN_ERROR') {
        throw new TranslatedError('Please open the Bitcoin app on your Ledger');
      }

      throw e;
    }
  }

  async function setupConnection(): Promise<AppClient> {
    try {
      const transport = await TransportWebHID.create();
      return new AppClient(transport);
    } catch (e) {
      const { name } = e as Error;

      if (name === 'TransportOpenUserCancelled') {
        throw new TranslatedError('Please connect your Ledger');
      }

      throw e;
    }
  }

  async function fetchAddress(client: AppClient): Promise<string> {
    const fpr = await client.getMasterFingerprint();
    const pubKey = await client.getExtendedPubkey(`m/${rootPath}`);
    const policy = new DefaultWalletPolicy('wpkh(@0/**)', `[${fpr}/${rootPath}]${pubKey}`);

    return client.getWalletAddress(policy, null, 0, 0, false);
  }

  async function signMessage(msg: string): Promise<string> {
    const client = appClient ?? tmpClient;
    if (!client) throw new Error('Ledger not connected');

    try {
      return await client.signMessage(Buffer.from(msg), `m/${rootPath}/0/0`);
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
