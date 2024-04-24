import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { EthereumProvider as EthClient } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider';
import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import Web3 from 'web3';
import { AssetBalance } from '../../contexts/balance.context';
import { useSettingsContext } from '../../contexts/settings.context';
import { AbortError } from '../../util/abort-error';
import { useWeb3 } from '../web3.hook';

export interface WalletConnectInterface {
  connect: (blockchain: Blockchain, onConnectUri: (uri: string) => void) => Promise<string>;
  signMessage: (msg: string, address: string, blockchain: Blockchain) => Promise<string>;
  createTransaction: (amount: BigNumber, asset: Asset, from: string, to: string) => Promise<string>;
  readBalance: (asset: Asset, address?: string) => Promise<AssetBalance>;
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
declare enum EthCall {
  BALANCE_OF = '0x70a08231',
  TRANSFER = '0xa9059cbb',
  DECIMALS = '0x313ce567',
}

export function useWalletConnect(): WalletConnectInterface {
  const { toChainId } = useWeb3();
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
        params: [`0x${Buffer.from(msg, 'utf8').toString('hex')}`, address],
      });
    } catch (e) {
      throw new AbortError('User cancelled');
    }
  }

  function toUsableNumber(balance: any, decimals = 18): BigNumber {
    return new BigNumber(balance).dividedBy(Math.pow(10, decimals));
  }

  function encodeMethodData(method: EthCall, address: string): string {
    return method + '000000000000000000000000' + address.substring(2, address.length);
  }
  async function readBalance(asset: Asset, address?: string): Promise<AssetBalance> {
    if (!address || !asset) return { asset, amount: 0 };
    const client = get<EthClient>(storageKey) ?? (await setupConnection(asset.blockchain));

    try {
      if (asset.type === AssetType.COIN) {
        const balance = await client.request<number>({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });

        return {
          asset,
          amount: toUsableNumber(balance).toNumber(),
        };
      } else {
        const decimals = await client.request<any>({
          method: 'eth_call',
          params: [{ to: asset.chainId, data: encodeMethodData(EthCall.DECIMALS, address) }, 'latest'],
        });

        const tokenBalance = await client.request<any>({
          method: 'eth_call',
          params: [{ to: asset.chainId, data: encodeMethodData(EthCall.BALANCE_OF, address) }, 'latest'],
        });

        return {
          asset,
          amount: toUsableNumber(tokenBalance, new BigNumber(decimals).toNumber()).toNumber(),
        };
      }
    } catch (e) {
      return { asset, amount: 0 };
    }
  }

  async function createTransaction(amount: BigNumber, asset: Asset, from: string, to: string): Promise<string> {
    const client = get<EthClient>(storageKey) ?? (await setupConnection(asset.blockchain));
    const web3 = new Web3(client.chainId as any);

    if (asset.type === AssetType.COIN) {
      return await client.request<any>({
        method: 'eth_sendTransaction',
        params: [
          {
            to,
            from,
            value: new BigNumber(web3.utils.toWei(amount.toString(), 'ether')).toString(16),
            maxPriorityFeePerGas: null,
            maxFeePerGas: null,
          },
        ],
      });
    } else {
      const decimals = await client.request<any>({
        method: 'eth_call',
        params: [{ to: asset.chainId, data: encodeMethodData(EthCall.DECIMALS, from) }, 'latest'],
      });

      const adjustedAmount = amount
        .multipliedBy(Math.pow(10, new BigNumber(decimals).toNumber()))
        .toString(16)
        .padStart(64, '0');

      return await client.request<any>({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to: asset.chainId,
            value: '0x0',
            maxPriorityFeePerGas: null,
            maxFeePerGas: null,
            data: encodeMethodData(EthCall.TRANSFER, to) + adjustedAmount,
          },
        ],
      });
    }
  }

  return useMemo(
    () => ({
      connect,
      signMessage,
      createTransaction,
      readBalance,
      wallets,
    }),
    [],
  );
}
