import {
  Asset,
  Blockchain,
  Fiat,
  FiatPaymentMethod,
  useAuthContext,
  useFiat,
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
import React, { useCallback, useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { PaymentMethodDescriptions, PaymentMethodLabels } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import useDebounce from 'src/hooks/debounce.hook';

import { useWindowContext } from 'src/contexts/window.context';
import { OrderFormData, OrderType, Side, useOrder } from 'src/hooks/order.hook';
import { blankedAddress } from 'src/util/utils';
import { AssetInputSection } from '../safe/asset-input-section';
import { BankAccountSelector } from '../safe/bank-account-selector';

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

interface OrderInterfaceProps {
  orderType: OrderType;
  header?: string;
  sourceAssets?: Asset[] | Fiat[];
  targetAssets?: Asset[] | Fiat[];
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
    sourceAssets,
    targetAssets,
    defaultValues,
    onFetchPaymentInfo,
    onConfirm,
  } = props;
  const { width } = useWindowContext();
  const { session } = useAuthContext();
  const { getDefaultCurrency } = useFiat();
  const { translate } = useSettingsContext();
  const { isInitialized } = useAppHandlingContext();
  const { blockchain, hideTargetSelection } = useAppParams();
  const {
    isBuy,
    isSell,
    addressItems,
    cryptoBalances,
    paymentInfo,
    isFetchingPaymentInfo,
    lastEditedFieldRef,
    setSelectedAddress,
    getAvailableCurrencies,
    getAvailablePaymentMethods,
    handlePaymentInfoFetch,
  } = useOrder({
    orderType,
    sourceAssets,
    targetAssets,
  });

  const rootRef = React.useRef<HTMLDivElement>(null);

  const methods = useForm<OrderFormData>({ mode: 'onChange', defaultValues });

  const {
    watch,
    control,
    setValue,
    formState: { errors },
  } = methods;

  const data = watch();
  const debouncedData = useDebounce(data, 500);

  const availablePaymentMethods: FiatPaymentMethod[] = useMemo(
    () => getAvailablePaymentMethods(data.targetAsset as Asset),
    [getAvailablePaymentMethods, data.targetAsset],
  );

  const availableCurrencies: Fiat[] = useMemo(
    () => getAvailableCurrencies(data.paymentMethod),
    [getAvailableCurrencies, data.paymentMethod],
  );

  useEffect(() => setSelectedAddress(data.address), [data.address]);

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
    if (isBuy && sourceAssets?.length) {
      setValue('sourceAsset', sourceAssets.find((c) => c.name === defaultCurrency?.name) ?? sourceAssets[0]);
    } else if (isSell && targetAssets?.length) {
      setValue('targetAsset', targetAssets.find((c) => c.name === defaultCurrency?.name) ?? targetAssets[0]);
    }
  }, [sourceAssets, targetAssets, availableCurrencies, orderType, setValue, getDefaultCurrency]);

  useEffect(() => {
    if (debouncedData) handlePaymentInfoFetch(debouncedData, onFetchPaymentInfo, setValue);
  }, [debouncedData, onFetchPaymentInfo, setValue, handlePaymentInfoFetch]);

  const findCryptoBalanceString: (asset: Asset) => string = useCallback(
    (asset: Asset): string => {
      const balance = cryptoBalances.find((b) => b.asset.id === asset.id)?.amount;
      return balance != null ? Utils.formatAmountCrypto(balance) : '';
    },
    [cryptoBalances],
  );

  const rules = Utils.createRules({
    sourceAmount: Validations.Required,
    sourceAsset: Validations.Required,
    // TODO (later): Complete rules
  });

  return (
    <FormProvider {...methods}>
      <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
        <StyledVerticalStack gap={2} full>
          <div className="px-2 text-dfxBlue-500 text-left text-lg font-semibold">{header}</div>
          <AssetInputSection
            name="sourceAsset"
            label={fromInputLabel}
            placeholder="0.00"
            availableItems={sourceAssets ?? []}
            selectedItem={data.sourceAsset}
            assetRules={rules.sourceAsset}
            amountRules={rules.sourceAmount}
            balanceFunc={findCryptoBalanceString}
            onMaxButtonClick={(value) => {
              setValue('sourceAmount', value.toString(), { shouldTouch: true });
              lastEditedFieldRef.current = Side.FROM;
            }}
            onAmountChange={() => (lastEditedFieldRef.current = Side.FROM)}
            // exchangeRate={} // TODO: Implement
          />
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
          <div className={`flex ${isSell ? 'flex-col-reverse' : 'flex-col'} w-full gap-2`}>
            <AssetInputSection
              name="targetAsset"
              label={toInputLabel}
              placeholder="0.00"
              isColoredBackground
              availableItems={targetAssets ?? []}
              selectedItem={data.targetAsset}
              assetRules={rules.targetAsset}
              amountRules={rules.targetAmount}
              balanceFunc={findCryptoBalanceString}
              onMaxButtonClick={(value) => {
                setValue('targetAmount', value.toString(), { shouldTouch: true });
                lastEditedFieldRef.current = Side.TO;
              }}
              onAmountChange={() => (lastEditedFieldRef.current = Side.TO)}
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
          </div>
          <div className="flex-1 w-full">{isSell && <BankAccountSelector name="bankAccount" />}</div>
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
