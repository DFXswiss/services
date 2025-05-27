import {
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  FiatPaymentMethod,
  useAssetContext,
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
import React, { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { PaymentMethodDescriptions, PaymentMethodLabels } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { AssetInputSection } from './asset-input-section';
import { BankAccountSelector } from './bank-account-selector';
import { DirectionToggleButton } from './direction-toggle';

export enum Side {
  DEPOSIT = 'Deposit',
  WITHDRAW = 'Withdraw',
}

export interface FormData {
  fiatAmount: string;
  assetAmount: string;
  fiat: Fiat;
  asset: Asset;
  paymentMethod: FiatPaymentMethod;
  bankAccount: BankAccount;
}

const AVAILABLE_ASSETS = ['dEURO'];
const EmbeddedWallet = 'CakeWallet';

export const DepositWithdraw: React.FC = () => {
  const { currencies } = useBuy();
  const { wallet } = useAppParams();
  const { user } = useUserContext();
  const { getAssets } = useAssetContext();
  const { getDefaultCurrency } = useFiat();
  const { translate } = useSettingsContext();
  const { isEmbedded, isDfxHosted } = useAppHandlingContext();

  const rootRef = React.useRef<HTMLDivElement>(null);

  const [side, setSide] = useState<Side>(Side.DEPOSIT);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  const methods = useForm<FormData>({ mode: 'onTouched' });
  const {
    control,
    setValue,
    resetField,
    formState: { errors, isValid },
    watch,
  } = methods;

  const selectedFiat = watch('fiat');
  const selectedAsset = watch('asset');
  const selectedPaymentMethod = watch('paymentMethod');

  const availablePaymentMethods: FiatPaymentMethod[] = useMemo(() => {
    const pushCardPayment =
      (isDfxHosted || !isEmbedded) &&
      wallet !== EmbeddedWallet &&
      user?.activeAddress?.wallet !== EmbeddedWallet &&
      (!selectedAsset || selectedAsset?.cardBuyable);

    return [FiatPaymentMethod.BANK, ...(pushCardPayment ? [FiatPaymentMethod.CARD] : [])];
  }, [selectedAsset, isDfxHosted, isEmbedded, wallet, user]);

  const availableCurrencies: Fiat[] = useMemo(
    () =>
      currencies?.filter((c) =>
        selectedPaymentMethod === FiatPaymentMethod.CARD
          ? c.cardSellable
          : selectedPaymentMethod === FiatPaymentMethod.INSTANT
          ? c.instantSellable
          : c.sellable,
      ) ?? [],
    [currencies, selectedPaymentMethod],
  );

  useEffect(() => {
    setValue('paymentMethod', availablePaymentMethods[0]);
  }, [availablePaymentMethods]);

  // Fetch assets
  useEffect(() => {
    const assets = getAssets([Blockchain.ETHEREUM], { buyable: true, comingSoon: false }).filter((a) =>
      AVAILABLE_ASSETS.includes(a.name),
    );
    setAvailableAssets(assets);
    setValue('asset', assets[0]);
  }, [getAssets]);

  // Fetch currencies
  useEffect(() => {
    if (selectedFiat) return;
    const defaultCurrency = getDefaultCurrency(availableCurrencies);
    const currency = defaultCurrency ?? (availableCurrencies && availableCurrencies[0]);
    currency && setValue('fiat', currency);
  }, [availableCurrencies, selectedFiat, getDefaultCurrency]);

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
  });

  const toggleSide = () => {
    setSide((curr) => (curr === Side.DEPOSIT ? Side.WITHDRAW : Side.DEPOSIT));
  };

  return (
    <FormProvider {...methods}>
      <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
        <StyledVerticalStack gap={2} full>
          <div className="px-2 text-dfxBlue-500 text-left text-lg font-semibold">{translate('screens/safe', side)}</div>
          <StyledVerticalStack
            gap={2}
            full
            className={`relative text-left ${side === Side.WITHDRAW ? 'flex-col-reverse' : ''}`}
          >
            <AssetInputSection
              name="fiat"
              label="You spend"
              placeholder="0.00"
              availableItems={availableCurrencies ?? []}
              handleMaxButtonClick={() => {
                // TODO: Implement
                const maxBalance = 2.4;
                setValue('fiatAmount', maxBalance.toString());
              }}
              selectedCurrency={selectedFiat}
              fiatRate={1.1} // TODO: Replace with actual rate
            />
            <DirectionToggleButton onToggle={toggleSide} />
            <AssetInputSection
              name="asset"
              label="You get"
              placeholder="0.00"
              isColoredBackground
              availableItems={availableAssets}
              handleMaxButtonClick={() => {
                // TODO: Implement
                const maxBalance = 3.2;
                setValue('assetAmount', maxBalance.toString());
              }}
              selectedCurrency={selectedAsset}
              fiatRate={1.1} // TODO: Replace with actual rate
            />
          </StyledVerticalStack>
          <div className="flex-1 w-full">
            {side === Side.DEPOSIT ? (
              <StyledDropdown<FiatPaymentMethod>
                rootRef={rootRef}
                name="paymentMethod"
                placeholder={translate('general/actions', 'Select') + '...'}
                items={availablePaymentMethods}
                labelFunc={(item) => translate('screens/payment', PaymentMethodLabels[item])}
                descriptionFunc={(item) => translate('screens/payment', PaymentMethodDescriptions[item])}
                full
              />
            ) : (
              <BankAccountSelector name="bankAccount" />
            )}
          </div>

          <div className="w-full">
            <StyledButton
              type="button"
              isLoading={false}
              label={translate('screens/safe', side === Side.DEPOSIT ? 'Deposit' : 'Withdraw')}
              width={StyledButtonWidth.FULL}
              disabled={!isValid}
              onClick={() => console.log(`${side === Side.DEPOSIT ? 'Deposit' : 'Withdraw'} clicked`)}
            />
          </div>
        </StyledVerticalStack>
      </Form>
    </FormProvider>
  );
};
