import { ApiError, useApi } from '@dfx.swiss/react';
import { useCallback, useMemo, useState } from 'react';
import { relativeUrl } from '../util/utils';

export interface HistoricalBalance {
  balance: string;
  timestamp: string;
  valueChf?: number;
}

export interface AccountSummary {
  address: string;
  addressType: number;
  balance: string;
  lastUpdated: string;
  historicalBalances?: HistoricalBalance[];
}

export interface HistoryEvent {
  timestamp: string;
  eventType: string;
  txHash: string;
  addressTypeUpdate?: {
    addressType: string;
  };
  approval?: {
    spender: string;
    value: string;
  };
  tokensDeclaredInvalid?: {
    amount: string;
    message: string;
  };
  transfer?: {
    from: string;
    to: string;
    value: string;
  };
}

export interface AccountHistory {
  address: string;
  addressType: number;
  history: HistoryEvent[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface Holder {
  address: string;
  balance: string;
  percentage: number;
}

export interface TotalShares {
  total: string;
  timestamp: string;
  txHash: string;
}

export interface TotalSupply {
  value: string;
  timestamp: string;
}

export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
}

export interface HoldersResponse {
  totalShares: TotalShares;
  totalSupply: TotalSupply;
  holders: Holder[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface PriceHistoryEntry {
  timestamp: string;
  chf: number;
  eur: number;
  usd: number;
}

export enum PaginationDirection {
  NEXT = 'next',
  PREV = 'prev',
}

export function useRealunit() {
  const { call } = useApi();

  const [data, setData] = useState<AccountSummary>();
  const [history, setHistory] = useState<AccountHistory>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string>();

  const [holders, setHolders] = useState<Holder[]>([]);
  const [totalShares, setTotalShares] = useState<TotalShares>();
  const [totalSupply, setTotalSupply] = useState<TotalSupply>();
  const [totalCount, setTotalCount] = useState<number>();
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: '',
    endCursor: '',
  });
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const [holdersError, setHoldersError] = useState<string>();

  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
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
    cursor && direction && params.set(String(direction) === 'prev' ? 'startCursor' : 'after', cursor);

    return call<HoldersResponse>({
      url: relativeUrl({ path: 'realunit/holders', params }),
      method: 'GET',
    });
  }

  async function getPriceHistory(timeFrame: string): Promise<PriceHistoryEntry[]> {
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
      setIsLoadingHolders(true);
      setHoldersError(undefined);
      getHolders(cursor, direction)
        .then((data) => {
          setHolders(data.holders);
          setPageInfo(data.pageInfo);
          if (!cursor) {
            setTotalShares(data.totalShares);
            setTotalSupply(data.totalSupply);
            setTotalCount(data.totalCount);
          }
        })
        .catch((error: ApiError) => setHoldersError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoadingHolders(false));
    },
    [call],
  );

  const fetchPriceHistory = useCallback(
    (timeFrame: string) => {
      setIsLoadingPriceHistory(true);
      setPriceHistoryError(undefined);
      getPriceHistory(timeFrame)
        .then((data) => setPriceHistory(data))
        .catch((error: ApiError) => setPriceHistoryError(error.message ?? 'Unknown error'))
        .finally(() => setIsLoadingPriceHistory(false));
    },
    [call],
  );

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
      totalShares,
      totalSupply,
      totalCount,
      pageInfo,
      isLoadingHolders,
      holdersError,
      fetchHolders,
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
      totalShares,
      totalSupply,
      totalCount,
      pageInfo,
      isLoadingHolders,
      holdersError,
      fetchHolders,
      priceHistory,
      isLoadingPriceHistory,
      priceHistoryError,
      fetchPriceHistory,
    ],
  );
}

