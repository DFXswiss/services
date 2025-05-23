import { ApiError, useApi, User, useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect, useState } from 'react';
import { useWalletContext } from 'src/contexts/wallet.context';

export enum FiatCurrency {
  CHF = 'chf',
  EUR = 'eur',
  USD = 'usd',
}

export interface CustodyAsset {
  name: string;
  description: string;
}

export interface CustodyAssetBalance {
  asset: CustodyAsset;
  balance: number;
  value: CustodyFiatValue;
}

export interface CustodyBalance {
  totalValue: CustodyFiatValue;
  balances: CustodyAssetBalance[];
}

export interface UseSafeResult {
  isInitialized: boolean;
  totalValue: CustodyFiatValue;
  portfolio: CustodyAssetBalance[];
  history: CustodyHistoryEntry[];
  isLoadingPortfolio: boolean;
  isLoadingHistory: boolean;
  error?: string;
}

export interface CustodyFiatValue {
  chf: number;
  eur: number;
  usd: number;
}

export interface CustodyHistoryEntry {
  date: string;
  value: CustodyFiatValue;
}

export interface CustodyHistory {
  totalValue: CustodyHistoryEntry[];
}

export function useSafe(): UseSafeResult {
  const { call } = useApi();
  const { user, isUserLoading } = useUserContext();
  const { isLoggedIn } = useSessionContext();
  const { setSession } = useWalletContext();

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [totalValue, setTotalValue] = useState<CustodyFiatValue>({ chf: 0, eur: 0, usd: 0 });
  const [portfolio, setPortfolio] = useState<CustodyAssetBalance[]>([]);
  const [history, setHistory] = useState<CustodyHistoryEntry[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!isUserLoading && user && isLoggedIn) {
      createAccountIfRequired(user)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn]);

  useEffect(() => {
    if (!user || !isLoggedIn) return;

    setIsLoadingPortfolio(true);
    getBalances()
      .then(({ balances, totalValue }) => {
        setPortfolio(balances);
        setTotalValue(totalValue);
      })
      .catch((error: ApiError) => {
        setError(error.message ?? 'Unknown error');
      })
      .finally(() => setIsLoadingPortfolio(false));
  }, [user, isLoggedIn]);

  useEffect(() => {
    if (!user || !isLoggedIn) return;

    setIsLoadingHistory(true);
    getHistory()
      .then(({ totalValue }) => {
        setHistory(totalValue);
      })
      .catch((error: ApiError) => {
        setError(error.message ?? 'Unknown error');
      })
      .finally(() => setIsLoadingHistory(false));
  }, [user, isLoggedIn]);

  async function createAccountIfRequired(user: User): Promise<void> {
    if (!user.addresses.some((a) => a.isCustody)) {
      return call<{ accessToken: string }>({
        url: 'custody',
        method: 'POST',
        data: {
          addressType: 'EVM',
        },
      }).then(({ accessToken }) => setSession(accessToken));
    }
  }

  async function getBalances(): Promise<CustodyBalance> {
    return call<CustodyBalance>({
      url: `custody`,
      method: 'GET',
    });
  }

  async function getHistory(): Promise<CustodyHistory> {
    return call<CustodyHistory>({
      url: `custody/history`,
      method: 'GET',
    });
  }

  return {
    isInitialized,
    portfolio,
    history,
    totalValue,
    isLoadingPortfolio,
    isLoadingHistory,
    error,
  };
}
