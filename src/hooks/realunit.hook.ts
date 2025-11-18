import { ApiError, useApi } from '@dfx.swiss/react';
import { useCallback, useMemo, useState } from 'react';
import { useRealunitContext } from 'src/contexts/realunit.context';
import {
  AccountHistory,
  AccountSummary,
  Holder,
  HoldersResponse,
  PageInfo,
  PaginationDirection,
  PriceHistoryEntry,
  TokenInfo
} from 'src/dto/realunit.dto';
import { Timeframe } from 'src/util/chart';
import { relativeUrl } from '../util/utils';

export function useRealunit() {
  const { call } = useApi();
  const { cachedData, setCachedData } = useRealunitContext();
  
  const [data, setData] = useState<AccountSummary>();
  const [history, setHistory] = useState<AccountHistory>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string>();

  const [holders, setHolders] = useState<Holder[]>(cachedData?.holders || []);
  const [totalCount, setTotalCount] = useState<number | undefined>(cachedData?.totalCount);
  const [pageInfo, setPageInfo] = useState<PageInfo>(cachedData?.pageInfo || {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: '',
    endCursor: '',
  });
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const [holdersError, setHoldersError] = useState<string>();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>(cachedData?.tokenInfo);

  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false);
  const [tokenInfoError, setTokenInfoError] = useState<string>();

  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(cachedData?.priceHistory || []);
  const [isLoadingPriceHistory, setIsLoadingPriceHistory] = useState(false);
  const [priceHistoryError, setPriceHistoryError] = useState<string>();

  async function getAccountSummary(address: string): Promise<AccountSummary> {
    return call<AccountSummary>({
      url: `realunit/account/${address}`,
      method: 'GET',
    });
  }

  async function getAccountHistory(address: string, cursor?: string, direction?: PaginationDirection): Promise<AccountHistory> {
    const params = new URLSearchParams();
    cursor && direction && params.set(String(direction) === 'prev' ? 'before' : 'after', cursor);

    return call<AccountHistory>({
      url: relativeUrl({ path: `realunit/account/${address}/history`, params }),
      method: 'GET',
    });
  }

  async function getHolders(cursor?: string, direction?: PaginationDirection): Promise<HoldersResponse> {
    const params = new URLSearchParams();
    cursor && direction && params.set(String(direction) === 'prev' ? 'before' : 'after', cursor);
  
    return call<HoldersResponse>({
      url: relativeUrl({ path: 'realunit/holders', params }),
      method: 'GET',
    });
  }

  async function getTokenInfo(): Promise<TokenInfo> {
    return call<TokenInfo>({
      url: 'realunit/tokenInfo',
      method: 'GET',
    });
  }
  async function getPriceHistory(timeFrame: Timeframe): Promise<PriceHistoryEntry[]> {
    const params = new URLSearchParams();
    params.set('timeFrame', timeFrame.toUpperCase());

    return call<PriceHistoryEntry[]>({
      url: relativeUrl({ path: 'realunit/price/history', params }),
      method: 'GET',
    });
  }

  const fetchAccountSummary = useCallback(
    (address: string) => {
      setIsLoading(true);
      setError(undefined);
      getAccountSummary(address)
        .then((accountData) => setData(accountData))
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoading(false));
    },
    [call],
  );

  const fetchAccountHistory = useCallback(
    (address: string, cursor?: string, direction?: PaginationDirection) => {
      setIsLoadingHistory(true);
      setError(undefined);
      getAccountHistory(address, cursor, direction)
        .then((historyData) => setHistory(historyData))
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoadingHistory(false));
    },
    [call],
  );

  const fetchHolders = useCallback(
    (cursor?: string, direction?: PaginationDirection) => {
      if (!cursor && holders.length > 0) {
        return;
      }

      setIsLoadingHolders(true);
      setHoldersError(undefined);
      getHolders(cursor, direction)
        .then((data) => {
          setHolders(data.holders);
          setPageInfo(data.pageInfo);
          const newTotalCount = !cursor ? data.totalCount : totalCount;
          if (!cursor) {
            setTotalCount(data.totalCount);
          }
   
          setCachedData({
            holders: data.holders,
            totalCount: newTotalCount,
            pageInfo: data.pageInfo,
            tokenInfo,
          });
        })
        .catch((error: ApiError) => setHoldersError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoadingHolders(false));
    },
    [call, holders.length, totalCount, tokenInfo, setCachedData],
  );

  const fetchPriceHistory = useCallback(
    (timeFrame: Timeframe) => {
      setIsLoadingPriceHistory(true);
      setPriceHistoryError(undefined);
      getPriceHistory(timeFrame)
        .then((data) => {
          setPriceHistory(data);
          
          setCachedData({
            holders,
            totalCount,
            pageInfo,
            tokenInfo,
            priceHistory: data,  
          });
        })
        .catch((error: ApiError) => setPriceHistoryError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoadingPriceHistory(false));
    },
    [call, holders, totalCount, pageInfo, tokenInfo, setCachedData],
  );

  const fetchTokenInfo = useCallback(() => {
   if (tokenInfo) {
      return;
    }

    setIsLoadingTokenInfo(true);
    setTokenInfoError(undefined);
    getTokenInfo()
      .then((data) => {
        setTokenInfo(data);
        
        setCachedData({
          holders,
          totalCount,
          pageInfo,
          tokenInfo: data,
        });
      })
      .catch((error: ApiError) => setTokenInfoError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoadingTokenInfo(false));
  }, [call, tokenInfo, holders, totalCount, pageInfo, setCachedData]);

  return useMemo(
    () => ({
      data,
      history,
      isLoading,
      isLoadingHistory,
      error,
      fetchAccountSummary,
      fetchAccountHistory,
      holders,
      totalCount,
      pageInfo,
      isLoadingHolders,
      holdersError,
      fetchHolders,
      fetchTokenInfo,
      tokenInfo,
      isLoadingTokenInfo,
      tokenInfoError,
      priceHistory,
      isLoadingPriceHistory,
      priceHistoryError,
      fetchPriceHistory,
    }),
    [
      data,
      history,
      isLoading,
      isLoadingHistory,
      error,
      fetchAccountSummary,
      fetchAccountHistory,
      holders,
      totalCount,
      pageInfo,
      isLoadingHolders,
      holdersError,
      fetchHolders,
      fetchTokenInfo,
      tokenInfo,
      isLoadingTokenInfo,
      tokenInfoError,
      priceHistory,
      isLoadingPriceHistory,
      priceHistoryError,
      fetchPriceHistory,
    ],
  );
}

