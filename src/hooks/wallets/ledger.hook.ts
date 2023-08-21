import Transport from '@ledgerhq/hw-transport';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppClient, { DefaultWalletPolicy } from 'ledger-bitcoin';

export interface LedgerInterface {
  getAddress: () => Promise<string>;
  signMessage: (msg: string) => Promise<string>;
  isSupported: () => Promise<boolean>;
}

export function useLedger(): LedgerInterface {
  const rootPath = "84'/0'/0'";
  let appClient: AppClient; //| Btc;
  let transport: Transport;
  let isNew: boolean;
  function isSupported(): Promise<boolean> {
    return TransportWebHID.isSupported();
  }

  async function getAddress(): Promise<string> {
    transport ??= await TransportWebHID.create();
    isNew ??= await isVersionNew();
    // if (isNew) {
    appClient = new AppClient(transport);
    const fpr = await appClient.getMasterFingerprint();
    const pubKey = await appClient.getExtendedPubkey(`m/${rootPath}`);
    const walletPolicy = new DefaultWalletPolicy('wpkh(@0/**)', `[${fpr}/${rootPath}]${pubKey}`);
    return appClient.getWalletAddress(walletPolicy, null, 0, 0, false);
    // } else {
    // appClient = new Btc(transport);
    // const { bitcoinAddress } = await appClient.getWalletPublicKey(rootPath);
    // return bitcoinAddress;
    //}
  }

  async function signMessage(msg: string): Promise<string> {
    return appClient.signMessage(Buffer.from(msg), `m/${rootPath}/0/0`);
  }

  async function getAppVersion(): Promise<{ name: string; version: string }> {
    const r = await transport.send(0xb0, 0x01, 0x00, 0x00);
    let i = 1;
    const nameLength = r[i++];
    const name = r.slice(i, (i += nameLength)).toString('ascii');
    const versionLength = r[i++];
    const version = r.slice(i, (i += versionLength)).toString('ascii');
    return { name, version };
  }

  async function isVersionNew(): Promise<boolean> {
    const { name, version } = await getAppVersion();

    if (name == 'root') throw new Error();

    console.log(version);
    const partsA = version.split('.').map(Number);
    const partsB = '2.1.0'.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA < partB) {
        return false;
      } else if (partA > partB) {
        return true;
      }
    }
    return true;
  }

  return {
    getAddress,
    signMessage,
    isSupported,
  };
}
