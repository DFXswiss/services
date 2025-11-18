import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import {
  AccountHistory,
  AccountSummary,
  Holder,
  PageInfo,
  PriceHistoryEntry,
  RealunitContextInterface,
  TokenInfo,
} from 'src/dto/realunit.dto';

const RealunitContext = createContext<RealunitContextInterface>(undefined as any);

export function useRealunitContext(): RealunitContextInterface {
  return useContext(RealunitContext);
}

export function RealunitContextProvider({ children }: PropsWithChildren): JSX.Element {
  const [data, setData] = useState<AccountSummary | undefined>();
  const [history, setHistory] = useState<AccountHistory | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>();
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: '',
    endCursor: '',
  });
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>();
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [lastTimeframe, setLastTimeframe] = useState<string | undefined>();

  const context = useMemo(
    () => ({
      data,
      setData,
      history,
      setHistory,
      isLoading,
      setIsLoading,
      holders,
      setHolders,
      totalCount,
      setTotalCount,
      pageInfo,
      setPageInfo,
      tokenInfo,
      setTokenInfo,
      priceHistory,
      setPriceHistory,
      lastTimeframe,
      setLastTimeframe,
    }),
    [data, history, isLoading, holders, totalCount, pageInfo, tokenInfo, priceHistory, lastTimeframe],
  );

  return <RealunitContext.Provider value={context}>{children}</RealunitContext.Provider>;
}
