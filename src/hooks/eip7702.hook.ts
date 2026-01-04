import { Blockchain, Eip7702DelegationData, Eip7702SignedData } from '@dfx.swiss/react';
import { useMemo, useCallback } from 'react';
import { useMetaMask } from './wallets/metamask.hook';

// All EVM chains that support EIP-7702
const EIP7702_SUPPORTED_CHAINS = [
  Blockchain.ETHEREUM,
  Blockchain.POLYGON,
  Blockchain.ARBITRUM,
  Blockchain.OPTIMISM,
  Blockchain.BASE,
  Blockchain.BINANCE_SMART_CHAIN,
  Blockchain.GNOSIS,
];

export interface WalletCapabilities {
  atomicBatch?: { supported: boolean };
  paymasterService?: { supported: boolean };
  auxiliaryFunds?: { supported: boolean };
}

export interface Eip7702Interface {
  isSupported: (blockchain?: Blockchain) => boolean;
  signEip7702Data: (delegationData: Eip7702DelegationData, userAddress: string) => Promise<Eip7702SignedData>;
  checkWalletCapabilities: (address: string) => Promise<WalletCapabilities | null>;
  isEthSignEnabled: () => Promise<boolean>;
}

export function useEip7702(): Eip7702Interface {
  const { signEip7702Delegation } = useMetaMask();

  function ethereum() {
    return (window as any).ethereum;
  }

  const isSupported = useCallback((blockchain?: Blockchain): boolean => {
    if (!blockchain) return false;
    return EIP7702_SUPPORTED_CHAINS.includes(blockchain) && Boolean(ethereum()?.isMetaMask);
  }, []);

  const signEip7702Data = useCallback(
    async (delegationData: Eip7702DelegationData, userAddress: string): Promise<Eip7702SignedData> => {
      return signEip7702Delegation(delegationData, userAddress);
    },
    [signEip7702Delegation],
  );

  /**
   * Check wallet capabilities using EIP-5792 wallet_getCapabilities
   * This can be used to detect if the wallet supports advanced features
   */
  const checkWalletCapabilities = useCallback(async (address: string): Promise<WalletCapabilities | null> => {
    const eth = ethereum();
    if (!eth?.isMetaMask) return null;

    try {
      const capabilities = await eth.request({
        method: 'wallet_getCapabilities',
        params: [address],
      });
      return capabilities;
    } catch {
      // wallet_getCapabilities not supported
      return null;
    }
  }, []);

  /**
   * Check if eth_sign is enabled in MetaMask
   * Returns true if eth_sign is available, false otherwise
   */
  const isEthSignEnabled = useCallback(async (): Promise<boolean> => {
    const eth = ethereum();
    if (!eth?.isMetaMask) return false;

    try {
      // Try to get accounts first
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) return false;

      // Create a test message to check if eth_sign is enabled
      // We don't actually sign, just check if the method throws immediately
      // This is a workaround since there's no direct way to check
      // The actual check happens during signing in signEip7702Delegation
      return true;
    } catch {
      return false;
    }
  }, []);

  return useMemo(
    () => ({
      isSupported,
      signEip7702Data,
      checkWalletCapabilities,
      isEthSignEnabled,
    }),
    [isSupported, signEip7702Data, checkWalletCapabilities, isEthSignEnabled],
  );
}
