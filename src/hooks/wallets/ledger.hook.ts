import Transport from '@ledgerhq/hw-transport';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';
import { useState } from 'react';

export interface LedgerInterface {
  getAddress: () => Promise<string>;
  connect: () => Promise<void>;
  signMessage: (msg: string) => Promise<string>;
  isSupported: () => Promise<boolean>;
}

export function useLedger(): LedgerInterface {
  const [appClient, setAppClient] = useState<AppClient>();
  const [transport, setTransport] = useState<Transport>();
  const [defaultWalletPolicy, setDefaultWalletPolicy] = useState<DefaultWalletPolicy>();
  const rootPath = "84'/0'/0'";

  async function isSupported(): Promise<boolean> {
    return TransportWebHID.isSupported();
  }

  async function connect(): Promise<void> {
    //Meldung: Access denied to use Ledger device -> wenn man auf abbrechen klickt beim connecten
    !transport && setTransport(await TransportWebHID.create());
    !appClient && transport && setAppClient(new AppClient(transport));

    if (!appClient) throw new Error(); //TODO: App nicht offen

    const fpr = await appClient.getMasterFingerprint();
    const pubKey = await appClient.getExtendedPubkey(`m/${rootPath}`);
    setDefaultWalletPolicy(new DefaultWalletPolicy('wpkh(@0/**)', `[${fpr}/${rootPath}]${pubKey}`));
  }

  async function getAddress(): Promise<string> {
    if (!appClient) throw new Error();
    if (!defaultWalletPolicy) throw new Error();
    return appClient.getWalletAddress(defaultWalletPolicy, null, 0, 0, false);
  }

  async function signMessage(msg: string): Promise<string> {
    if (!appClient) throw new Error();
    return appClient.signMessage(Buffer.from(msg), `m/${rootPath}/0/0`);
  }

  return {
    getAddress,
    connect,
    signMessage,
    isSupported,
  };
}
