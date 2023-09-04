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

    const provider = await EthereumProvider.init({
      projectId: '40d5335cbc27edf36ef95389c9d1ac22',
      chains: [+(chainId ?? 1)],
      showQrModal: true,
      metadata: {
        name: 'DFX.swiss',
        description: 'DFX.swiss',
        url: 'https://dfx.swiss/',
        icons: ['https://dfx.swiss/wp-content/uploads/2023/08/dfx-logo-neu.png'],
      },
    });
    setWalletConnectClient(provider);
    return provider;
  }

  async function signMessage(msg: string, address: string, blockchain: Blockchain): Promise<string> {
    try {
      const client = walletConnectClient ?? (await setupConnection(blockchain));
      const signature = await client.request<string>({ method: 'personal_sign', params: [address, msg] });
      return signature;
    } catch (e) {
      throw new AbortError('User cancelled');
    }
  }

  return {
    connect,
    signMessage,
  };
}
