import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  AccountHistory,
  AccountSummary,
  Holder,
  PageInfo,
  PaginationDirection,
  PriceHistoryEntry,
  RealunitContextInterface,
  TokenInfo,
  TokenPrice,
} from 'src/dto/realunit.dto';
import { useRealunitApi } from 'src/hooks/realunit-api.hook';
import { Timeframe } from 'src/util/chart';

const RealunitContext = createContext<RealunitContextInterface>(undefined as any);

export function useRealunitContext(): RealunitContextInterface {
  return useContext(RealunitContext);
}

export function RealunitContextProvider({ children }: PropsWithChildren): JSX.Element {
  const [accountSummary, setAccountSummary] = useState<AccountSummary | undefined>();
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
  const [tokenPrice, setTokenPrice] = useState<TokenPrice | undefined>();
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ALL);

  const { getAccountSummary, getAccountHistory, getHolders, getPriceHistory, getTokenInfo, getTokenPrice } =
    useRealunitApi();

  const fetchAccountSummary = useCallback(
    (address: string) => {
      setIsLoading(true);
      getAccountSummary(address)
        .then((accountData) => {
          setAccountSummary(accountData);
        })
        .finally(() => setIsLoading(false));
    },
    [setAccountSummary, setIsLoading],
  );

  const fetchAccountHistory = useCallback(
    (address: string, cursor?: string, direction?: PaginationDirection) => {
      getAccountHistory(address, cursor, direction).then((accountHistory) => {
        setHistory(accountHistory);
      });
    },
    [setHistory],
  );

  const fetchHolders = useCallback(
    (cursor?: string, direction?: PaginationDirection) => {
      if (!cursor && holders.length > 0) {
        return;
      }
      getHolders(cursor, direction).then((holdersData) => {
        setHolders(holdersData.holders);
        setPageInfo(holdersData.pageInfo);
        if (!cursor) {
          setTotalCount(holdersData.totalCount);
        }
      });
    },
    [holders.length, setHolders, setPageInfo, setTotalCount],
  );

  const fetchPriceHistory = useCallback(
    (timeframe = Timeframe.ALL) => {
      getPriceHistory(timeframe).then((priceData) => {
        setPriceHistory(priceData);
        setTimeframe(timeframe);
      });
    },
    [setPriceHistory, setTimeframe],
  );

  const fetchTokenInfo = useCallback(() => {
    getTokenInfo().then((tokenData) => {
      setTokenInfo(tokenData);
    });
  }, [setTokenInfo]);

  const fetchTokenPrice = useCallback(() => {
    getTokenPrice().then((tokenPrice) => {
      setTokenPrice(tokenPrice);
    });
  }, [setTokenPrice]);

  const context = useMemo(
    () => ({
      accountSummary,
      history,
      isLoading,
      holders,
      totalCount,
      pageInfo,
      tokenInfo,
      tokenPrice,
      priceHistory,
      timeframe,
      fetchAccountSummary,
      fetchAccountHistory,
      fetchHolders,
      fetchTokenInfo,
      fetchPriceHistory,
      fetchTokenPrice,
    }),
    [
      accountSummary,
      history,
      isLoading,
      holders,
      totalCount,
      pageInfo,
      tokenInfo,
      tokenPrice,
      priceHistory,
      timeframe,
      fetchAccountSummary,
      fetchAccountHistory,
      fetchHolders,
      fetchTokenInfo,
      fetchTokenPrice,
      fetchPriceHistory,
    ],
  );

  return <RealunitContext.Provider value={context}>{children}</RealunitContext.Provider>;
}
