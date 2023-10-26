import { Blockchain } from '@dfx.swiss/react/dist/definitions/blockchain';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { EthereumProvider as EthClient } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import { useEffect, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useSettingsContext } from '../../contexts/settings.context';
import { AbortError } from '../../util/abort-error';
import { useBlockchain } from '../blockchain.hook';

export interface WalletConnectInterface {
  connect: (blockchain: Blockchain, onConnectUri: (uri: string) => void) => Promise<string>;
  signMessage: (msg: string, address: string, blockchain: Blockchain) => Promise<string>;
  wallets: DeepWallet[];
}

export interface WalletListings {
  listings: Record<string, WalletListing>;
}

export interface WalletListing {
  id: string;
  name: string;
  desktop: { native: string };
  mobile: { native: string };
  image_url: { md: string };
}

export interface DeepWallet {
  id: string;
  name: string;
  deepLink: string;
  imageUrl: string;
}

export function useWalletConnect(): WalletConnectInterface {
  const { toChainId } = useBlockchain();
  const storageKey = 'WalletConnectClient';
  const { get, put } = useSettingsContext();

  const [wallets, setWallets] = useState<DeepWallet[]>([]);

  useEffect(() => {
    getWallets().then(setWallets);
  }, []);

  async function getWallets(): Promise<DeepWallet[]> {
    if (!process.env.REACT_APP_WC_PID) throw new Error('WalletConnect PID not defined');

    return fetch(`https://explorer-api.walletconnect.com/v3/wallets?projectId=${process.env.REACT_APP_WC_PID}`).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        const { listings }: WalletListings = await response.json();

        return Object.values(listings)
          .map((w) => ({
            id: w.id,
            name: w.name,
            deepLink: isMobile ? w.mobile.native : w.desktop.native,
            imageUrl: w.image_url.md,
          }))
          .filter((w) => w.deepLink);
      },
    );
  }

  async function connect(blockchain: Blockchain, onConnectUri: (uri: string) => void): Promise<string> {
    const client = get<EthClient>(storageKey) ?? (await setupConnection(blockchain));

    client.on('display_uri', onConnectUri);

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
      showQrModal: false,
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
    wallets,
  };
}
