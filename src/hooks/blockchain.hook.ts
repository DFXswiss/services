import { Blockchain } from '../api/definitions/blockchain';

export interface BlockchainInterface {
  toHeader: (blockchain: Blockchain) => string;
  toProtocol: (blockchain: Blockchain) => Protocol;
  toMainToken: (blockchain: Blockchain) => string;
  toString: (blockchain: Blockchain) => string;
}

export enum Protocol {
  ERC_20 = 'ERC-20',
  BEP_20 = 'BEP-20',
  TODO = 'TODO',
}

// id taken from https://chainlist.org/
export function useBlockchain(): BlockchainInterface {
  const definitions = {
    headings: {
      [Blockchain.DEFICHAIN]: 'Todo defichain',
      [Blockchain.BITCOIN]: 'Todo bitcoin',
      [Blockchain.ETHEREUM]: 'Ethereum mainnet · ERC-20 token',
      [Blockchain.BINANCE_SMART_CHAIN]: 'Binance Smart Chain · BEP-20 token',
      [Blockchain.ARBITRUM]: 'Arbitrum One · ERC-20 token',
      [Blockchain.OPTIMISM]: 'Optimism · ERC-20 token',
      [Blockchain.POLYGON]: 'Polygon · ERC-20 token',
      [Blockchain.CARDANO]: 'Todo cardano',
    },
    protocols: {
      [Blockchain.DEFICHAIN]: Protocol.TODO,
      [Blockchain.BITCOIN]: Protocol.TODO,
      [Blockchain.ETHEREUM]: Protocol.ERC_20,
      [Blockchain.BINANCE_SMART_CHAIN]: Protocol.BEP_20,
      [Blockchain.ARBITRUM]: Protocol.ERC_20,
      [Blockchain.OPTIMISM]: Protocol.ERC_20,
      [Blockchain.POLYGON]: Protocol.ERC_20,
      [Blockchain.CARDANO]: Protocol.TODO,
    },
    mainToken: {
      [Blockchain.DEFICHAIN]: 'DFI',
      [Blockchain.BITCOIN]: 'BTC',
      [Blockchain.ETHEREUM]: 'ETH',
      [Blockchain.BINANCE_SMART_CHAIN]: 'BNB',
      [Blockchain.ARBITRUM]: 'ETH',
      [Blockchain.OPTIMISM]: 'ETH',
      [Blockchain.POLYGON]: 'MATIC',
      [Blockchain.CARDANO]: 'ADA',
    },
    stringValue: {
      [Blockchain.DEFICHAIN]: 'DeFiChain',
      [Blockchain.BITCOIN]: 'Bitcoin',
      [Blockchain.ETHEREUM]: 'Ethereum',
      [Blockchain.BINANCE_SMART_CHAIN]: 'Binance Smart Chain',
      [Blockchain.ARBITRUM]: 'Arbitrum',
      [Blockchain.OPTIMISM]: 'Optimism',
      [Blockchain.POLYGON]: 'Polygon (not yet supported)',
      [Blockchain.CARDANO]: 'Cardano (not yet supported)',
    },
  };

  return {
    toHeader: (blockchain: Blockchain) => definitions.headings[blockchain],
    toProtocol: (blockchain: Blockchain) => definitions.protocols[blockchain],
    toMainToken: (blockchain: Blockchain) => definitions.mainToken[blockchain],
    toString: (blockchain: Blockchain) => definitions.stringValue[blockchain],
  };
}
