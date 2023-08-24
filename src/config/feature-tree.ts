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
          page: 'buy-asset',
        },
      },
      {
        id: 'sell',
        img: 'verkaufen',
        next: {
          page: 'sell-asset',
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
    id: 'buy-asset',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'wallets',
          tiles: ['dfx-wallet', 'hw-wallet', 'alby', 'cli'],
          options: {
            service: 'buy',
            query: { assetOut: 'BTC' },
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
          page: 'buy-erc20-assets',
        },
      },
      {
        id: 'bep20',
        img: 'binancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN },
          },
        },
      },
    ],
  },
  {
    id: 'buy-erc20-assets',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'buy-ethereum-assets',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'eth',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'eth',
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
    id: 'buy-ethereum-assets',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'ETH' },
          }
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'WBTC' },
          }
        },
      },
      {
        id: 'stablecoin',
        img: 'stablecoin',
        next: {
          page: 'buy-ethereum-stablecoins',
        },
      },
      {
        id: 'othersethereum',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM },
          }
        },
      },
    ],
  },
  {
    id: 'buy-ethereum-stablecoins',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDT' },
          }
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDC' },
          }
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'DAI' },
          }
        },
      },
      {
        id: 'othersethereum',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM },
          }
        },
      },
    ],
  },
  {
    id: 'buy-optimism-assets',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'ETH' },
          }
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'WBTC' },
          }
        },
      },
      {
        id: 'stablecoin',
        img: 'stablecoin',
        next: {
          page: 'buy-optimism-stablecoins',
        },
      },
      {
        id: 'othersoptimism',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM },
          }
        },
      },
    ],
  },
  {
    id: 'buy-optimism-stablecoins',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDT' },
          }
        },
      },
      {
        id: 'xchf',
        img: 'xchf',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'XCHF' },
          }
        },
      },
      {
        id: 'othersoptimism',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM },
          }
        },
      },
    ],
  },
  {
    id: 'eth',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        disabled: true,
      },
      {
        id: 'dai',
        img: 'dai',
        disabled: true,
      },
    ],
  },
  {
    id: 'sell-asset',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'wallets',
          tiles: ['dfx-wallet', 'hw-wallet', 'alby', 'cli'],
          options: {
            service: 'sell',
            query: { assetIn: 'BTC' },
          },
        },
      },
      /* TODO */
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
        wallet: WalletType.ALBY,
      },
      {
        id: 'metamask',
        img: 'metamaskrabby',
        wallet: WalletType.META_MASK,
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
      /* TODO */
    ],
  },
];
