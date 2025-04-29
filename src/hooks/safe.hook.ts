import { ApiError, Fiat, useApi, User, useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect, useState } from 'react';
import { useWalletContext } from 'src/contexts/wallet.context';

export enum FiatCurrency {
  CHF = 'CHF',
  EUR = 'EUR',
  USD = 'USD',
}

export interface CustodyAsset {
  name: string;
  description: string;
}

export interface CustodyAssetBalance {
  asset: CustodyAsset;
  balance: number;
  value: number;
}

export interface CustodyBalance {
  totalValue: number;
  currency: Fiat;
  balances: CustodyAssetBalance[];
}

export interface UseSafeResult {
  error: string | undefined;
  isInitialized: boolean;
  isLoading: boolean;
  currency: FiatCurrency;
  portfolio: CustodyAssetBalance[];
  totalValue: number;
}

export function useSafe(): UseSafeResult {
  const { call } = useApi();
  const { user, isUserLoading } = useUserContext();
  const { isLoggedIn } = useSessionContext();
  const { setSession } = useWalletContext();

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);
  const [portfolio, setPortfolio] = useState<CustodyAssetBalance[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);

  useEffect(() => {
    if (!isUserLoading && user && isLoggedIn) {
      createAccountIfRequired(user)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn]);

  useEffect(() => {
    if (!user || !isLoggedIn) return;

    setIsLoading(true);
    getBalances()
      .then(({ balances, currency, totalValue }) => {
        setPortfolio(balances);
        setCurrency(currency.name as FiatCurrency);
        setTotalValue(totalValue);
      })
      .catch((error: ApiError) => {
        setError(error.message ?? 'Unknown error');
      })
      .finally(() => setIsLoading(false));
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

  return {
    error,
    isInitialized,
    isLoading,
    currency,
    portfolio,
    totalValue,
  };
}
