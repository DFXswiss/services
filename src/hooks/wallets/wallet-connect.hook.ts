import { Asset, AssetType, Blockchain } from '@dfx.swiss/react';
import {
  BaseError,
  Connector,
  getAccount,
  getBalance,
  getConnectors,
  readContract,
  sendTransaction,
  simulateContract,
  switchChain,
  connect as wagmiConnect,
  disconnect as wagmiDiconnect,
  reconnect as wagmiReconnect,
  signMessage as wagmiSignMessage,
  writeContract,
} from '@wagmi/core';
import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { formatUnits, parseEther, parseUnits } from 'viem';
import { AssetBalance } from '../../contexts/balance.context';
import ERC20_ABI from '../../static/erc20.abi.json';
import { config } from '../../wagmi.config';
import { useWeb3 } from '../web3.hook';

export interface WalletConnectInterface {
  connect: (blockchain: Blockchain, onConnectUri: (uri: string) => void) => Promise<string>;
  signMessage: (msg: string, address: string, blockchain: Blockchain) => Promise<string>;
  requestChangeToBlockchain: (blockchain?: Blockchain) => Promise<void>;
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

const erc20ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export function useWalletConnect(): WalletConnectInterface {
  const { toChainId } = useWeb3();
  const [wallets, setWallets] = useState<DeepWallet[]>([]);

  useEffect(() => {
    getWallets().then(setWallets);
    reconnect();
  }, []);

  function getWalletConnectConnector(): Connector {
    const walletConnectConnector = getConnectors(config).find((connector) => connector.id === 'walletConnect');
    if (!walletConnectConnector) throw new Error('WalletConnect connector not found');
    return walletConnectConnector;
  }

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
    try {
      await disconnect();
      const connector = getWalletConnectConnector();
      const provider = (await connector.getProvider()) as any;
      provider.events.on('display_uri', onConnectUri);

      const { accounts } = await wagmiConnect(config, {
        chainId: toChainId(blockchain) as any,
        connector,
      });

      return accounts[0];
    } catch (error) {
      handleError(error);
    }
  }

  async function disconnect(): Promise<void> {
    try {
      await wagmiDiconnect(config, { connector: getWalletConnectConnector() });
    } catch (error) {
      handleError(error);
    }
  }

  async function reconnect(): Promise<void> {
    try {
      const { isDisconnected } = getAccount(config);
      if (isDisconnected) {
        await wagmiReconnect(config, { connectors: [getWalletConnectConnector()] });
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function signMessage(msg: string, address: string, _blockchain: Blockchain): Promise<string> {
    try {
      return await wagmiSignMessage(config, {
        message: msg,
        account: address as any,
        connector: getWalletConnectConnector(),
      });
    } catch (error) {
      handleError(error);
    }
  }

  async function readBalance(asset: Asset, address?: string): Promise<AssetBalance> {
    if (!address || !asset) return { asset, amount: 0 };

    try {
      const balance = await getBalance(config, {
        address: address as any,
        token: asset.type === AssetType.COIN ? undefined : (asset.chainId as any),
        chainId: Number(toChainId(asset.blockchain)) as any,
      });
      return { asset, amount: Number(formatUnits(balance.value, balance.decimals)) };
    } catch (error) {
      return { asset, amount: 0 };
    }
  }

  async function requestChangeToBlockchain(blockchain?: Blockchain): Promise<void> {
    if (!blockchain) return;
    const chainId = Number(toChainId(blockchain));

    try {
      if (getAccount(config).chainId !== chainId) {
        await switchChain(config, { chainId: chainId as any, connector: getWalletConnectConnector() });
        await new Promise((resolve) => setTimeout(resolve, 5000)); // delay to allow chain switch in wallet
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function createTransaction(amount: BigNumber, asset: Asset, from: string, to: string): Promise<string> {
    try {
      if (asset.type === AssetType.COIN) {
        return await sendTransaction(config, {
          connector: getWalletConnectConnector(),
          account: from as any,
          chainId: Number(toChainId(asset.blockchain)) as any,
          to: to as any,
          value: parseEther(amount.toString()),
          data: '0x', // needed for Trust Wallet
        });
      } else {
        const decimals = (await readContract(config, {
          abi: ERC20_ABI,
          address: asset.chainId as any,
          functionName: 'decimals',
          chainId: Number(toChainId(asset.blockchain)) as any,
        })) as number;

        const { request } = await simulateContract(config, {
          abi: ERC20_ABI,
          chainId: Number(toChainId(asset.blockchain)) as any,
          address: asset.chainId as any,
          functionName: 'transfer',
          args: [to as any, parseUnits(amount.toString(), decimals)],
          connector: getWalletConnectConnector(),
        });

        return await writeContract(config, request);
      }
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(error: any): never {
    const baseError = error as BaseError;
    let finalError: unknown = baseError;

    baseError.walk((e) => e instanceof Error);
    finalError = baseError;

    if (finalError instanceof BaseError || finalError instanceof Error) {
      throw new Error((finalError as BaseError).shortMessage);
    } else {
      throw new Error('An unexpected error occurred.');
    }
  }

  return useMemo(
    () => ({
      connect,
      signMessage,
      requestChangeToBlockchain,
      createTransaction,
      readBalance,
      wallets,
    }),
    [wallets],
  );
}
