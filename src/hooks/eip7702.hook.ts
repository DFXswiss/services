import { Blockchain, Eip7702DelegationData, Eip7702SignedData } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useMetaMask } from './wallets/metamask.hook';

export interface Eip7702Interface {
  isSupported: (blockchain?: Blockchain) => boolean;
  signEip7702Data: (delegationData: Eip7702DelegationData, userAddress: string) => Promise<Eip7702SignedData>;
}

export function useEip7702(): Eip7702Interface {
  const { signEip7702Delegation } = useMetaMask();

  function ethereum() {
    return (window as any).ethereum;
  }

  function isSupported(blockchain?: Blockchain): boolean {
    const supportedChains = [Blockchain.ETHEREUM, Blockchain.POLYGON, Blockchain.ARBITRUM, Blockchain.BASE];
    if (!blockchain) return false;
    return supportedChains.includes(blockchain) && Boolean(ethereum()?.isMetaMask);
  }

  async function signEip7702Data(
    delegationData: Eip7702DelegationData,
    userAddress: string,
  ): Promise<Eip7702SignedData> {
    return signEip7702Delegation(delegationData, userAddress);
  }

  return useMemo(
    () => ({
      isSupported,
      signEip7702Data,
    }),
    [signEip7702Delegation],
  );
}
