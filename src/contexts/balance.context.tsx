import { Asset, useAsset, useSessionContext } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/store.hook';

export interface AssetBalance {
  asset: Asset;
  amount: number;
}

interface Balance {
  asset: string;
  amount: number;
}

interface BalanceContextInterface {
  getBalances: (assets: Asset[]) => AssetBalance[];
  readBalances: (param?: string) => void;
  hasBalance: boolean;
}

const BalanceContext = createContext<BalanceContextInterface>(undefined as any);

export function useBalanceContext(): BalanceContextInterface {
  return useContext(BalanceContext);
}

export function BalanceContextProvider(props: PropsWithChildren): JSX.Element {
  const { balances: storeBalances } = useStore();
  const [balances, setBalances] = useState<Balance[]>();
  const { getAsset } = useAsset();
  const { isInitialized, isLoggedIn } = useSessionContext();

  useEffect(() => {
    if (!balances) readBalances(storeBalances.get());
  }, []);

  useEffect(() => {
    if (isInitialized && !isLoggedIn) readBalances(undefined);
  }, [isInitialized, isLoggedIn]);

  function isDefined<T>(balance: T | undefined): balance is T {
    return balance != null;
  }

  function readBalances(param?: string) {
    param ? storeBalances.set(param) : storeBalances.remove();
    setBalances(
      param
        ?.split(',')
        .map((balance) => {
          const split = balance.split('@');
          if (split.length !== 2) return undefined;

          return { asset: split[1], amount: +split[0] };
        })
        .filter(isDefined),
    );
  }

  function getBalances(assets: Asset[]): AssetBalance[] {
    return assets
      .map((asset) => {
        const amount = balances?.find((b) => getAsset(assets, b.asset)?.id === asset.id)?.amount;
        return amount ? { asset, amount } : undefined;
      })
      .filter(isDefined);
  }

  const context = useMemo(
    () => ({
      getBalances,
      readBalances,
      hasBalance: balances?.some((balance) => balance.amount > 0) ?? false,
    }),
    [balances],
  );

  return <BalanceContext.Provider value={context}>{props.children}</BalanceContext.Provider>;
}
