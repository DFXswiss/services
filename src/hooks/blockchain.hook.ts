import { Blockchain } from '@dfx.swiss/react';
import { MetaMaskChainInterface } from './metamask.hook';

export interface BlockchainInterface {
  toBlockchain: (chainId: string | number) => Blockchain | undefined;
  toChainId: (blockchain: Blockchain) => string | number | undefined;
  toChainObject: (blockchain: Blockchain) => MetaMaskChainInterface | undefined;
  toHeader: (blockchain: Blockchain) => string;
  toProtocol: (blockchain: Blockchain) => Protocol;
  toMainToken: (blockchain: Blockchain) => string;
  toString: (blockchain: Blockchain) => string;
}

export enum Protocol {
  ERC_20 = 'ERC-20',
  BEP_20 = 'BEP-20',
}

// id taken from https://chainlist.org/
const chainIds: { [id: number]: Blockchain } = {
  [1]: Blockchain.ETHEREUM,
  [56]: Blockchain.BINANCE_SMART_CHAIN,
  [42161]: Blockchain.ARBITRUM,
  [10]: Blockchain.OPTIMISM,
};

interface BlockchainDefinitions {
  headings: Record<string, string>;
  protocols: Record<string, Protocol>;
  mainToken: Record<string, string>;
  stringValue: Record<string, string>;
}

export function useBlockchain(): BlockchainInterface {
  function toBlockchain(chainId: string | number): Blockchain | undefined {
    return chainIds[+chainId];
  }

  function toChainId(blockchain: Blockchain): string | number | undefined {
    return Object.entries(chainIds).find(([_, b]) => b === blockchain)?.[0];
  }

  function toChainObject(blockchain: Blockchain): MetaMaskChainInterface | undefined {
    let chainId = toChainId(blockchain)?.toString(16);
    if (!chainId) return undefined;
    chainId = `0x${chainId}`;
    const chainName = definitions.stringValue[blockchain];
    switch (blockchain) {
      case Blockchain.BINANCE_SMART_CHAIN:
        return {
          chainId,
          chainName,
          nativeCurrency: {
            name: 'BNB',
            symbol: 'bnb',
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

  const definitions: BlockchainDefinitions = {
    headings: {
      [Blockchain.ETHEREUM]: 'Ethereum mainnet · ERC-20 token',
      [Blockchain.BINANCE_SMART_CHAIN]: 'Binance Smart Chain · BEP-20 token',
      [Blockchain.ARBITRUM]: 'Arbitrum One · ERC-20 token',
      [Blockchain.OPTIMISM]: 'Optimism · ERC-20 token',
      [Blockchain.POLYGON]: 'Polygon · ERC-20 token',
    },
    protocols: {
      [Blockchain.ETHEREUM]: Protocol.ERC_20,
      [Blockchain.BINANCE_SMART_CHAIN]: Protocol.BEP_20,
      [Blockchain.ARBITRUM]: Protocol.ERC_20,
      [Blockchain.OPTIMISM]: Protocol.ERC_20,
      [Blockchain.POLYGON]: Protocol.ERC_20,
    },
    mainToken: {
      [Blockchain.ETHEREUM]: 'ETH',
      [Blockchain.BINANCE_SMART_CHAIN]: 'BNB',
      [Blockchain.ARBITRUM]: 'ETH',
      [Blockchain.OPTIMISM]: 'ETH',
      [Blockchain.POLYGON]: 'MATIC',
    },
    stringValue: {
      [Blockchain.ETHEREUM]: 'Ethereum',
      [Blockchain.BINANCE_SMART_CHAIN]: 'Binance Smart Chain',
      [Blockchain.ARBITRUM]: 'Arbitrum',
      [Blockchain.OPTIMISM]: 'Optimism',
      [Blockchain.POLYGON]: 'Polygon (not yet supported)',
    },
  };

  return {
    toBlockchain,
    toChainId,
    toChainObject,
    toHeader: (blockchain: Blockchain) => definitions.headings[blockchain],
    toProtocol: (blockchain: Blockchain) => definitions.protocols[blockchain],
    toMainToken: (blockchain: Blockchain) => definitions.mainToken[blockchain],
    toString: (blockchain: Blockchain) => definitions.stringValue[blockchain],
  };
}
