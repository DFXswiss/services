import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';

export interface LedgerInterface {
  isSupported: () => Promise<boolean>;
  getAddress: () => Promise<string>;
  signMessage: (msg: string) => Promise<string>;
}

export function useLedger(): LedgerInterface {
  async function getAppClient(): Promise<AppClient> {
    const connectedTransport = await TransportWebHID.openConnected();
    if (connectedTransport) return new AppClient(connectedTransport);
    const transport = await TransportWebHID.create();
    return new AppClient(transport);
  }

  function isSupported(): Promise<boolean> {
    return TransportWebHID.isSupported();
  }

  async function getAddress(): Promise<string> {
    const appClient = await getAppClient();
    const fpr = await appClient.getMasterFingerprint();
    const pubKey = await appClient.getExtendedPubkey("m/84'/0'/0'");
    const walletPolicy = new DefaultWalletPolicy('wpkh(@0/**)', `[${fpr}/84'/0'/0']${pubKey}`);
    return appClient.getWalletAddress(walletPolicy, null, 0, 0, false);
  }

  async function signMessage(msg: string): Promise<string> {
    const appClient = await getAppClient();
    return appClient.signMessage(Buffer.from(msg), "m/84'/0'/0'/0/0");
  }

  return {
    isSupported,
    getAddress,
    signMessage,
  };
}
