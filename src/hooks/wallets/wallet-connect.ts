import { Blockchain } from '@dfx.swiss/react/dist/definitions/blockchain';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { EthereumProvider as EthClient } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import { useState } from 'react';
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
    return result[0];
  }

  async function setupConnection(blockchain: Blockchain): Promise<EthClient> {
    const chainId = toChainId(blockchain);

    if (!process.env.REACT_APP_WC_PID) throw new Error();

    const provider = await EthereumProvider.init({
      projectId: process.env.REACT_APP_WC_PID,
      chains: [+(chainId ?? 1)],
      showQrModal: true,
      metadata: {
        name: document.title,
        description: 'Buy and sell crypto.',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    setWalletConnectClient(provider);
    return provider;
  }

  async function signMessage(msg: string, address: string, blockchain: Blockchain): Promise<string> {
    try {
      const client = walletConnectClient ?? (await setupConnection(blockchain));

      return await client.request<string>({
        method: 'personal_sign',
        params: [msg, address],
      });
    } catch (e) {
      throw new AbortError('User cancelled');
    }
  }

  return {
    connect,
    signMessage,
  };
}
