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
import { CustodyOrderType, OrderPaymentInfo } from 'src/dto/order.dto';
import {
  CreateSafeAccountDto,
  CustodyAsset,
  CustodyBalance,
  CustodyHistory,
  CustodyHistoryEntry,
  SafeAccessLevel,
  SafeAccount,
  SafeAccountAccess,
  UpdateSafeAccountDto,
} from 'src/dto/safe.dto';
import { OrderFormData } from './order.hook';
import { downloadPdfFromString } from 'src/util/utils';

const DEPOSIT_PAIRS: Record<string, string> = {
  EUR: 'dEURO',
  CHF: 'ZCHF',
};

const WITHDRAW_PAIRS: Record<string, string> = Object.entries(DEPOSIT_PAIRS).reduce(
  (acc, [fiat, custody]) => ({ ...acc, [custody]: fiat }),
  {},
);

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
  portfolio: CustodyBalance;
  history: CustodyHistoryEntry[];
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
  pairMap: (asset: string) => Asset | Fiat | undefined;
  downloadPdf: (params: PdfDownloadParams) => Promise<void>;
  // SafeAccount
  safeAccounts: SafeAccount[];
  selectedSafeAccount?: SafeAccount;
  isLoadingSafeAccounts: boolean;
  selectSafeAccount: (safeAccount: SafeAccount) => void;
  createSafeAccount: (data: CreateSafeAccountDto) => Promise<SafeAccount>;
  updateSafeAccount: (id: number, data: UpdateSafeAccountDto) => Promise<SafeAccount>;
  getSafeAccountAccess: (id: number) => Promise<SafeAccountAccess[]>;
  canWrite: boolean;
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
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedSourceAsset, setSelectedSourceAsset] = useState<string>();

  // SafeAccount state
  const [safeAccounts, setSafeAccounts] = useState<SafeAccount[]>([]);
  const [selectedSafeAccount, setSelectedSafeAccount] = useState<SafeAccount>();
  const [isLoadingSafeAccounts, setIsLoadingSafeAccounts] = useState(true);

  // ---- API Calls (defined early for use in effects) ----

  async function createCustodyUser(): Promise<SignIn> {
    return call<SignIn>({
      url: 'custody',
      method: 'POST',
      data: { addressType: 'EVM' },
    });
  }

  async function getBalances(safeAccount?: SafeAccount): Promise<CustodyBalance> {
    // Use safe-account endpoint for non-legacy accounts
    if (safeAccount && !safeAccount.isLegacy && safeAccount.id !== null) {
      return call<CustodyBalance>({
        url: `safe-account/${safeAccount.id}/balance`,
        method: 'GET',
      });
    }
    // Legacy: use old custody endpoint
    return call<CustodyBalance>({
      url: `custody`,
      method: 'GET',
    });
  }

  async function getHistory(safeAccount?: SafeAccount): Promise<CustodyHistory> {
    // Use safe-account endpoint for non-legacy accounts
    if (safeAccount && !safeAccount.isLegacy && safeAccount.id !== null) {
      return call<CustodyHistory>({
        url: `safe-account/${safeAccount.id}/history`,
        method: 'GET',
      });
    }
    // Legacy: use old custody endpoint
    return call<CustodyHistory>({
      url: `custody/history`,
      method: 'GET',
    });
  }

  async function fetchSafeAccounts(): Promise<SafeAccount[]> {
    return call<SafeAccount[]>({
      url: 'safe-account',
      method: 'GET',
    });
  }

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
        setCustodyBlockchains([Blockchain.ETHEREUM]);
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

  // Load SafeAccounts
  useEffect(() => {
    if (!user || !isLoggedIn) return;
    setIsLoadingSafeAccounts(true);
    fetchSafeAccounts()
      .then((accounts: SafeAccount[]) => {
        setSafeAccounts(accounts);
        // Auto-select first account if none selected
        if (accounts.length > 0 && !selectedSafeAccount) {
          setSelectedSafeAccount(accounts[0]);
        }
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoadingSafeAccounts(false));
  }, [user, isLoggedIn]);

  useEffect(() => {
    if (!user || !isLoggedIn) return;
    setIsLoadingPortfolio(true);
    getBalances(selectedSafeAccount)
      .then((portfolio) => setPortfolio(portfolio))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoadingPortfolio(false));
  }, [user, isLoggedIn, selectedSafeAccount]);

  useEffect(() => {
    if (!user || !isLoggedIn) return;
    setIsLoadingHistory(true);
    getHistory(selectedSafeAccount)
      .then(({ totalValue }) => setHistory(totalValue))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoadingHistory(false));
  }, [user, isLoggedIn, selectedSafeAccount]);

  // ---- Available Deposit Pairs ----

  const availableCurrencies = useMemo(() => {
    return currencies?.filter((c) => Object.keys(DEPOSIT_PAIRS).includes(c.name));
  }, [currencies]);

  const availableAssets = useMemo(() => {
    return getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
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

  // ---- SafeAccount API Calls ----

  async function createSafeAccountApi(data: CreateSafeAccountDto): Promise<SafeAccount> {
    const newAccount = await call<SafeAccount>({
      url: 'safe-account',
      method: 'POST',
      data,
    });
    // Reload safe accounts after creation
    const accounts = await fetchSafeAccounts();
    setSafeAccounts(accounts);
    return newAccount;
  }

  async function updateSafeAccountApi(id: number, data: UpdateSafeAccountDto): Promise<SafeAccount> {
    const updatedAccount = await call<SafeAccount>({
      url: `safe-account/${id}`,
      method: 'PUT',
      data,
    });
    // Reload safe accounts after update
    const accounts = await fetchSafeAccounts();
    setSafeAccounts(accounts);
    // Update selected if it was the updated one
    if (selectedSafeAccount?.id === id) {
      setSelectedSafeAccount(updatedAccount);
    }
    return updatedAccount;
  }

  async function getSafeAccountAccessApi(id: number): Promise<SafeAccountAccess[]> {
    return call<SafeAccountAccess[]>({
      url: `safe-account/${id}/access`,
      method: 'GET',
    });
  }

  function selectSafeAccount(safeAccount: SafeAccount): void {
    setSelectedSafeAccount(safeAccount);
  }

  const canWrite = useMemo(() => {
    return selectedSafeAccount?.accessLevel === SafeAccessLevel.WRITE;
  }, [selectedSafeAccount]);

  // ---- Order API Calls ----

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
    const queryParams = new URLSearchParams({
      currency: params.currency,
      date: params.date,
    });

    const response = await call<{ pdfData: string }>({
      url: `custody/pdf?${queryParams.toString()}`,
      method: 'GET',
    });

    const filename = `${params.date}_DFX_Safe_Balance_Report.pdf`;
    downloadPdfFromString(response.pdfData, filename);
  }

  return useMemo<UseSafeResult>(
    () => ({
      isInitialized,
      isLoadingPortfolio,
      isLoadingHistory,
      portfolio,
      history,
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
      pairMap,
      downloadPdf,
      // SafeAccount
      safeAccounts,
      selectedSafeAccount,
      isLoadingSafeAccounts,
      selectSafeAccount,
      createSafeAccount: createSafeAccountApi,
      updateSafeAccount: updateSafeAccountApi,
      getSafeAccountAccess: getSafeAccountAccessApi,
      canWrite,
    }),
    [
      isInitialized,
      isLoadingPortfolio,
      isLoadingHistory,
      portfolio,
      history,
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
      selectedSourceAsset,
      pairMap,
      safeAccounts,
      selectedSafeAccount,
      isLoadingSafeAccounts,
      canWrite,
    ],
  );
}
