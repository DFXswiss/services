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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PaymentMethodDescriptions, PaymentMethodLabels } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { OrderPaymentInfo } from 'src/dto/order.dto';
import { useAppParams } from 'src/hooks/app-params.hook';
import useDebounce from 'src/hooks/debounce.hook';
import { OrderFormData, OrderType, Side, useOrder } from 'src/hooks/order.hook';
import { blankedAddress } from 'src/util/utils';
import { AssetInput } from './asset-input';
import { BankAccountSelector } from './bank-account-selector';
import { PaymentInfo } from './payment-info';

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
  pairMap?: (asset: string) => Asset | Fiat | undefined;
  onFetchPaymentInfo: (data: OrderFormData) => Promise<OrderPaymentInfo>;
  showPaymentNameForm: () => void;
  confirmPayment: () => Promise<void>;
}

export const OrderInterface: React.FC<OrderInterfaceProps> = ({
  orderType,
  header,
  sourceAssets,
  targetAssets,
  fromInputLabel,
  toInputLabel,
  defaultValues,
  pairMap,
  onFetchPaymentInfo,
  confirmPayment,
  showPaymentNameForm,
}: OrderInterfaceProps) => {
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
    paymentInfoError,
    amountError,
    kycError,
    setSelectedAddress,
    getAvailableCurrencies,
    getAvailablePaymentMethods,
    handlePaymentInfoFetch,
  } = useOrder({ orderType, sourceAssets, targetAssets });

  const rootRef = React.useRef<HTMLDivElement>(null);

  const [bankAccountSelection, setBankAccountSelection] = useState(false);

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
      setValue('sourceAsset', sourceAssets?.find((c) => c.name === defaultCurrency?.name) ?? sourceAssets[0]);
    } else if (isSell && targetAssets?.length) {
      setValue('targetAsset', targetAssets?.find((c) => c.name === defaultCurrency?.name) ?? targetAssets[0]);
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
    <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
      <StyledVerticalStack gap={2} full>
        <div className="px-2 text-dfxBlue-500 text-left text-lg font-semibold">{header}</div>
        <AssetInput
          control={control}
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
          forceErrorMessage={
            amountError && translate(amountError.key, amountError.defaultValue, amountError.interpolation)
          }
        />
        {isBuy && (
          <StyledDropdown<FiatPaymentMethod>
            control={control}
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
          {targetAssets ? (
            <AssetInput
              control={control}
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
            />
          ) : null}
          {!hideTargetSelection && addressItems?.length ? (
            <StyledDropdown<Address>
              control={control}
              rootRef={rootRef}
              name="address"
              items={addressItems}
              labelFunc={(item) => blankedAddress(item.address, { width })}
              descriptionFunc={(item) => item.label}
              full
              forceEnable
            />
          ) : null}
        </div>
        {isSell && (
          <BankAccountSelector
            value={data.bankAccount}
            onChange={(account) => setValue('bankAccount', account)}
            placeholder={translate('screens/sell', 'Add or select your IBAN')}
            // TODO (later): connect bankAccountSelection back button
            isModalOpen={bankAccountSelection}
            onModalToggle={setBankAccountSelection}
            className="left-0 right-0 px-4 top-4"
          />
        )}
        <div className="w-full">
          <StyledButton
            type="button"
            isLoading={isFetchingPaymentInfo}
            label={header ?? translate('general/actions', 'Next')}
            width={StyledButtonWidth.FULL}
            disabled={!paymentInfo}
            hidden={!!paymentInfo}
            onClick={() => debouncedData && handlePaymentInfoFetch(debouncedData, onFetchPaymentInfo, setValue)}
          />
        </div>
        <PaymentInfo
          className="pt-4"
          isLoading={false}
          orderType={orderType}
          paymentInfo={paymentInfo?.paymentInfo}
          paymentMethod={data?.paymentMethod}
          sourceAsset={data?.sourceAsset ?? pairMap?.(data?.targetAsset?.name)}
          targetAsset={data?.targetAsset ?? pairMap?.(data?.sourceAsset?.name)}
          amountError={amountError}
          kycError={kycError}
          errorMessage={paymentInfoError}
          retry={() => debouncedData && handlePaymentInfoFetch(debouncedData, onFetchPaymentInfo, setValue)}
          showPaymentNameForm={showPaymentNameForm}
          confirmPayment={confirmPayment}
        />
      </StyledVerticalStack>
    </Form>
  );
};
