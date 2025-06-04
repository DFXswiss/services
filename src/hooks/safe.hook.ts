import { ApiError, useApi, useAuthContext, User, useSessionContext, useUserContext } from '@dfx.swiss/react';
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
  isLoadingPortfolio: boolean;
  isLoadingHistory: boolean;
  portfolio: CustodyBalance;
  history: CustodyHistoryEntry[];
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
  const { isLoggedIn } = useSessionContext();
  const { setSession } = useWalletContext();
  const { setWallet } = useWalletContext();
  const { session } = useAuthContext();
  const { user, isUserLoading, changeAddress } = useUserContext();

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [portfolio, setPortfolio] = useState<CustodyBalance>({ totalValue: { chf: 0, eur: 0, usd: 0 }, balances: [] });
  const [history, setHistory] = useState<CustodyHistoryEntry[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (!isUserLoading && session && user && isLoggedIn) {
      createCustodyAccountOrSwitch(user)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn, session]);

  useEffect(() => {
    if (isInitialized) return;

    setIsLoadingPortfolio(true);
    getBalances()
      .then((portfolio) => setPortfolio(portfolio))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoadingPortfolio(false));
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) return;

    setIsLoadingHistory(true);
    getHistory()
      .then(({ totalValue }) => setHistory(totalValue))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoadingHistory(false));
  }, [isInitialized]);

  async function createCustodyAccountOrSwitch(user: User): Promise<void> {
    const custodyAddress = user.addresses.find((a) => a.isCustody);
    if (!custodyAddress) {
      return call<{ accessToken: string }>({
        url: 'custody',
        method: 'POST',
        data: { addressType: 'EVM' },
      }).then(({ accessToken }) => setSession(accessToken));
    } else if (session?.address !== custodyAddress.address) {
      return changeAddress(custodyAddress.address).then(() => setWallet());
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
    isLoadingPortfolio,
    isLoadingHistory,
    portfolio,
    history,
    error,
  };
}
