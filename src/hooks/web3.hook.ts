import { Blockchain } from '@dfx.swiss/react';
import { useMemo } from 'react';
import Web3 from 'web3';
import { useBlockchain } from './blockchain.hook';

export interface Web3Interface {
  toBlockchain: (chainId: string | number) => Blockchain | undefined;
  toChainHex: (blockchain: Blockchain) => string | number | undefined;
  toChainId: (blockchain: Blockchain) => string | number | undefined;
  toChainObject: (blockchain: Blockchain) => MetaMaskChainInterface | undefined;
}

export interface MetaMaskChainInterface {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

// id taken from https://chainlist.org/
const chainIds: { [id: number]: Blockchain } = {
  [1]: Blockchain.ETHEREUM,
  [56]: Blockchain.BINANCE_SMART_CHAIN,
  [42161]: Blockchain.ARBITRUM,
  [10]: Blockchain.OPTIMISM,
};

export function useWeb3(): Web3Interface {
  const { toString } = useBlockchain();

  function toBlockchain(chainId: string | number): Blockchain | undefined {
    return chainIds[+chainId];
  }

  function toChainHex(blockchain: Blockchain): string | undefined {
    const web3 = new Web3(Web3.givenProvider);

    const id = toChainId(blockchain);
    return id && web3.utils.toHex(id);
  }

  function toChainId(blockchain: Blockchain): string | undefined {
    return Object.entries(chainIds).find(([_, b]) => b === blockchain)?.[0];
  }

  function toChainObject(blockchain: Blockchain): MetaMaskChainInterface | undefined {
    const chainName = toString(blockchain);
    const chainId = toChainHex(blockchain);
    if (!chainId) return undefined;

    switch (blockchain) {
      case Blockchain.BINANCE_SMART_CHAIN:
        return {
          chainId,
          chainName,
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
          },
          rpcUrls: ['https://bsc-dataseed.binance.org/'],
          blockExplorerUrls: ['https://bscscan.com/'],
        };
      case Blockchain.ARBITRUM:
        return {
          chainId,
          chainName,
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://arb1.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://arbiscan.io/'],
        };
      case Blockchain.OPTIMISM:
        return {
          chainId,
          chainName,
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://mainnet.optimism.io'],
          blockExplorerUrls: ['https://optimistic.etherscan.io/'],
        };
      case Blockchain.ETHEREUM:
      default:
        return undefined;
    }
  }

  return useMemo(
    () => ({
      toBlockchain,
      toChainHex,
      toChainId,
      toChainObject,
    }),
    [],
  );
}
