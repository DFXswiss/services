import { Blockchain } from '@dfx.swiss/react';
import { WalletType } from '../contexts/wallet.context';
import { Page } from '../hooks/feature-tree.hook';

export const FeatureTree: Page[] = [
  {
    id: 'home',
    tiles: [
      {
        id: 'buy',
        img: 'kaufen',
        next: {
          page: 'buy',
        },
      },
      {
        id: 'sell',
        img: 'verkaufen',
        next: {
          page: 'sell',
        },
      },
      {
        id: 'convert',
        img: 'tauschen',
        disabled: true,
      },
      {
        id: 'send',
        img: 'senden',
        disabled: true,
      },
    ],
  },
  {
    id: 'buy',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'wallets',
          tiles: ['dfx-wallet', 'hw-wallet', 'alby', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BITCOIN, assetOut: 'BTC' },
          },
        },
      },
      {
        id: 'taproot',
        img: 'taproot',
        disabled: true,
      },
      {
        id: 'erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'buy-erc20',
        },
      },
      {
        id: 'bsc',
        img: 'binancesmartchain',
        next: {
          page: 'buy-bsc',
        },
      },
    ],
  },
  {
    id: 'buy-erc20',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'buy-ethereum',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'buy-arbitrum',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'buy-optimism',
        },
      },
      {
        id: 'polygon',
        img: 'polygon',
        disabled: true,
      },
    ],
  },
  {
    id: 'buy-ethereum',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'buy-ethereum-stable',
        },
      },
      {
        id: 'other',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-ethereum-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDC' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'DAI' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-arbitrum',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'buy-arbitrum-stable',
        },
      },
      {
        id: 'other',
        img: 'othersarbitrum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-arbitrum-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDC' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'DAI' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersarbitrum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-optimism',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'buy-optimism-stable',
        },
      },
      {
        id: 'other',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-optimism-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'xchf',
        img: 'xchf',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'XCHF' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-bsc',
    tiles: [
      {
        id: 'bnb',
        img: 'bnb',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'BNB' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'buy-bsc-stable',
        },
      },
      {
        id: 'other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-bsc-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'DAI' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'wallets',
          tiles: ['dfx-wallet', 'alby', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BITCOIN, assetIn: 'BTC' },
          },
        },
      },
      {
        id: 'taproot',
        img: 'taproot',
        disabled: true,
      },
      {
        id: 'erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'sell-erc20',
        },
      },
      {
        id: 'bsc',
        img: 'binancesmartchain',
        next: {
          page: 'sell-bsc',
        },
      },
    ],
  },

  {
    id: 'sell-erc20',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'sell-ethereum',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'sell-arbitrum',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'sell-optimism',
        },
      },
      {
        id: 'polygon',
        img: 'polygon',
        disabled: true,
      },
    ],
  },
  {
    id: 'sell-ethereum',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'ETH' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'sell-ethereum-stable',
        },
      },
      {
        id: 'other',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-ethereum-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'USDC' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'DAI' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-arbitrum',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'ETH' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'sell-arbitrum-stable',
        },
      },
      {
        id: 'other',
        img: 'othersarbitrum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-arbitrum-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'USDC' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'DAI' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersarbitrum',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-optimism',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: 'ETH' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'sell-optimism-stable',
        },
      },
      {
        id: 'other',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-optimism-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'xchf',
        img: 'xchf',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: 'XCHF' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-bsc',
    tiles: [
      {
        id: 'bnb',
        img: 'bnb',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'BNB' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'sell-bsc-stable',
        },
      },
      {
        id: 'other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'sell-bsc-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'DAI' },
          },
        },
      },
      {
        id: 'other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'wallets',
    tiles: [
      {
        id: 'dfx-wallet',
        img: 'bitcoinapp',
        disabled: true,
      },
      {
        id: 'alby',
        img: 'alby',
        disabled: true,
        },
      },
      {
        id: 'metamask',
        img: 'metamaskrabby',
        wallet: { type: WalletType.META_MASK },
      },
      {
        id: 'hw-wallet',
        img: 'hardwarewallets',
        next: {
          page: 'hw-wallets',
        },
      },
      {
        id: 'cli',
        img: 'command',
        disabled: true,
      },
    ],
  },
  {
    id: 'hw-wallets',
    tiles: [
      {
        id: 'bitbox',
        img: 'bitbox',
        disabled: true,
      },
      {
        id: 'ledger',
        img: 'ledger',
        wallet: { type: WalletType.LEDGER },
      },
      {
        id: 'trezor',
        img: 'trezor',
        disabled: true,
      },
    ],
  },
];
