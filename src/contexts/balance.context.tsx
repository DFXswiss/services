import { Asset, useAsset } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/store.hook';
import { isDefined } from '../util/utils';

export interface AssetBalance {
  asset: Asset;
  amount: number;
}

interface Balance {
  asset: string;
  amount: number;
}

interface BalanceContextInterface {
  getBalances: (assets: Asset[]) => AssetBalance[] | undefined;
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

  useEffect(() => {
    if (!balances) readBalances(storeBalances.get());
  }, []);

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

  function getBalances(assets: Asset[]): AssetBalance[] | undefined {
    if (!balances) return undefined;

    return assets
      .map((asset) => {
        const amount = balances.find((b) => getAsset(assets, b.asset)?.id === asset.id)?.amount;
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
