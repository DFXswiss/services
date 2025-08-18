import { Blockchain } from '@dfx.swiss/react';
import { useMemo } from 'react';
import Web3 from 'web3';

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
  [137]: Blockchain.POLYGON,
  [8453]: Blockchain.BASE,
  [100]: Blockchain.GNOSIS,
  [11235]: Blockchain.HAQQ,
  [5115]: Blockchain.CITREA_TESTNET,
};

export function useWeb3(): Web3Interface {
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
    const chainId = toChainHex(blockchain);
    if (!chainId) return undefined;

    switch (blockchain) {
      case Blockchain.BINANCE_SMART_CHAIN:
        return {
          chainId,
          chainName: 'BNB Smart Chain Mainnet',
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
          chainName: 'Arbitrum One',
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
          chainName: 'OP Mainnet',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://mainnet.optimism.io'],
          blockExplorerUrls: ['https://optimistic.etherscan.io/'],
        };

      case Blockchain.POLYGON:
        return {
          chainId,
          chainName: 'Polygon Mainnet',
          nativeCurrency: {
            name: 'Matic Token',
            symbol: 'MATIC',
            decimals: 18,
          },
          rpcUrls: ['https://polygon-rpc.com/'],
          blockExplorerUrls: ['https://polygonscan.com/'],
        };

      case Blockchain.BASE:
        return {
          chainId,
          chainName: 'Base',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org/'],
        };

      case Blockchain.GNOSIS:
        return {
          chainId,
          chainName: 'Gnosis',
          nativeCurrency: {
            name: 'xDAI',
            symbol: 'xDAI',
            decimals: 18,
          },
          rpcUrls: ['https://rpc.gnosischain.com'],
          blockExplorerUrls: ['https://gnosisscan.io/'],
        };

      case Blockchain.HAQQ:
        return {
          chainId,
          chainName: 'Haqq Network',
          nativeCurrency: {
            name: 'Islamic Coin',
            symbol: 'ISLM',
            decimals: 18,
          },
          rpcUrls: ['https://rpc.eth.haqq.network'],
          blockExplorerUrls: ['https://explorer.haqq.network/'],
        };

      case Blockchain.ETHEREUM:
        return {
          chainId,
          chainName: 'Ethereum Mainnet',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://eth.llamarpc.com'],
          blockExplorerUrls: ['https://etherscan.io/'],
        };

      case Blockchain.CITREA_TESTNET:
        return {
          chainId,
          chainName: 'Citrea Testnet',
          nativeCurrency: {
            name: 'Bitcoin',
            symbol: 'cBTC',
            decimals: 18,
          },
          rpcUrls: ['https://rpc.testnet.citrea.xyz'],
          blockExplorerUrls: ['https://explorer.testnet.citrea.xyz/'],
        };

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
