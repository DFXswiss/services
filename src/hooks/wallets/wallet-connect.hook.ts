import { Blockchain } from '@dfx.swiss/react/dist/definitions/blockchain';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { EthereumProvider as EthClient } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import { useAppHandlingContext } from '../../contexts/app-handling.context';
import { useSettingsContext } from '../../contexts/settings.context';
import { AbortError } from '../../util/abort-error';
import { useBlockchain } from '../blockchain.hook';

export interface WalletConnectInterface {
  connect: (blockchain: Blockchain, onConnectUri: (uri: string) => void) => Promise<string>;
  signMessage: (msg: string, address: string, blockchain: Blockchain) => Promise<string>;
}

export function useWalletConnect(): WalletConnectInterface {
  const { isEmbedded } = useAppHandlingContext();
  const { toChainId } = useBlockchain();
  const storageKey = 'WalletConnectClient';
  const { get, put } = useSettingsContext();

  const useModal = !isEmbedded;

  async function connect(blockchain: Blockchain, onConnectUri: (uri: string) => void): Promise<string> {
    const client = get<EthClient>(storageKey) ?? (await setupConnection(blockchain));
    !useModal && client.on('display_uri', onConnectUri);

    await client.connect();
    const result = await client.request<string[]>({ method: 'eth_requestAccounts' });
    return result[0];
  }

  async function setupConnection(blockchain: Blockchain): Promise<EthClient> {
    if (!process.env.REACT_APP_WC_PID) throw new Error('WalletConnect PID not defined');

    const chainId = toChainId(blockchain);

    const provider = await EthereumProvider.init({
      projectId: process.env.REACT_APP_WC_PID,
      chains: [+(chainId ?? 1)],
      showQrModal: useModal,
      metadata: {
        name: document.title,
        description: 'Buy and sell crypto.',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    put(storageKey, provider);
    return provider;
  }

  async function signMessage(msg: string, address: string, blockchain: Blockchain): Promise<string> {
    try {
      const client = get<EthClient>(storageKey) ?? (await setupConnection(blockchain));

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
