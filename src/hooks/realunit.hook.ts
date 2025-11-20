import { useApi } from '@dfx.swiss/react';
import { useCallback, useMemo } from 'react';
import { useRealunitContext } from 'src/contexts/realunit.context';
import {
  AccountHistory,
  AccountSummary,
  HoldersResponse,
  PaginationDirection,
  PriceHistoryEntry,
  TokenInfo,
  TokenPrice,
} from 'src/dto/realunit.dto';
import { Timeframe } from 'src/util/chart';
import { relativeUrl } from '../util/utils';

export function useRealunit() {
  const { call } = useApi();
  const {
    setData,
    setHistory,
    setIsLoading,
    holders,
    setHolders,
    setTotalCount,
    setPageInfo,
    setTokenInfo,
    setTokenPrice,
    setPriceHistory,
    setLastTimeframe,
  } = useRealunitContext();

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

  async function getTokenPrice(): Promise<TokenPrice> {
    return call<TokenPrice>({
      url: 'realunit/price',
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
      getAccountSummary(address)
        .then((accountData) => {
          setData(accountData);
        })
        .finally(() => setIsLoading(false));
    },
    [setData, setIsLoading],
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
    (timeframe: Timeframe) => {
      getPriceHistory(timeframe).then((priceData) => {
        setPriceHistory(priceData);
        setLastTimeframe(timeframe);
      });
    },
    [setPriceHistory, setLastTimeframe],
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

  return useMemo(
    () => ({
      fetchAccountSummary,
      fetchAccountHistory,
      holders,
      fetchHolders,
      fetchTokenInfo,
      fetchTokenPrice,
      setTokenPrice,
      fetchPriceHistory,
    }),
    [
      fetchAccountSummary,
      fetchAccountHistory,
      holders,
      fetchHolders,
      fetchTokenInfo,
      fetchTokenPrice,
      setTokenPrice,
      fetchPriceHistory,
    ],
  );
}
