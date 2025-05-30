import {
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  FiatPaymentMethod,
  useAuthContext,
  useBuy,
  useFiat,
  useUserContext,
  Utils,
  Validations,
} from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { addressLabel, PaymentMethodDescriptions, PaymentMethodLabels } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import useDebounce from 'src/hooks/debounce.hook';

import { AssetBalance } from 'src/contexts/balance.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useTxHelper } from 'src/hooks/tx-helper.hook';
import { blankedAddress, deepEqual } from 'src/util/utils';
import { AssetInputSection } from '../safe/asset-input-section';
import { BankAccountSelector } from '../safe/bank-account-selector';

const EMBEDDED_WALLET = 'CakeWallet';

enum Side {
  TO = 'To',
  FROM = 'From',
}

interface OrderPaymentInfo {
  type: string;
  orderId: number;
  status: string;
  paymentInfo: any;
}

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
}

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

export interface OrderFormData {
  fromAsset: Fiat | Asset;
  toAsset: Fiat | Asset;
  fromAssetAmount?: string;
  toAssetAmount?: string;
  paymentMethod?: FiatPaymentMethod;
  bankAccount?: BankAccount;
  address?: Address;
}

interface OrderInterfaceProps {
  orderType: OrderType;
  header?: string;
  fromAssets?: Asset[] | Fiat[];
  toAssets?: Asset[] | Fiat[];
  fromInputLabel?: string;
  toInputLabel?: string;
  defaultValues?: Partial<OrderFormData>;
  onFetchPaymentInfo: <T>(data: OrderFormData) => Promise<T>;
  onConfirm: <T>(data: T) => Promise<void>;
}

export const OrderInterface: React.FC<OrderInterfaceProps> = (props) => {
  const {
    orderType,
    header,
    fromInputLabel,
    toInputLabel,
    fromAssets,
    toAssets,
    defaultValues,
    onFetchPaymentInfo,
    onConfirm,
  } = props;
  const { currencies } = useBuy();
  const { user } = useUserContext();
  const { width } = useWindowContext();
  const { session } = useAuthContext();
  const { getBalances } = useTxHelper();
  const { getDefaultCurrency } = useFiat();
  const { translate } = useSettingsContext();
  const { toString: blockchainToString } = useBlockchain();
  const { isEmbedded, isDfxHosted, isInitialized } = useAppHandlingContext();
  const { wallet, blockchain, hideTargetSelection, availableBlockchains } = useAppParams();

  const [paymentInfo, setPaymentInfo] = useState<any>();
  const [cryptoBalances, setCryptoBalances] = useState<AssetBalance[]>();
  const [isFetchingPaymentInfo, setIsFetchingPaymentInfo] = useState(false);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const lastEditedFieldRef = useRef<Side>(Side.FROM);
  const lastFetchedDataRef = useRef<OrderFormData | null>(null);

  const isBuy = useMemo(() => orderType === OrderType.BUY, [orderType]);
  const isSell = useMemo(() => orderType === OrderType.SELL, [orderType]);
  const isSwap = useMemo(() => orderType === OrderType.SWAP, [orderType]);

  const methods = useForm<OrderFormData>({ mode: 'onChange', defaultValues });

  const {
    watch,
    control,
    setValue,
    formState: { errors, isValid },
  } = methods;

  const data = watch();
  const debouncedData = useDebounce(data, 500);

  const availablePaymentMethods: FiatPaymentMethod[] = useMemo(() => {
    if (!isBuy) return [];

    const pushCardPayment =
      (isDfxHosted || !isEmbedded) &&
      wallet !== EMBEDDED_WALLET &&
      user?.activeAddress?.wallet !== EMBEDDED_WALLET &&
      (!data.toAsset || (data.toAsset as Asset)?.cardBuyable);

    return [FiatPaymentMethod.BANK, ...(pushCardPayment ? [FiatPaymentMethod.CARD] : [])];
  }, [data.fromAsset, data.toAsset, isDfxHosted, isEmbedded, wallet, user, isBuy, orderType]);

  const availableCurrencies: Fiat[] = useMemo(
    () =>
      currencies?.filter((c) =>
        data.paymentMethod === FiatPaymentMethod.CARD
          ? c.cardSellable
          : data.paymentMethod === FiatPaymentMethod.INSTANT
          ? c.instantSellable
          : c.sellable,
      ) ?? [],
    [currencies, data.paymentMethod],
  );

  const cryptoAssets = useMemo(() => {
    let assets = isBuy ? toAssets ?? [] : isSell ? fromAssets ?? [] : [];
    assets ??= isSwap ? (fromAssets ?? []).concat(toAssets ?? []) : [];
    return assets as Asset[];
  }, [isBuy, isSell, isSwap, fromAssets, toAssets]);

  const addressItems: Address[] = useMemo(() => {
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
  }, [session, cryptoAssets, availableBlockchains, translate]);

  useEffect(() => {
    availablePaymentMethods?.length && setValue('paymentMethod', availablePaymentMethods[0]);
  }, [availablePaymentMethods, setValue]);

  useEffect(() => {
    if (isInitialized && session?.address && addressItems) {
      const address = addressItems.find((a) => blockchain && a.chain === blockchain) ?? addressItems[0];
      setValue('address', address);
    }
  }, [isInitialized, session, addressItems, blockchain, setValue]);

  useEffect(() => {
    const defaultCurrency = getDefaultCurrency(availableCurrencies) ?? (availableCurrencies && availableCurrencies[0]);

    switch (orderType) {
      case OrderType.BUY: {
        if (fromAssets?.length)
          setValue('fromAsset', fromAssets.find((c) => c.name === defaultCurrency?.name) ?? fromAssets[0]);
        if (toAssets?.length) setValue('toAsset', toAssets[0]);
        break;
      }
      case OrderType.SELL: {
        if (fromAssets?.length) setValue('fromAsset', fromAssets[0]);
        if (toAssets?.length)
          setValue('toAsset', toAssets.find((c) => c.name === defaultCurrency?.name) ?? toAssets[0]);
        break;
      }
      case OrderType.SWAP: {
        if (fromAssets?.length) setValue('fromAsset', fromAssets[0]);
        if (toAssets?.length) setValue('toAsset', toAssets[0]);
        break;
      }
      default:
        break;
    }
  }, [fromAssets, toAssets, availableCurrencies, orderType, setValue, getDefaultCurrency]);

  useEffect(() => {
    let cryptoAssets = isBuy ? toAssets ?? [] : isSell ? fromAssets ?? [] : [];
    cryptoAssets ??= isSwap ? (fromAssets ?? []).concat(toAssets ?? []) : [];

    cryptoAssets &&
      data.address?.address &&
      getBalances(cryptoAssets as Asset[], data.address.address, data.address.chain).then(setCryptoBalances);
  }, [isBuy, isSell, isSwap, toAssets, fromAssets, data.address, getBalances]);

  useEffect(() => {
    let isRunning = true;

    const orderIsValid =
      debouncedData &&
      (debouncedData.fromAssetAmount || debouncedData.toAssetAmount) &&
      debouncedData.fromAsset &&
      debouncedData.toAsset;

    const editedFrom = lastEditedFieldRef.current === Side.FROM;
    const validatedOrderForm = orderIsValid && {
      ...debouncedData,
      fromAssetAmount: editedFrom ? debouncedData.fromAssetAmount : undefined,
      toAssetAmount: !editedFrom ? debouncedData.toAssetAmount : undefined,
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
          !editedFrom && setValue('fromAssetAmount', paymentInfo.paymentInfo.amount);
          editedFrom && setValue('toAssetAmount', paymentInfo.paymentInfo.estimatedAmount);
          // lastFetchedDataRef.current = debouncedData;
        }
      })
      .catch((error) => {
        if (isRunning) {
          console.error('Failed to fetch payment info:', error);
          lastFetchedDataRef.current = null;
          // setPaymentInfo(undefined);
        }
      })
      .finally(() => isRunning && setIsFetchingPaymentInfo(false));

    return () => {
      isRunning = false;
    };
  }, [debouncedData, onFetchPaymentInfo]);

  function findCryptoBalance(asset: Asset): number | undefined {
    return cryptoBalances?.find((b) => b.asset.id === asset.id)?.amount;
  }

  function findCryptoBalanceString(asset: Asset): string {
    const balance = findCryptoBalance(asset);
    return balance != null ? Utils.formatAmountCrypto(balance) : '';
  }

  const rules = Utils.createRules({
    fromAssetAmount: Validations.Required,
    fromAsset: Validations.Required,
    // TODO (later): Complete rules
  });

  return (
    <FormProvider {...methods}>
      <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
        <StyledVerticalStack gap={2} full>
          <div className="px-2 text-dfxBlue-500 text-left text-lg font-semibold">{header}</div>
          <StyledVerticalStack gap={2} full className="relative text-left">
            <AssetInputSection
              name="fromAsset"
              label={fromInputLabel}
              placeholder="0.00"
              availableItems={fromAssets ?? []}
              selectedItem={data.fromAsset}
              assetRules={rules.fromAsset}
              amountRules={rules.fromAssetAmount}
              balanceFunc={findCryptoBalanceString}
              onMaxButtonClick={(value) => setValue('fromAssetAmount', value.toString())}
              onAmountChange={() => (lastEditedFieldRef.current = Side.FROM)}
              // exchangeRate={} // TODO: Implement
            />
            {!hideTargetSelection && (
              <StyledDropdown<Address>
                rootRef={rootRef}
                name="address"
                items={addressItems}
                labelFunc={(item) => blankedAddress(item.address, { width })}
                descriptionFunc={(item) => item.label}
                full
                forceEnable
              />
            )}
            <AssetInputSection
              name="toAsset"
              label={toInputLabel}
              placeholder="0.00"
              isColoredBackground
              availableItems={toAssets ?? []}
              selectedItem={data.toAsset}
              assetRules={rules.toAsset}
              amountRules={rules.toAssetAmount}
              balanceFunc={findCryptoBalanceString}
              onMaxButtonClick={(value) => setValue('toAssetAmount', value.toString())}
              onAmountChange={() => (lastEditedFieldRef.current = Side.TO)}
              // exchangeRate={} // TODO: Implement
            />
          </StyledVerticalStack>
          <div className="flex-1 w-full">
            {isBuy && (
              <StyledDropdown<FiatPaymentMethod>
                rootRef={rootRef}
                name="paymentMethod"
                placeholder={translate('general/actions', 'Select') + '...'}
                items={availablePaymentMethods ?? []}
                labelFunc={(item) => translate('screens/payment', PaymentMethodLabels[item])}
                descriptionFunc={(item) => translate('screens/payment', PaymentMethodDescriptions[item])}
                full
              />
            )}
            {isSell && <BankAccountSelector name="bankAccount" />}
          </div>

          <div className="w-full">
            <StyledButton
              type="button"
              isLoading={isFetchingPaymentInfo}
              label={header ?? translate('general/actions', 'Next')}
              width={StyledButtonWidth.FULL}
              disabled={!paymentInfo}
              onClick={() => onConfirm(paymentInfo)}
            />
          </div>
        </StyledVerticalStack>
      </Form>
    </FormProvider>
  );
};
