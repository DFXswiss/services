import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
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
import { relativeUrl } from 'src/util/utils';

export function useRealunitApi() {
  const { call } = useApi();

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

  return useMemo(
    () => ({
      getAccountSummary,
      getAccountHistory,
      getHolders,
      getTokenInfo,
      getTokenPrice,
      getPriceHistory,
    }),
    [call],
  );
}
