import { Blockchain } from '@dfx.swiss/react';
import { useMemo } from 'react';

export interface BlockchainInterface {
  toHeader: (blockchain: Blockchain) => string;
  toProtocol: (blockchain: Blockchain) => Protocol;
  toMainToken: (blockchain: Blockchain) => string;
  toString: (blockchain: Blockchain) => string;
}

export enum Protocol {
  ERC_20 = 'ERC-20',
  BEP_20 = 'BEP-20',
}

interface BlockchainDefinitions {
  headings: Record<string, string>;
  protocols: Record<string, Protocol>;
  mainToken: Record<string, string>;
  stringValue: Record<string, string>;
}

export function useBlockchain(): BlockchainInterface {
  const definitions: BlockchainDefinitions = {
    headings: {
      [Blockchain.ETHEREUM]: 'Ethereum mainnet · ERC-20 token',
      [Blockchain.BINANCE_SMART_CHAIN]: 'BNB Chain · BEP-20 token',
      [Blockchain.ARBITRUM]: 'Arbitrum One · ERC-20 token',
      [Blockchain.OPTIMISM]: 'Optimism · ERC-20 token',
      [Blockchain.POLYGON]: 'Polygon · ERC-20 token',
      [Blockchain.BASE]: 'Base · ERC-20 token',
      [Blockchain.HAQQ]: 'Haqq · ERC-20 token',
    },
    protocols: {
      [Blockchain.ETHEREUM]: Protocol.ERC_20,
      [Blockchain.BINANCE_SMART_CHAIN]: Protocol.BEP_20,
      [Blockchain.ARBITRUM]: Protocol.ERC_20,
      [Blockchain.OPTIMISM]: Protocol.ERC_20,
      [Blockchain.POLYGON]: Protocol.ERC_20,
      [Blockchain.BASE]: Protocol.ERC_20,
      [Blockchain.HAQQ]: Protocol.ERC_20,
    },
    mainToken: {
      [Blockchain.ETHEREUM]: 'ETH',
      [Blockchain.BINANCE_SMART_CHAIN]: 'BNB',
      [Blockchain.ARBITRUM]: 'ETH',
      [Blockchain.OPTIMISM]: 'ETH',
      [Blockchain.POLYGON]: 'MATIC',
      [Blockchain.BASE]: 'ETH',
      [Blockchain.HAQQ]: 'ISLM',
    },
    stringValue: {
      [Blockchain.ETHEREUM]: 'Ethereum',
      [Blockchain.BINANCE_SMART_CHAIN]: 'BNB Chain',
      [Blockchain.ARBITRUM]: 'Arbitrum',
      [Blockchain.OPTIMISM]: 'Optimism',
      [Blockchain.POLYGON]: 'Polygon',
      [Blockchain.BASE]: 'Base',
      [Blockchain.GNOSIS]: 'Gnosis',
      [Blockchain.HAQQ]: 'Haqq',
      [Blockchain.BITCOIN]: 'Bitcoin',
      [Blockchain.LIGHTNING]: 'Lightning',
      [Blockchain.DEFICHAIN]: 'DeFiChain',
      [Blockchain.ARWEAVE]: 'Arweave',
      [Blockchain.CARDANO]: 'Cardano',
      [Blockchain.MONERO]: 'Monero',
      [Blockchain.SOLANA]: 'Solana',
    },
  };

  return useMemo(
    () => ({
      toHeader: (blockchain: Blockchain) => definitions.headings[blockchain],
      toProtocol: (blockchain: Blockchain) => definitions.protocols[blockchain],
      toMainToken: (blockchain: Blockchain) => definitions.mainToken[blockchain],
      toString: (blockchain: Blockchain) => definitions.stringValue[blockchain],
    }),
    [],
  );
}
