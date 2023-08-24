import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';
import { useState } from 'react';
import { TranslatedError } from '../../util/translated-error';

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
    try {
      const client = appClient ?? (await setupConnection());

      tmpClient = client;
      setAppClient(client);

      // fetch default wallet policy
      const fpr = await client.getMasterFingerprint();
      const pubKey = await client.getExtendedPubkey(`m/${rootPath}`);
      const policy = new DefaultWalletPolicy('wpkh(@0/**)', `[${fpr}/${rootPath}]${pubKey}`);

      return client.getWalletAddress(policy, null, 0, 0, false);
    } catch (e) {
      const { name, statusText } = e as LedgerError;

      if (name === 'TransportOpenUserCancelled') {
        throw new TranslatedError('Please connect your Ledger');
      } else if (name === 'LockedDeviceError') {
        throw new TranslatedError('Please unlock your Ledger');
      } else if (name === 'TransportRaceCondition') {
        throw new TranslatedError(
          'There is already a request pending. Please confirm it in your Ledger or reload the page and retry.',
        );
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

  async function setupConnection(): Promise<AppClient> {
    const transport = await TransportWebHID.create();
    return new AppClient(transport);
  }

  async function signMessage(msg: string): Promise<string> {
    const client = appClient ?? tmpClient;
    if (!client) throw new Error('Not connected');

    return client.signMessage(Buffer.from(msg), `m/${rootPath}/0/0`);
  }

  return {
    connect,
    signMessage,
    isSupported,
  };
}
