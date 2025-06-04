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
import { SignIn } from '@dfx.swiss/react/dist/definitions/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustodyOrderType, OrderPaymentInfo } from 'src/dto/order.dto';
import { CustodyAsset, CustodyBalance, CustodyHistory, CustodyHistoryEntry } from 'src/dto/safe.dto';
import { OrderFormData } from './order.hook';

const DEPOSIT_PAIRS: Record<string, string> = {
  EUR: 'dEURO',
  CHF: 'ZCHF',
};

export interface UseSafeResult {
  isInitialized: boolean;
  isLoadingPortfolio: boolean;
  isLoadingHistory: boolean;
  portfolio: CustodyBalance;
  history: CustodyHistoryEntry[];
  error?: string;
  availableCurrencies?: Fiat[];
  availableAssets?: CustodyAsset[];
  fetchPaymentInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  confirmPayment: () => Promise<void>;
  pairMap: (asset: string) => Asset | undefined;
}

export function useSafe(): UseSafeResult {
  const { call } = useApi();
  const { currencies } = useBuy();
  const { session } = useAuthContext();
  const { changeUserAddress } = useUser();
  const { getAssets } = useAssetContext();
  const { user, isUserLoading } = useUserContext();
  const { isLoggedIn, tokenStore } = useSessionContext();

  const currentOrderId = useRef<number>();

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [portfolio, setPortfolio] = useState<CustodyBalance>({ totalValue: { chf: 0, eur: 0, usd: 0 }, balances: [] });
  const [history, setHistory] = useState<CustodyHistoryEntry[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // ---- Safe Screen Initialization ----

  useEffect(() => {
    if (!isUserLoading && session && user && isLoggedIn) {
      createCustodyOrSwitch(user)
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

  // ---- Available Deposit Pairs ----

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => Object.keys(DEPOSIT_PAIRS).includes(c.name));
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
      Object.values(DEPOSIT_PAIRS).includes(a.name),
    );
  }, [getAssets]);

  const pairMap = useCallback(
    (asset: string) => availableAssets?.find((a) => a.name === DEPOSIT_PAIRS[asset]),
    [availableAssets],
  );

  // ---- Custody Token Management ----

  async function createCustodyOrSwitch(user: User): Promise<void> {
    const custodyAddress = user.addresses.find((a) => a.isCustody);
    if (!custodyAddress) {
      return createCustodyUser().then(({ accessToken }) => tokenStore.set('custody', accessToken));
    } else if (!tokenStore.get('custody') && session?.address !== custodyAddress.address) {
      const custodyToken = (await changeUserAddress(custodyAddress.address)).accessToken;
      tokenStore.set('custody', custodyToken);
    }
  }

  // ---- API Calls ----

  async function createCustodyUser(): Promise<SignIn> {
    return call<SignIn>({
      url: 'custody',
      method: 'POST',
      data: { addressType: 'EVM' },
    });
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

  async function fetchPaymentInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.DEPOSIT,
        sourceAsset: data.sourceAsset.name,
        targetAsset: DEPOSIT_PAIRS[data.sourceAsset.name],
        sourceAmount: Number(data.sourceAmount),
        paymentMethod: data.paymentMethod,
      },
      token: tokenStore.get('custody'),
    });

    currentOrderId.current = order.orderId;
    return order;
  }

  async function confirmPayment(): Promise<void> {
    if (!currentOrderId.current) return;

    await call({
      url: `custody/order/${currentOrderId.current}/confirm`,
      method: 'POST',
      token: tokenStore.get('custody'),
    }).then(() => (currentOrderId.current = undefined));
  }

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
      fetchPaymentInfo,
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
      fetchPaymentInfo,
      confirmPayment,
    ],
  );
}
