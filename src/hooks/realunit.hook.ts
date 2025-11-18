import { useApi } from '@dfx.swiss/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRealunitContext } from 'src/contexts/realunit.context';
import {
  AccountHistory,
  AccountSummary,
  Holder,
  HoldersResponse,
  PageInfo,
  PaginationDirection,
  PriceHistoryEntry,
  RealunitContextData,
  TokenInfo,
} from 'src/dto/realunit.dto';
import { Timeframe } from 'src/util/chart';
import { relativeUrl } from '../util/utils';

export function useRealunit() {
  const { call } = useApi();
  const { cachedData, setCachedData } = useRealunitContext();
  const lastTimeframeRef = useRef<Timeframe | undefined>(cachedData.lastTimeframe as Timeframe);

  const [data, setData] = useState<AccountSummary>();
  const [history, setHistory] = useState<AccountHistory>();
  const [isLoading, setIsLoading] = useState(false);

  const [holders, setHolders] = useState<Holder[]>(cachedData.holders || []);
  const [totalCount, setTotalCount] = useState<number | undefined>(cachedData.totalCount);
  const [pageInfo, setPageInfo] = useState<PageInfo>(
    cachedData.pageInfo || {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: '',
      endCursor: '',
    },
  );
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>(cachedData.tokenInfo);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(cachedData.priceHistory || []);

  async function getAccountSummary(address: string): Promise<AccountSummary> {
    return call<AccountSummary>({
      url: `realunit/account/${address}`,
      method: 'GET',
    });
  }

  async function getAccountHistory(
    address: string,
    cursor?: string,
    direction?: PaginationDirection,
  ): Promise<AccountHistory> {
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
      const cached = cachedData.lastAddress === address.toLowerCase() ? cachedData.lastAccountData : undefined;
      if (cached) {
        setData(cached);
        return;
      }
      setIsLoading(true);
      getAccountSummary(address)
        .then((data) => {
          setData(data);
          setCachedData((prev: RealunitContextData) => ({
            ...prev,
            lastAddress: address.toLowerCase(),
            lastAccountData: data,
          }));
        })
        .finally(() => setIsLoading(false));
    },
    [cachedData.lastAddress, cachedData.lastAccountData, setCachedData],
  );

  const fetchAccountHistory = useCallback(
    (address: string, cursor?: string, direction?: PaginationDirection) => {
      const cached = cachedData.lastAddress === address.toLowerCase() ? cachedData.lastAccountHistory : undefined;
      if (!cursor && cached) {
        setHistory(cached);
        return;
      }
      getAccountHistory(address, cursor, direction).then((history) => {
        setHistory(history);
        if (!cursor) {
          setCachedData((prev: RealunitContextData) => ({
            ...prev,
            lastAddress: address.toLowerCase(),
            lastAccountHistory: history,
          }));
        }
      });
    },
    [cachedData.lastAddress, cachedData.lastAccountHistory, setCachedData],
  );

  const fetchHolders = useCallback(
    (cursor?: string, direction?: PaginationDirection) => {
      if (!cursor && holders.length > 0) {
        return;
      }
      getHolders(cursor, direction).then((data) => {
        setHolders(data.holders);
        setPageInfo(data.pageInfo);
        const newTotalCount = !cursor ? data.totalCount : totalCount;
        if (!cursor) {
          setTotalCount(data.totalCount);
        }
        setCachedData((prev: RealunitContextData) => ({
          ...prev,
          holders: data.holders,
          totalCount: newTotalCount,
          pageInfo: data.pageInfo,
        }));
      });
    },
    [holders.length, totalCount, setCachedData],
  );

  const fetchPriceHistory = useCallback(
    (timeframe: Timeframe) => {
      if (lastTimeframeRef.current === timeframe && priceHistory.length > 0) return;
      lastTimeframeRef.current = timeframe;
      getPriceHistory(timeframe).then((data) => {
        setPriceHistory(data);
        setCachedData((prev: RealunitContextData) => ({
          ...prev,
          priceHistory: data,
          lastTimeframe: timeframe,
        }));
      });
    },
    [priceHistory.length, setCachedData],
  );

  const fetchTokenInfo = useCallback(() => {
    if (tokenInfo) {
      return;
    }
    getTokenInfo().then((data) => {
      setTokenInfo(data);
      setCachedData((prev: RealunitContextData) => ({ ...prev, tokenInfo: data }));
    });
  }, [tokenInfo, setCachedData]);

  return useMemo(
    () => ({
      data,
      history,
      isLoading,
      fetchAccountSummary,
      fetchAccountHistory,
      holders,
      totalCount,
      pageInfo,
      fetchHolders,
      fetchTokenInfo,
      tokenInfo,
      priceHistory,
      fetchPriceHistory,
      lastTimeframe: cachedData.lastTimeframe,
    }),
    [
      data,
      history,
      isLoading,
      fetchAccountSummary,
      fetchAccountHistory,
      holders,
      totalCount,
      pageInfo,
      fetchHolders,
      fetchTokenInfo,
      tokenInfo,
      priceHistory,
      fetchPriceHistory,
      cachedData.lastTimeframe,
    ],
  );
}
