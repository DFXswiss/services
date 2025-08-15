import { walletConnect } from '@wagmi/connectors';
import { createConfig, http } from '@wagmi/core';
import { arbitrum, base, bsc, mainnet, optimism, polygon } from '@wagmi/core/chains';

const citreaTestnet = {
  id: 5115,
  name: 'Citrea Testnet',
  network: 'citrea-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'cBTC',
    symbol: 'cBTC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.citrea.xyz'],
    },
    public: {
      http: ['https://rpc.testnet.citrea.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Citrea Explorer',
      url: 'https://explorer.testnet.citrea.xyz',
    },
  },
  testnet: true,
} as const;

export const config = createConfig({
  chains: [mainnet, bsc, arbitrum, optimism, polygon, base, citreaTestnet],
  connectors: [
    walletConnect({
      projectId: process.env.REACT_APP_WC_PID || 'Missing REACT_APP_WC_PID',
      metadata: {
        name: document.title,
        description: 'Buy and sell crypto.',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
      showQrModal: false,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [citreaTestnet.id]: http(),
  },
});
