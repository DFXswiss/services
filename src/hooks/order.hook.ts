import {
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  FiatPaymentMethod,
  useAuthContext,
  useBuy,
  useUserContext,
} from '@dfx.swiss/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { addressLabel } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { AssetBalance } from 'src/contexts/balance.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { deepEqual } from 'src/util/utils';
import { useAppParams } from './app-params.hook';
import { useBlockchain } from './blockchain.hook';
import { useTxHelper } from './tx-helper.hook';

const EMBEDDED_WALLET = 'CakeWallet';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
}

export enum Side {
  TO = 'To',
  FROM = 'From',
}

export interface OrderFormData {
  sourceAsset: Fiat | Asset;
  targetAsset: Fiat | Asset;
  sourceAmount?: string;
  targetAmount?: string;
  paymentMethod?: FiatPaymentMethod;
  bankAccount?: BankAccount;
  address?: Address;
}

interface OrderPaymentInfo {
  type: string;
  orderId: number;
  status: string;
  paymentInfo: any;
}

// TODO: Add Address to packages?
interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

export interface UseOrderResult {
  isBuy: boolean;
  isSell?: boolean;
  isSwap?: boolean;
  addressItems: Address[];
  cryptoBalances: AssetBalance[];
  paymentInfo?: OrderPaymentInfo;
  isFetchingPaymentInfo: boolean;
  lastEditedFieldRef: React.MutableRefObject<Side>;
  setSelectedAddress: (address?: Address) => void;
  getAvailableCurrencies: (paymentMethod?: FiatPaymentMethod) => Fiat[];
  getAvailablePaymentMethods: (targetAsset?: Asset) => FiatPaymentMethod[];
  handlePaymentInfoFetch: (
    debouncedData: OrderFormData,
    onFetchPaymentInfo: <T>(data: OrderFormData) => Promise<T>,
    setValue: UseFormSetValue<OrderFormData>,
  ) => void;
}

export interface UseOrderOptions {
  orderType: OrderType;
  sourceAssets?: Asset[] | Fiat[];
  targetAssets?: Asset[] | Fiat[];
}

export function useOrder({ orderType, sourceAssets, targetAssets }: UseOrderOptions): UseOrderResult {
  const { currencies } = useBuy();
  const { user } = useUserContext();
  const { session } = useAuthContext();
  const { getBalances } = useTxHelper();
  const { translate } = useSettingsContext();
  const { toString: blockchainToString } = useBlockchain();
  const { isEmbedded, isDfxHosted } = useAppHandlingContext();
  const { wallet, availableBlockchains } = useAppParams();

  const [selectedAddress, setSelectedAddress] = useState<Address>();
  const [cryptoBalances, setCryptoBalances] = useState<AssetBalance[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<OrderPaymentInfo>();
  const [isFetchingPaymentInfo, setIsFetchingPaymentInfo] = useState(false);

  const lastEditedFieldRef = useRef<Side>(Side.FROM);
  const lastFetchedDataRef = useRef<OrderFormData | null>(null);

  const isBuy = useMemo(() => orderType === OrderType.BUY, [orderType]);
  const isSell = useMemo(() => orderType === OrderType.SELL, [orderType]);
  const isSwap = useMemo(() => orderType === OrderType.SWAP, [orderType]);

  useEffect(() => {
    let cryptoAssets = isBuy ? targetAssets ?? [] : isSell ? sourceAssets ?? [] : [];
    cryptoAssets ??= isSwap ? (sourceAssets ?? []).concat(targetAssets ?? []) : [];

    if (cryptoAssets && selectedAddress?.address) {
      getBalances(cryptoAssets as Asset[], selectedAddress.address, selectedAddress.chain).then((balances) =>
        setCryptoBalances(balances ?? []),
      );
    }
  }, [isBuy, isSell, isSwap, targetAssets, sourceAssets, getBalances, selectedAddress]);

  const getAvailablePaymentMethods = useCallback(
    (targetAsset?: Asset): FiatPaymentMethod[] => {
      if (!isBuy) return [];

      const pushCardPayment =
        (isDfxHosted || !isEmbedded) &&
        wallet !== EMBEDDED_WALLET &&
        user?.activeAddress?.wallet !== EMBEDDED_WALLET &&
        (!targetAsset || targetAsset.cardBuyable);

      return [FiatPaymentMethod.BANK, ...(pushCardPayment ? [FiatPaymentMethod.CARD] : [])];
    },
    [isBuy, isDfxHosted, isEmbedded, wallet, user],
  );

  const getAvailableCurrencies = useCallback(
    (paymentMethod?: FiatPaymentMethod): Fiat[] =>
      currencies?.filter((c) =>
        paymentMethod === FiatPaymentMethod.CARD
          ? c.cardSellable
          : paymentMethod === FiatPaymentMethod.INSTANT
          ? c.instantSellable
          : c.sellable,
      ) ?? [],
    [currencies],
  );

  const addressItems: Address[] = useMemo(() => {
    const cryptoAssets = (isBuy ? targetAssets ?? [] : sourceAssets ?? []) as Asset[];
    const blockchains = availableBlockchains?.filter((b) => cryptoAssets?.some((a) => a.blockchain === b));

    return session?.address && blockchains?.length
      ? [
          ...blockchains.map((b) => ({
            address: addressLabel(session),
            label: blockchainToString(b),
            chain: b,
          })),
          {
            address: translate('screens/buy', 'Switch address'),
            label: translate('screens/buy', 'Login with a different address'),
          },
        ]
      : [];
  }, [session, targetAssets, sourceAssets, orderType, availableBlockchains, translate]);

  const handlePaymentInfoFetch = useCallback(
    (
      debouncedData: OrderFormData,
      onFetchPaymentInfo: <T>(data: OrderFormData) => Promise<T>,
      setValue: UseFormSetValue<OrderFormData>,
    ) => {
      let isRunning = true;

      const orderIsValid =
        debouncedData &&
        (Number(debouncedData.sourceAmount) > 0 || Number(debouncedData.targetAmount) > 0) &&
        debouncedData.sourceAsset &&
        debouncedData.targetAsset;

      const editedFrom = lastEditedFieldRef.current === Side.FROM;
      const validatedOrderForm = orderIsValid && {
        ...debouncedData,
        sourceAmount: editedFrom ? debouncedData.sourceAmount : undefined,
        targetAmount: !editedFrom ? debouncedData.targetAmount : undefined,
      };

      if (deepEqual(validatedOrderForm, lastFetchedDataRef.current)) return;

      setPaymentInfo(undefined);
      if (!validatedOrderForm) return;

      setIsFetchingPaymentInfo(true);
      lastFetchedDataRef.current = validatedOrderForm;
      onFetchPaymentInfo<OrderPaymentInfo>(validatedOrderForm)
        .then((paymentInfo) => {
          if (isRunning && paymentInfo) {
            setPaymentInfo(paymentInfo);
            !editedFrom && setValue('sourceAmount', paymentInfo.paymentInfo.amount);
            editedFrom && setValue('targetAmount', paymentInfo.paymentInfo.estimatedAmount);
          }
        })
        .catch((error) => {
          if (isRunning) {
            console.error('Failed to fetch payment info:', error);
            !editedFrom && setValue('sourceAmount', undefined);
            editedFrom && setValue('targetAmount', undefined);
            lastFetchedDataRef.current = null;
          }
        })
        .finally(() => isRunning && setIsFetchingPaymentInfo(false));

      return () => {
        isRunning = false;
      };
    },
    [],
  );

  return useMemo(
    () => ({
      isBuy, // TODO: Refactor - do we really need isBuy, isSell, isSwap, can we simplify this?
      isSell,
      isSwap,
      addressItems,
      cryptoBalances,
      paymentInfo,
      isFetchingPaymentInfo,
      lastEditedFieldRef,
      setSelectedAddress,
      getAvailableCurrencies,
      getAvailablePaymentMethods,
      handlePaymentInfoFetch,
    }),
    [
      orderType,
      addressItems,
      cryptoBalances,
      paymentInfo,
      isFetchingPaymentInfo,
      setSelectedAddress,
      getAvailableCurrencies,
      getAvailablePaymentMethods,
      handlePaymentInfoFetch,
    ],
  );
}
