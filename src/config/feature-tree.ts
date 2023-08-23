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
          page: 'eth',
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
    ]
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
