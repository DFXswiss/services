import { walletConnect } from '@wagmi/connectors';
import { createConfig, http } from '@wagmi/core';
import { arbitrum, base, bsc, mainnet, optimism, polygon, type Chain } from '@wagmi/core/chains';

const citreaTestnet: Chain = {
  id: 5115,
  name: 'Citrea Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'cBTC',
    symbol: 'cBTC',
  },
  rpcUrls: {
    default: {
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
};

export const config = createConfig({
  chains: [mainnet, bsc, arbitrum, optimism, polygon, base, citreaTestnet],
  connectors: [
    walletConnect({
      projectId: '8c8a3a14d25438a1e1b8f4d91d8d2674',
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
