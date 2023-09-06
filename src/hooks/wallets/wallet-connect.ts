import { Blockchain } from '@dfx.swiss/react/dist/definitions/blockchain';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { EthereumProvider as EthClient } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import { useState } from 'react';
import Secrets from '../../config/secrets';
import { AbortError } from '../../util/abort-error';
import { useBlockchain } from '../blockchain.hook';

export interface WalletConnectInterface {
  connect: (blockchain: Blockchain) => Promise<string>;
  signMessage: (msg: string, address: string, blockchain: Blockchain) => Promise<string>;
}

export function useWalletConnect(): WalletConnectInterface {
  const [walletConnectClient, setWalletConnectClient] = useState<EthClient>();
  const { toChainId } = useBlockchain();

  async function connect(blockchain: Blockchain): Promise<string> {
    const client = walletConnectClient ?? (await setupConnection(blockchain));
    await client.connect();
    const result = await client.request<string[]>({ method: 'eth_requestAccounts' });
    console.log(result);
    return result[0];
  }

  async function setupConnection(blockchain: Blockchain): Promise<EthClient> {
    const chainId = toChainId(blockchain);

    if (!process.env.REACT_APP_WC_PID) throw new Error();

    const provider = await EthereumProvider.init({
      projectId: Secrets.WalletConnect.projectId,
      chains: [+(chainId ?? 1)],
      showQrModal: true,
      metadata: {
        name: document.title,
        description: 'Buy coins and tokens on a blockchain simply by using DFX services. Your keys, your coins.',
        url: window.location.origin,
        icons: ['https://content.dfx.swiss/img/v1/website/logo-dark.svg'],
      },
    });

    setWalletConnectClient(provider);
    return provider;
  }

  async function signMessage(msg: string, address: string, blockchain: Blockchain): Promise<string> {
    try {
      const client = walletConnectClient ?? (await setupConnection(blockchain));
      return await client.request<string>({ method: 'personal_sign', params: [address, msg] });
    } catch (e) {
      throw new AbortError('User cancelled');
    }
  }

  return {
    connect,
    signMessage,
  };
}
