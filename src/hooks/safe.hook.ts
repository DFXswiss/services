import {
  ApiError,
  Asset,
  Blockchain,
  Fiat,
  SignIn,
  useApi,
  useAssetContext,
  useAuthContext,
  useBuy,
  useSessionContext,
  useUser,
  useUserContext,
} from '@dfx.swiss/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CustodyOrderHistory, CustodyOrderType, OrderPaymentInfo } from 'src/dto/order.dto';
import { CustodyAccount, CustodyAsset, CustodyBalance, CustodyHistory, CustodyHistoryEntry } from 'src/dto/safe.dto';
import { downloadPdfFromString } from 'src/util/utils';
import { OrderFormData } from './order.hook';

const DEPOSIT_PAIRS: Record<string, string> = {
  EUR: 'dEURO',
  CHF: 'ZCHF',
};

const WITHDRAW_PAIRS: Record<string, string> = Object.entries(DEPOSIT_PAIRS).reduce(
  (acc, [fiat, custody]) => ({ ...acc, [custody]: fiat }),
  {},
);

/** Stable identity for an account, including the legacy Safe, whose id is null. */
function accountKey(account: CustodyAccount): string {
  return account.id === null ? 'legacy' : String(account.id);
}

export interface SendOrderFormData {
  asset: Asset;
  amount?: string;
  targetAmount?: string;
  address: string;
}

export interface PdfDownloadParams {
  date: string;
  currency: 'CHF' | 'EUR' | 'USD';
}

export interface UseSafeResult {
  isInitialized: boolean;
  isLoadingPortfolio: boolean;
  isLoadingHistory: boolean;
  isLoadingOrderHistory: boolean;
  portfolio: CustodyBalance;
  history: CustodyHistoryEntry[];
  orderHistory: CustodyOrderHistory[];
  error?: string;
  custodyAddress?: string;
  custodyBlockchains?: Blockchain[];
  availableCurrencies?: Fiat[];
  availableAssets?: CustodyAsset[];
  receiveableAssets?: Asset[];
  withdrawableAssets?: Asset[];
  withdrawableCurrencies?: Fiat[];
  sendableAssets?: Asset[];
  swappableSourceAssets?: Asset[];
  swappableTargetAssets?: Asset[];
  custodyAccounts: CustodyAccount[];
  selectedAccount?: CustodyAccount;
  isAccountsLoaded: boolean;
  selectAccount: (account: CustodyAccount) => void;
  setSelectedSourceAsset: (asset: string) => void;
  fetchPaymentInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  fetchReceiveInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  fetchSwapInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  fetchWithdrawInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  fetchSendInfo: (data: SendOrderFormData) => Promise<OrderPaymentInfo>;
  confirmPayment: () => Promise<void>;
  confirmReceive: () => Promise<void>;
  confirmSwap: () => Promise<void>;
  confirmWithdraw: () => Promise<void>;
  confirmSend: () => Promise<void>;
  reloadOrderHistory: () => void;
  pairMap: (asset: string) => Asset | Fiat | undefined;
  downloadPdf: (params: PdfDownloadParams) => Promise<void>;
}

export function useSafe(): UseSafeResult {
  const { call } = useApi();
  const { currencies } = useBuy();
  const { session } = useAuthContext();
  const { changeUserAddress } = useUser();
  const { getAssets } = useAssetContext();
  const { user, isUserLoading, reloadUser, custodyAddresses } = useUserContext();
  const { isLoggedIn, tokenStore } = useSessionContext();

  const currentOrderId = useRef<number>();

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [custodyAddress, setCustodyAddress] = useState<string>();
  const [custodyBlockchains, setCustodyBlockchains] = useState<Blockchain[]>([]);
  const [portfolio, setPortfolio] = useState<CustodyBalance>({ totalValue: { chf: 0, eur: 0, usd: 0 }, balances: [] });
  const [history, setHistory] = useState<CustodyHistoryEntry[]>([]);
  const [orderHistory, setOrderHistory] = useState<CustodyOrderHistory[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingOrderHistory, setIsLoadingOrderHistory] = useState(true);
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<string>();
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [isAccountsLoaded, setIsAccountsLoaded] = useState(false);
  // Keyed by a stable string, not by the account object: an object in an effect's dependency
  // list is a new reference on every render and would re-fetch forever. The legacy Safe has a
  // null id, so it needs a key of its own rather than being addressed by id.
  const [selectedAccountKey, setSelectedAccountKey] = useState<string>();

  // Mirrors the selected key for callbacks that outlive a render — a manual reload has no
  // cleanup function to cancel it.
  const selectedKeyRef = useRef<string>();
  useEffect(() => {
    selectedKeyRef.current = selectedAccountKey;
  }, [selectedAccountKey]);

  const selectedAccount = useMemo(
    () => custodyAccounts.find((a) => accountKey(a) === selectedAccountKey),
    [custodyAccounts, selectedAccountKey],
  );

  // ---- Safe Screen Initialization ----

  useEffect(() => {
    async function createCustodyOrSwitch(): Promise<void> {
      const custodyAddr = custodyAddresses.at(0);
      if (!custodyAddr) {
        const { accessToken } = await createCustodyUser();
        tokenStore.set('custody', accessToken);
        await reloadUser();
      } else {
        setCustodyAddress(custodyAddr.address);
        setCustodyBlockchains([Blockchain.ETHEREUM, Blockchain.CITREA]);
        if (!tokenStore.get('custody') && session?.address !== custodyAddr.address) {
          const custodyToken = (await changeUserAddress(custodyAddr.address)).accessToken;
          tokenStore.set('custody', custodyToken);
        }
      }
    }

    if (!isUserLoading && session && user && isLoggedIn) {
      createCustodyOrSwitch()
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn, session, reloadUser, changeUserAddress, tokenStore]);

  useEffect(() => {
    if (!isInitialized || !user || !isLoggedIn) return;
    getCustodyAccounts()
      .then((accounts) => {
        setCustodyAccounts(accounts);
        // Prefer the account the caller owns; with read-only access only, take the first.
        const ownAccount = accounts.find((a) => a.accessLevel === 'Write');
        const defaultAccount = ownAccount ?? accounts.at(0);
        setSelectedAccountKey(defaultAccount !== undefined ? accountKey(defaultAccount) : undefined);
        setIsAccountsLoaded(true);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [isInitialized, user, isLoggedIn]);

  // Every load below is tied to the account it was started for. Without that, switching
  // accounts while a request is in flight can paint one account's holdings under another
  // account's name — the late answer would win.
  useEffect(() => {
    if (!user || !isLoggedIn || !isAccountsLoaded) return;
    let cancelled = false;
    setIsLoadingPortfolio(true);
    getBalances(selectedAccount)
      .then((portfolio) => !cancelled && setPortfolio(portfolio))
      .catch((error: ApiError) => !cancelled && setError(error.message ?? 'Unknown error'))
      .finally(() => !cancelled && setIsLoadingPortfolio(false));
    return () => {
      cancelled = true;
    };
  }, [user, isLoggedIn, isAccountsLoaded, selectedAccountKey, custodyAccounts]);

  useEffect(() => {
    if (!user || !isLoggedIn || !isAccountsLoaded) return;
    let cancelled = false;
    setIsLoadingHistory(true);
    getHistory(selectedAccount)
      .then(({ totalValue }) => !cancelled && setHistory(totalValue))
      .catch((error: ApiError) => !cancelled && setError(error.message ?? 'Unknown error'))
      .finally(() => !cancelled && setIsLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [user, isLoggedIn, isAccountsLoaded, selectedAccountKey, custodyAccounts]);

  /**
   * Shared by the effect below and by the manual reload after an order completes. The manual
   * path has no cleanup to cancel it, so the guard is the selection itself: a result is only
   * accepted while the account it was fetched for is still the selected one.
   */
  const loadOrderHistory = useCallback(
    (account: CustodyAccount | undefined): void => {
      const requestedKey = account !== undefined ? accountKey(account) : undefined;
      setIsLoadingOrderHistory(true);
      getOrderHistory(account)
        .then((orders) => selectedKeyRef.current === requestedKey && setOrderHistory(orders))
        .catch(
          (error: ApiError) => selectedKeyRef.current === requestedKey && setError(error.message ?? 'Unknown error'),
        )
        .finally(() => selectedKeyRef.current === requestedKey && setIsLoadingOrderHistory(false));
    },
    // getOrderHistory closes over `call` only, which useApi keeps stable
    [],
  );

  function reloadOrderHistory(): void {
    loadOrderHistory(selectedAccount);
  }

  useEffect(() => {
    if (!user || !isLoggedIn || !isAccountsLoaded) return;
    loadOrderHistory(selectedAccount);
  }, [user, isLoggedIn, isAccountsLoaded, selectedAccountKey, custodyAccounts, loadOrderHistory]);

  // ---- Available Deposit Pairs ----

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => Object.keys(DEPOSIT_PAIRS).includes(c.name));
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM, Blockchain.CITREA], { buyable: true, comingSoon: false }).filter((a) =>
      Object.values(DEPOSIT_PAIRS).includes(a.name),
    );
  }, [getAssets]);

  const receiveableAssets = useMemo(() => {
    return custodyBlockchains.length > 0
      ? getAssets(custodyBlockchains, { sellable: true, buyable: true, comingSoon: false })
      : [];
  }, [getAssets, custodyBlockchains]);

  const withdrawableAssets = useMemo(() => {
    const assets =
      custodyBlockchains.length > 0 ? getAssets(custodyBlockchains, { sellable: true, comingSoon: false }) : [];
    return assets.filter(
      (a) =>
        Object.keys(WITHDRAW_PAIRS).includes(a.name) &&
        portfolio.balances.find((b) => b.asset.name === a.name && b.balance > 0),
    );
  }, [getAssets, custodyBlockchains, portfolio.balances]);

  const withdrawableCurrencies = useMemo(() => {
    return (availableCurrencies ?? []).filter((currency) =>
      portfolio.balances.some(
        (balance) => balance.asset.name === DEPOSIT_PAIRS[currency.name as keyof typeof DEPOSIT_PAIRS],
      ),
    );
  }, [availableCurrencies, portfolio.balances]);

  const swappableSourceAssets = useMemo(() => {
    const sourceAssets =
      custodyBlockchains.length > 0 ? getAssets(custodyBlockchains, { sellable: true, comingSoon: false }) : [];
    return sourceAssets.filter((a) => portfolio.balances.find((b) => b.asset.name === a.name && b.balance > 0));
  }, [getAssets, custodyBlockchains, portfolio.balances]);

  const swappableTargetAssets = useMemo(() => {
    const targetAssets =
      custodyBlockchains.length > 0 ? getAssets(custodyBlockchains, { buyable: true, comingSoon: false }) : [];
    return targetAssets?.filter((a) => a.name !== selectedSourceAsset);
  }, [getAssets, custodyBlockchains, selectedSourceAsset]);

  const sendableAssets = useMemo(() => {
    const assets =
      custodyBlockchains.length > 0 ? getAssets(custodyBlockchains, { sellable: true, comingSoon: false }) : [];
    return assets.filter((a) => portfolio.balances.find((b) => b.asset.name === a.name && b.balance > 0));
  }, [getAssets, custodyBlockchains, portfolio.balances]);

  const pairMap = useCallback(
    (asset: string) =>
      availableAssets?.find((a) => a.name === DEPOSIT_PAIRS[asset]) ||
      availableCurrencies?.find((c) => c.name === WITHDRAW_PAIRS[asset]),
    [availableAssets, availableCurrencies],
  );

  function selectAccount(account: CustodyAccount): void {
    setSelectedAccountKey(accountKey(account));
  }

  // ---- API Calls ----

  async function createCustodyUser(): Promise<SignIn> {
    return call<SignIn>({
      url: 'custody',
      method: 'POST',
      data: { addressType: 'EVM' },
    });
  }

  async function getCustodyAccounts(): Promise<CustodyAccount[]> {
    return call<CustodyAccount[]>({ url: 'custody/account', method: 'GET' });
  }

  /**
   * The legacy Safe appears in the account list with a null id — it has no account row, so it is
   * read through the plain endpoints. Treating it as an id would request `.../account/null/...`
   * and break the screen for everyone still on legacy, which today is nearly everyone.
   */
  function accountPath(account: CustodyAccount | undefined, suffix: string, plain: string): string {
    return account !== undefined && account.id !== null ? `custody/account/${account.id}/${suffix}` : plain;
  }

  async function getBalances(account?: CustodyAccount): Promise<CustodyBalance> {
    return call<CustodyBalance>({ url: accountPath(account, 'balance', 'custody'), method: 'GET' });
  }

  async function getHistory(account?: CustodyAccount): Promise<CustodyHistory> {
    return call<CustodyHistory>({ url: accountPath(account, 'history', 'custody/history'), method: 'GET' });
  }

  async function getOrderHistory(account?: CustodyAccount): Promise<CustodyOrderHistory[]> {
    return call<CustodyOrderHistory[]>({ url: accountPath(account, 'order', 'custody/order'), method: 'GET' });
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

  async function fetchReceiveInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.RECEIVE,
        sourceAsset: data.sourceAsset.name,
        targetAsset: data.sourceAsset.name,
        sourceAmount: Number(data.sourceAmount),
      },
      token: tokenStore.get('custody'),
    });

    currentOrderId.current = order.orderId;
    return order;
  }

  async function fetchSwapInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.SWAP,
        sourceAsset: data.sourceAsset.name,
        targetAsset: data.targetAsset.name,
        sourceAmount: data.sourceAmount ? Number(data.sourceAmount) : undefined,
        targetAmount: data.targetAmount ? Number(data.targetAmount) : undefined,
      },
      token: tokenStore.get('custody'),
    });

    currentOrderId.current = order.orderId;
    return order;
  }

  async function fetchWithdrawInfo(data: OrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.WITHDRAWAL,
        sourceAsset: data.sourceAsset.name,
        targetAsset: WITHDRAW_PAIRS[data.sourceAsset.name],
        sourceAmount: data.sourceAmount ? Number(data.sourceAmount) : undefined,
        targetAmount: data.targetAmount ? Number(data.targetAmount) : undefined,
        targetIban: data.bankAccount?.iban,
      },
      token: tokenStore.get('custody'),
    });

    currentOrderId.current = order.orderId;
    return order;
  }

  async function fetchSendInfo(data: SendOrderFormData): Promise<OrderPaymentInfo> {
    const order = await call<OrderPaymentInfo>({
      url: 'custody/order',
      method: 'POST',
      data: {
        type: CustodyOrderType.SEND,
        sourceAsset: data.asset.name,
        targetAsset: data.asset.name,
        sourceAmount: data.amount ? Number(data.amount) : undefined,
        targetAmount: data.targetAmount ? Number(data.targetAmount) : undefined,
        targetAddress: data.address,
        targetBlockchain: data.asset.blockchain,
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

  async function confirmReceive(): Promise<void> {
    return confirmPayment();
  }

  async function confirmSwap(): Promise<void> {
    return confirmPayment();
  }

  async function confirmWithdraw(): Promise<void> {
    return confirmPayment();
  }

  async function confirmSend(): Promise<void> {
    return confirmPayment();
  }

  async function downloadPdf(params: PdfDownloadParams): Promise<void> {
    // Refuse rather than guess: before the list has arrived we do not know which account the
    // statement would be about, and quietly serving the caller's own would be a wrong answer.
    if (!isAccountsLoaded) {
      throw new Error('Accounts are still loading');
    }

    const queryParams = new URLSearchParams({ currency: params.currency, date: params.date });
    const pdfUrl = `${accountPath(selectedAccount, 'pdf', 'custody/pdf')}?${queryParams.toString()}`;

    const response = await call<{ pdfData: string }>({ url: pdfUrl, method: 'GET' });

    const filename = `${params.date}_DFX_Safe_Balance_Report.pdf`;
    downloadPdfFromString(response.pdfData, filename);
  }

  return useMemo<UseSafeResult>(
    () => ({
      isInitialized,
      isLoadingPortfolio,
      isLoadingHistory,
      isLoadingOrderHistory,
      portfolio,
      history,
      orderHistory,
      error,
      custodyAddress,
      custodyBlockchains,
      availableCurrencies,
      availableAssets,
      receiveableAssets,
      withdrawableAssets,
      withdrawableCurrencies,
      sendableAssets,
      swappableSourceAssets,
      swappableTargetAssets,
      custodyAccounts,
      selectedAccount,
      isAccountsLoaded,
      selectAccount,
      setSelectedSourceAsset,
      fetchPaymentInfo,
      fetchReceiveInfo,
      fetchSwapInfo,
      fetchWithdrawInfo,
      fetchSendInfo,
      confirmPayment,
      confirmReceive,
      confirmSwap,
      confirmWithdraw,
      confirmSend,
      reloadOrderHistory,
      pairMap,
      downloadPdf,
    }),
    [
      isInitialized,
      isLoadingPortfolio,
      isLoadingHistory,
      isLoadingOrderHistory,
      portfolio,
      history,
      orderHistory,
      error,
      custodyAddress,
      custodyBlockchains,
      availableCurrencies,
      availableAssets,
      receiveableAssets,
      withdrawableAssets,
      withdrawableCurrencies,
      sendableAssets,
      swappableSourceAssets,
      swappableTargetAssets,
      custodyAccounts,
      selectedAccount,
      selectedSourceAsset,
      pairMap,
    ],
  );
}
