import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/store.hook';

export interface TokenBalance {
  token: string;
  amount: string;
}

interface BalanceContextInterface {
  balances?: TokenBalance[];
  readBalances: (param: string) => void;
  hasBalance: boolean;
}

const BalanceContext = createContext<BalanceContextInterface>(undefined as any);

export function useBalanceContext(): BalanceContextInterface {
  return useContext(BalanceContext);
}

export function BalanceContextProvider(props: PropsWithChildren): JSX.Element {
  const { balances: storeBalances } = useStore();
  const [balances, setBalances] = useState<TokenBalance[]>();

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
          if (split.length !== 2) return { token: '', amount: '' };
          return { token: split[1], amount: split[0] };
        })
        .filter((balance) => balance.token.length > 0),
    );
  }

  const context = useMemo(
    () => ({
      balances,
      readBalances,
      hasBalance: balances?.find((balance) => +balance.amount > 0) !== undefined,
    }),
    [balances],
  );

  return <BalanceContext.Provider value={context}>{props.children}</BalanceContext.Provider>;
}
