import { walletConnect } from '@wagmi/connectors';
import { createConfig, http } from '@wagmi/core';
import { arbitrum, base, bsc, mainnet, optimism, polygon } from '@wagmi/core/chains';

export const config = createConfig({
  chains: [mainnet, bsc, arbitrum, optimism, polygon, base],
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
  },
});
