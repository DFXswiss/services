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
        id: 'bep20',
        img: 'binancesmartchain',
        next: {
          page: 'buy-bep20',
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-bep20',
    tiles: [
      {
        id: 'bnb',
        img: 'bnb',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          page: 'buy-binancesmartchain-stable',
        },
      },
      {
        id: 'other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'buy-binancesmartchain-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'cli'],
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
          tiles: ['dfx-wallet', 'hw-wallet', 'alby', 'cli'],
          options: {
            service: 'sell',
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
          page: 'sell-erc20-assets',
        },
      },
      {
        id: 'bep20',
        img: 'binancesmartchain',
        next: {
          page: 'sell-bep20-assets',
        },
      },
    ],
  },

  {
    id: 'sell-erc20-assets',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'sell-ethereum-assets',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'sell-arbitrum-assets',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'sell-optimism-assets',
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
    id: 'sell-ethereum-assets',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
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
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'WBTC' },
          }
        },
      },
      {
        id: 'stablecoin',
        img: 'stablecoin',
        next: {
          page: 'sell-ethereum-stablecoins',
        },
      },
      {
        id: 'othersethereum',
        img: 'othersethereum',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          }
        },
      },
    ],
  },
  {
    id: 'sell-ethereum-stablecoins',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
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
            service: 'sell',
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
            service: 'sell',
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
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          }
        },
      },
    ],
  },
  {
    id: 'sell-arbitrum-assets',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'ETH' },
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
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'WBTC' },
          }
        },
      },
      {
        id: 'stablecoin',
        img: 'stablecoin',
        next: {
          page: 'sell-arbitrum-stablecoins',
        },
      },
      {
        id: 'othersarbitrum',
        img: 'othersarbitrum',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          }
        },
      },
    ],
  },
  {
    id: 'sell-arbitrum-stablecoins',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDT' },
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
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDC' },
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
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'DAI' },
          }
        },
      },
      {
        id: 'othersarbitrum',
        img: 'othersarbitrum',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          }
        },
      },
    ],
  },
  {
    id: 'sell-optimism-assets',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'ETH' },
          }
        },
      },
      {
        id: 'stablecoin',
        img: 'stablecoin',
        next: {
          page: 'sell-optimism-stablecoins',
        },
      },
      {
        id: 'othersoptimism',
        img: 'othersoptimism',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined},
          }
        },
      },
    ],
  },
  {
    id: 'sell-optimism-stablecoins',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
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
            service: 'sell',
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
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          }
        },
      },
    ],
  },
  {
    id: 'sell-bep20-assets',
    tiles: [
      {
        id: 'bnb',
        img: 'bnb',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'BNB' },
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
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'WBTC' },
          }
        },
      },
      {
        id: 'stablecoin',
        img: 'stablecoin',
        next: {
          page: 'sell-binancesmartchain-stablecoins',
        },
      },
      {
        id: 'othersbinancesmartchain',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          }
        },
      },
    ],
  },
  {
    id: 'sell-binancesmartchain-stablecoins',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'USDT' },
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
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'DAI' },
          }
        },
      },
      {
        id: 'othersbinancesmartchain',
        img: 'othersbinancesmartchain',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'cli'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          }
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
