import {
  ApiError,
  Asset,
  Blockchain,
  Fiat,
  useApi,
  useAssetContext,
  useAuthContext,
  useBuy,
  User,
  useSessionContext,
  useUser,
  useUserContext,
} from '@dfx.swiss/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustodyOrderType, OrderPaymentInfo } from 'src/dto/order.dto';
import { OrderFormData } from './order.hook';

export enum FiatCurrency {
  CHF = 'chf',
  EUR = 'eur',
  USD = 'usd',
}

const PAIRS: Record<string, string> = {
  EUR: 'dEURO',
  CHF: 'ZCHF',
};

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

export interface UseSafeResult {
  isInitialized: boolean;
  isLoadingPortfolio: boolean;
  isLoadingHistory: boolean;
  portfolio: CustodyBalance;
  history: CustodyHistoryEntry[];
  error?: string;
  availableCurrencies?: Fiat[];
  availableAssets?: CustodyAsset[];
  onFetchPaymentInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  confirmPayment: () => Promise<void>;
  pairMap: (asset: string) => Asset | undefined;
}

export function useSafe(): UseSafeResult {
  const { call } = useApi();
  const { currencies } = useBuy();
  const { changeUserAddress } = useUser();
  const { getAssets } = useAssetContext();
  const { isLoggedIn } = useSessionContext();
  const { session } = useAuthContext();
  const { tokenStore } = useSessionContext();

  const { user, isUserLoading } = useUserContext();

  const currentOrderId = useRef<number>();

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
      }).then(({ accessToken }) => tokenStore.set('custody', accessToken));
    } else if (session?.address !== custodyAddress.address && !tokenStore.get('custody')) {
      const custodyToken = (await changeUserAddress(custodyAddress.address)).accessToken;
      tokenStore.set('custody', custodyToken);
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

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => Object.keys(PAIRS).includes(c.name)) || [];
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
      Object.values(PAIRS).includes(a.name),
    );
  }, [getAssets]);

  async function onFetchPaymentInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.DEPOSIT,
        sourceAsset: data.sourceAsset.name,
        targetAsset: PAIRS[data.sourceAsset.name],
        sourceAmount: Number(data.sourceAmount),
        paymentMethod: data.paymentMethod,
      },
      token: tokenStore.get('custody'),
    });

    currentOrderId.current = order.orderId;
    return order;
  }

  async function confirmPayment(): Promise<void> {
    await call({
      url: `custody/order/${currentOrderId.current}/confirm`,
      method: 'POST',
      token: tokenStore.get('custody'),
    });
  }

  const pairMap = useCallback(
    (asset: string) => {
      return availableAssets?.find((a) => a.name === PAIRS[asset]);
    },
    [availableAssets],
  );

  return useMemo<UseSafeResult>(
    () => ({
      isInitialized,
      isLoadingPortfolio,
      isLoadingHistory,
      portfolio,
      history,
      error,
      availableCurrencies,
      availableAssets,
      onFetchPaymentInfo,
      confirmPayment,
      pairMap,
    }),
    [
      isInitialized,
      isLoadingPortfolio,
      isLoadingHistory,
      portfolio,
      history,
      error,
      availableCurrencies,
      availableAssets,
      onFetchPaymentInfo,
      confirmPayment,
    ],
  );
}
