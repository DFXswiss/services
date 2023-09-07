import { Blockchain } from '@dfx.swiss/react';
import { WalletType } from '../contexts/wallet.context';
import { Page } from '../hooks/feature-tree.hook';

export const FeatureTree: Page[] = [
  // --- DEFAULT CONFIG do not use for iframe or widgets --- //
  {
    id: 'home',
    dfxStyle: true,
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
    dfxStyle: true,
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
    dfxStyle: true,
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
    dfxStyle: true,
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          tiles: ['hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'bnb',
        img: 'bnb',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
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
          tiles: ['metamask', 'walletconnect', 'cli'],
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
          tiles: ['metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
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
          tiles: ['metamask', 'walletconnect', 'cli'],
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
          tiles: ['metamask', 'walletconnect', 'cli'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'wallets',
          tiles: ['dfx-wallet', 'alby'],
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
    dfxStyle: true,
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
    dfxStyle: true,
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'bnb',
        img: 'bnb',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
    dfxStyle: true,
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'wallets',
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
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
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: undefined },
          },
        },
      },
    ],
  },
  // --- DEFAULT CONFIG for iframe or widgets --- //
  {
    id: 'iframe',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-buy',
        img: 'kaufen',
        next: {
          page: 'buy',
        },
      },
      {
        id: 'iframe-sell',
        img: 'verkaufen',
        next: {
          page: 'sell',
        },
      },
      {
        id: 'iframe-convert',
        img: 'tauschen',
        disabled: true,
      },
      {
        id: 'iframe-send',
        img: 'senden',
        disabled: true,
      },
    ],
  },
  {
    id: 'iframe-buy',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'iframe-wallets',
          tiles: ['dfx-wallet', 'iframe-hw-wallet', 'alby', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BITCOIN, assetOut: 'BTC' },
          },
        },
      },
      {
        id: 'iframe-taproot',
        img: 'taproot',
        disabled: true,
      },
      {
        id: 'iframe-erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'iframe-buy-erc20',
        },
      },
      {
        id: 'iframe-bsc',
        img: 'binancesmartchain',
        next: {
          page: 'iframe-buy-bsc',
        },
      },
    ],
  },
  {
    id: 'iframe-buy-erc20',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-ethereum',
        img: 'ethereum',
        next: {
          page: 'iframe-buy-ethereum',
        },
      },
      {
        id: 'iframe-arbitrum',
        img: 'arbitrum',
        next: {
          page: 'iframe-buy-arbitrum',
        },
      },
      {
        id: 'iframe-optimism',
        img: 'optimism',
        next: {
          page: 'iframe-buy-optimism',
        },
      },
      {
        id: 'iframe-polygon',
        img: 'polygon',
        disabled: true,
      },
    ],
  },
  {
    id: 'iframe-buy-ethereum',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'iframe-wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-buy-ethereum-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersethereum',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-ethereum-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-usdc',
        img: 'usdc',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDC' },
          },
        },
      },
      {
        id: 'iframe-dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'DAI' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersethereum',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-arbitrum',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'iframe-wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-buy-arbitrum-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersarbitrum',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-arbitrum-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-usdc',
        img: 'usdc',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDC' },
          },
        },
      },
      {
        id: 'iframe-dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'DAI' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersarbitrum',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-optimism',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-buy-optimism-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersoptimism',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-optimism-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-xchf',
        img: 'xchf',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'XCHF' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersoptimism',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-bsc',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-bnb',
        img: 'bnb',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'BNB' },
          },
        },
      },
      {
        id: 'iframe-wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-buy-bsc-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-buy-bsc-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: 'DAI' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'iframe-wallets',
          tiles: ['dfx-wallet', 'alby'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BITCOIN, assetIn: 'BTC' },
          },
        },
      },
      {
        id: 'iframe-taproot',
        img: 'taproot',
        disabled: true,
      },
      {
        id: 'iframe-erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'iframe-sell-erc20',
        },
      },
      {
        id: 'iframe-bsc',
        img: 'binancesmartchain',
        next: {
          page: 'iframe-sell-bsc',
        },
      },
    ],
  },
  {
    id: 'iframe-sell-erc20',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-ethereum',
        img: 'ethereum',
        next: {
          page: 'iframe-sell-ethereum',
        },
      },
      {
        id: 'iframe-arbitrum',
        img: 'arbitrum',
        next: {
          page: 'iframe-sell-arbitrum',
        },
      },
      {
        id: 'iframe-optimism',
        img: 'optimism',
        next: {
          page: 'iframe-sell-optimism',
        },
      },
      {
        id: 'iframe-polygon',
        img: 'polygon',
        disabled: true,
      },
    ],
  },
  {
    id: 'iframe-sell-ethereum',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'ETH' },
          },
        },
      },
      {
        id: 'iframe-wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'WBTC' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-sell-ethereum-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersethereum',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-ethereum-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-usdc',
        img: 'usdc',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'USDC' },
          },
        },
      },
      {
        id: 'iframe-dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: 'DAI' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersethereum',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ETHEREUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-arbitrum',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'ETH' },
          },
        },
      },
      {
        id: 'iframe-wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'WBTC' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-sell-arbitrum-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersarbitrum',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-arbitrum-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-usdc',
        img: 'usdc',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'USDC' },
          },
        },
      },
      {
        id: 'iframe-dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: 'DAI' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersarbitrum',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.ARBITRUM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-optimism',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: 'ETH' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-sell-optimism-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersoptimism',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-optimism-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-xchf',
        img: 'xchf',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: 'XCHF' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersoptimism',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.OPTIMISM, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-bsc',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-bnb',
        img: 'bnb',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'BNB' },
          },
        },
      },
      {
        id: 'iframe-wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'WBTC' },
          },
        },
      },
      {
        id: 'iframe-stable',
        img: 'stablecoin',
        next: {
          page: 'iframe-sell-bsc-stable',
        },
      },
      {
        id: 'iframe-other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'iframe-sell-bsc-stable',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'USDT' },
          },
        },
      },
      {
        id: 'iframe-dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: 'DAI' },
          },
        },
      },
      {
        id: 'iframe-other',
        img: 'othersbinancesmartchain',
        next: {
          page: 'iframe-wallets',
          tiles: ['metamask', 'walletconnect'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BINANCE_SMART_CHAIN, assetIn: undefined },
          },
        },
      },
    ],
  },

  // --- BITCOIN ONLY --- //
  {
    id: 'bitcoinonly',
    tiles: [
      {
        id: 'bitcoinonly-buy',
        img: 'kaufen',
        next: {
          page: 'bitcoinonly-buy',
        },
      },
      {
        id: 'bitcoinonly-sell',
        img: 'verkaufen',
        next: {
          page: 'bitcoinonly-sell',
        },
      },
    ],
  },
  {
    id: 'bitcoinonly-buy',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'iframe-wallets',
          tiles: ['dfx-wallet', 'iframe-hw-wallet', 'alby'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BITCOIN, assetOut: 'BTC' },
          },
        },
      },
    ],
  },
  {
    id: 'bitcoinonly-sell',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'iframe-wallets',
          tiles: ['dfx-wallet', 'alby'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BITCOIN, assetIn: 'BTC' },
          },
        },
      },
    ],
  },

  // --- ALBY ONLY --- //
  {
    id: 'albyonly',
    header: 'Buy and sell with Alby',
    description: 'Buy and sell Bitcoin directly on your Alby Account!',
    bottomImage: 'https://getalby.com/assets/alby-logo-head-da6c4355b69a3baac3fc306d47741c9394a825e54905ef67c5dd029146b89edf.svg',
    tiles: [
      {
        id: 'albyonly-buy',
        img: 'kaufen_simple',
        next: {
          page: 'iframe-wallets',
          tiles: ['alby'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.LIGHTNING, assetOut: 'BTC' },
          },
        },
      },
      {
        id: 'albyonly-sell',
        img: 'verkaufen_simple',
        next: {
          page: 'iframe-wallets',
          tiles: ['alby'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.LIGHTNING, assetOut: 'BTC' },
          },
        },
      },
    ],
  },

  // --- BitBox ONLY Buy --- //
  {
    id: 'bitboxonly-buy',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BITCOIN, assetOut: 'BTC' },
          },
        },
      },
      {
        id: 'erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'bitboxonly-buy-erc20',
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-erc20',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'bitboxonly-buy-ethereum',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'bitboxonly-buy-arbitrum',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'bitboxonly-buy-optimism',
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-ethereum',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-buy-ethereum-stable',
        },
      },
      {
        id: 'other',
        img: 'othersethereum',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-ethereum-stable',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-arbitrum',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-buy-arbitrum-stable',
        },
      },
      {
        id: 'other',
        img: 'othersarbitrum',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-arbitrum-stable',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-optimism',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-buy-optimism-stable',
        },
      },
      {
        id: 'other',
        img: 'othersoptimism',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },
  {
    id: 'bitboxonly-buy-optimism-stable',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
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
          page: 'bitboxonly-hw-wallets',
          tiles: ['bitbox'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: undefined },
          },
        },
      },
    ],
  },

  // --- MARC STEINER --- //
  {
    id: 'marcsteiner',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'marcsteiner-buy',
        img: 'kaufen_simple',
        next: {
          page: 'marcsteiner-buy',
        },
      },
      {
        id: 'marcsteiner-sell',
        img: 'verkaufen_simple',
        next: {
          page: 'marcsteiner-sell',
        },
      },
    ],
  },
  {
    id: 'marcsteiner-buy',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'marcsteiner-buy-bitcoin',
        img: 'bitcoinlightning_simple',
        next: {
          page: 'marcsteiner-hw-wallets',
          tiles: ['bitbox', 'ledger'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BITCOIN, assetOut: 'BTC' },
          },
        },
      },
      {
        id: 'marcsteiner-buy-erc20',
        img: 'ethereumarbitrumoptimismpolygon_simple',
        next: {
          page: 'marcsteiner-buy-erc20',
        },
      },
    ],
  },
  {
    id: 'marcsteiner-buy-erc20',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'marcsteiner-buy-ethereum',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'marcsteiner-buy-arbitrum',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'marcsteiner-buy-optimism',
        },
      },
    ],
  },
  {
    id: 'marcsteiner-buy-ethereum',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
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
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
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
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'USDC' },
          },
        },
      },
    ],
  },
  {
    id: 'marcsteiner-buy-arbitrum',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
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
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
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
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'USDC' },
          },
        },
      },
    ],
  },
  {
    id: 'marcsteiner-buy-optimism',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDC' },
          },
        },
      },
    ],
  },
  {
    id: 'marcsteiner-sell',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning_simple',
        next: {
          page: 'marcsteiner-wallets',
          tiles: ['marcsteiner-dfx-wallet', 'alby'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BITCOIN, assetIn: 'BTC' },
          },
        },
      },
      {
        id: 'erc20',
        img: 'ethereumarbitrumoptimismpolygon_simple',
        next: {
          page: 'iframe-sell-erc20',
        },
      },
    ],
  },

  // --- KEVIN SOELL --- //
  {
    id: 'kevinsoell',
    tiles: [
      {
        id: 'buy',
        img: 'kaufen',
        next: {
          page: 'kevinsoell-buy',
        },
      },
      {
        id: 'sell',
        img: 'verkaufen',
        next: {
          page: 'kevinsoell-sell',
        },
      },
      {
        id: 'convert',
        img: 'tauschen',
        disabled: true,
      },
    ],
  },
  {
    id: 'kevinsoell-buy',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.BITCOIN, assetOut: 'BTC' },
          },
        },
      },
      {
        id: 'kevinsoell-buy-erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'kevinsoell-buy-erc20',
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-erc20',
    tiles: [
      {
        id: 'ethereum',
        img: 'ethereum',
        next: {
          page: 'kevinsoell-buy-ethereum',
        },
      },
      {
        id: 'arbitrum',
        img: 'arbitrum',
        next: {
          page: 'kevinsoell-buy-arbitrum',
        },
      },
      {
        id: 'optimism',
        img: 'optimism',
        next: {
          page: 'kevinsoell-buy-optimism',
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-ethereum',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask'],
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
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask'],
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
          page: 'kevinsoell-buy-ethereum-stable',
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-ethereum-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ETHEREUM, assetOut: 'DAI' },
          },
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-arbitrum',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask'],
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
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask'],
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
          page: 'kevinsoell-buy-arbitrum-stable',
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-arbitrum-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
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
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.ARBITRUM, assetOut: 'DAI' },
          },
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-optimism',
    tiles: [
      {
        id: 'eth',
        img: 'eth',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'ETH' },
          },
        },
      },
      {
        id: 'wbtc',
        img: 'wbtc',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'WBTC' },
          },
        },
      },
      {
        id: 'stable',
        img: 'stablecoin',
        next: {
          page: 'kevinsoell-buy-optimism-stable',
        },
      },
    ],
  },
  {
    id: 'kevinsoell-buy-optimism-stable',
    tiles: [
      {
        id: 'usdt',
        img: 'usdt',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDT' },
          },
        },
      },
      {
        id: 'usdc',
        img: 'usdc',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'USDC' },
          },
        },
      },
      {
        id: 'dai',
        img: 'dai',
        next: {
          page: 'iframe-wallets',
          tiles: ['iframe-hw-wallet', 'metamask', 'walletconnect', 'cli'],
          options: {
            service: 'buy',
            query: { blockchain: Blockchain.OPTIMISM, assetOut: 'DAI' },
          },
        },
      },
    ],
  },
  {
    id: 'kevinsoell-sell',
    tiles: [
      {
        id: 'bitcoin',
        img: 'bitcoinlightning',
        next: {
          page: 'iframe-wallets',
          tiles: ['dfx-wallet', 'alby'],
          options: {
            service: 'sell',
            query: { blockchain: Blockchain.BITCOIN, assetIn: 'BTC' },
          },
        },
      },
      {
        id: 'erc20',
        img: 'ethereumarbitrumoptimismpolygon',
        next: {
          page: 'sell-erc20',
        },
      },
    ],
  },

  // --- WALLETS default--- //
  {
    id: 'wallets',
    dfxStyle: true,
    tiles: [
      {
        id: 'dfx-wallet',
        img: 'bitcoinapp',
        disabled: true,
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
        id: 'alby',
        img: 'alby',
        wallet: { type: WalletType.ALBY, blockchain: Blockchain.LIGHTNING },
      },
      {
        id: 'walletconnect',
        img: 'walletconnect',
        wallet: { type: WalletType.WALLET_CONNECT },
      },
      {
        id: 'cli',
        img: 'command',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.CLI_BTC : WalletType.CLI_ETH,
        }),
      },
    ],
  },
  {
    id: 'hw-wallets',
    dfxStyle: true,
    tiles: [
      {
        id: 'bitbox',
        img: 'bitbox',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.BITBOX_BTC : WalletType.BITBOX_ETH,
        }),
      },
      {
        id: 'ledger',
        img: 'ledger',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.LEDGER_BTC : WalletType.LEDGER_ETH,
        }),
      },
      {
        id: 'trezor',
        img: 'trezor',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.TREZOR_BTC : WalletType.TREZOR_ETH,
        }),
      },
    ],
  },

  // --- WALLETS IFRAME--- //
  {
    id: 'iframe-wallets',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-dfx-wallet',
        img: 'bitcoinapp',
        disabled: true,
      },
      {
        id: 'iframe-metamask',
        img: 'metamaskrabby',
        wallet: { type: WalletType.META_MASK },
      },
      {
        id: 'iframe-hw-wallet',
        img: 'hardwarewallets',
        next: {
          page: 'iframe-hw-wallets',
        },
      },
      {
        id: 'iframe-alby',
        img: 'alby',
        wallet: { type: WalletType.ALBY, blockchain: Blockchain.LIGHTNING },
      },
      {
        id: 'iframe-walletconnect',
        img: 'walletconnect',
        wallet: { type: WalletType.WALLET_CONNECT },
        disabled: true,
      },
      {
        id: 'iframe-cli',
        img: 'command',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.CLI_BTC : WalletType.CLI_ETH,
        }),
      },
    ],
  },
  {
    id: 'iframe-hw-wallets',
    dfxStyle: true,
    tiles: [
      {
        id: 'iframe-bitbox',
        img: 'bitbox',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.BITBOX_BTC : WalletType.BITBOX_ETH,
        }),
      },
      {
        id: 'iframe-ledger',
        img: 'ledger',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.LEDGER_BTC : WalletType.LEDGER_ETH,
        }),
      },
      {
        id: 'iframe-trezor',
        img: 'trezor',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.TREZOR_BTC : WalletType.TREZOR_ETH,
        }),
      },
    ],
  },

  // --- WALLETS MarcSteiner--- //
  {
    id: 'marcsteiner-wallets',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'marcsteiner-dfx-wallet',
        img: 'bitcoinapp',
        disabled: true,
      },
      {
        id: 'marcsteiner-metamask',
        img: 'metamaskrabby',
        wallet: { type: WalletType.META_MASK },
      },
      {
        id: 'marcsteiner-hw-wallet',
        img: 'hardwarewallets',
        next: {
          page: 'marcsteiner-hw-wallets',
        },
      },
      {
        id: 'marcsteiner-alby',
        img: 'alby',
        wallet: { type: WalletType.ALBY, blockchain: Blockchain.LIGHTNING },
      },
      {
        id: 'marcsteiner-walletconnect',
        img: 'walletconnect',
        wallet: { type: WalletType.WALLET_CONNECT },
        disabled: true,
      },
      {
        id: 'marcsteiner-cli',
        img: 'command',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.CLI_BTC : WalletType.CLI_ETH,
        }),
      },
    ],
  },
  {
    id: 'marcsteiner-hw-wallets',
    header: 'marcsteiner-consulting.ch',
    description: 'Buy and sell Bitcoin and Crypto directly on your Wallet!',
    bottomImage: 'https://marcsteiner-consulting.ch/wp-content/uploads/2022/05/MS_Logo.svg',
    tiles: [
      {
        id: 'marcsteiner-bitbox',
        img: 'bitbox',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.BITBOX_BTC : WalletType.BITBOX_ETH,
        }),
      },
      {
        id: 'marcsteiner-ledger',
        img: 'ledger',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.LEDGER_BTC : WalletType.LEDGER_ETH,
        }),
      },
      {
        id: 'marcsteiner-trezor',
        img: 'trezor',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.TREZOR_BTC : WalletType.TREZOR_ETH,
        }),
      },
    ],
  },

  // --- WALLETS BitBox--- //
  {
    id: 'bitboxonly-hw-wallets',
    header: 'Buy Crypto',
    description: 'Buy Bitcoin and crypto directly on your BitBox!',
    bottomImage: 'https://bitbox.shop/media/__sized__/products/email-image-thumbnail-540x540-70.jpg',
    tiles: [
      {
        id: 'bitbox',
        img: 'bitbox',
        wallet: (params) => ({
          type: params.blockchain === Blockchain.BITCOIN ? WalletType.BITBOX_BTC : WalletType.BITBOX_ETH,
        }),
      },
    ],
  },

  // --- WALLETS Alby Only--- //
  {
    id: 'wallets',
    description: 'Buy and sell Bitcoin directly on your Alby Account!',
    bottomImage: 'https://getalby.com/assets/alby-logo-head-da6c4355b69a3baac3fc306d47741c9394a825e54905ef67c5dd029146b89edf.svg',
    tiles: [
      {
        id: 'alby',
        img: 'alby',
        wallet: { type: WalletType.ALBY, blockchain: Blockchain.LIGHTNING },
      },
    ],
  },

];
