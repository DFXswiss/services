import { Asset, BankAccount, Fiat, FiatPaymentMethod, useBuy, useFiat, Utils, Validations } from '@dfx.swiss/react';
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
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAssetManagement } from 'src/hooks/safe/use-asset-management.hook';
import { AssetInputSection } from './asset-input-section';
import { BankAccountSelector } from './bank-account-selector';
import { DirectionToggleButton } from './direction-toggle-button';

export enum Side {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export interface FormData {
  fiatAmount: string;
  assetAmount: string;
  fiat: Fiat;
  asset: Asset;
  paymentMethod: FiatPaymentMethod;
  bankAccount: BankAccount;
}

export const DepositWithdraw: React.FC = () => {
  const { availableAssets } = useAssetManagement();
  const { currencies } = useBuy();
  const { getDefaultCurrency } = useFiat();
  const { translate } = useSettingsContext();
  const rootRef = React.useRef<HTMLDivElement>(null);

  const [side, setSide] = useState<Side>(Side.DEPOSIT);

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
  const selectedBankAccount = watch('bankAccount');

  // TODO: Does this need additional logic, e.g. isDfxHosted etc.?
  const availablePaymentMethods = useMemo(
    () => [FiatPaymentMethod.BANK, ...(selectedAsset?.cardBuyable ? [FiatPaymentMethod.CARD] : [])],
    [selectedAsset?.cardBuyable],
  );

  const availableCurrencies = currencies?.filter((c) =>
    selectedPaymentMethod === FiatPaymentMethod.CARD
      ? c.cardSellable
      : selectedPaymentMethod === FiatPaymentMethod.INSTANT
      ? c.instantSellable
      : c.sellable,
  );

  useEffect(() => {
    if (selectedFiat) return;
    const defaultCurrency = getDefaultCurrency(availableCurrencies);
    const currency = defaultCurrency ?? (availableCurrencies && availableCurrencies[0]);
    currency && setValue('fiat', currency);
  }, [availableCurrencies, selectedFiat, getDefaultCurrency]);

  useEffect(() => {
    if (selectedAsset) return;
    const defaultAsset = availableAssets.length && availableAssets[0];
    defaultAsset && setValue('asset', defaultAsset);
  }, [availableAssets, selectedAsset]);

  useEffect(() => {
    if (side === Side.DEPOSIT) {
      setValue('paymentMethod', availablePaymentMethods[0]);
      resetField('bankAccount');
    } else {
      resetField('paymentMethod');
    }
  }, [side, availablePaymentMethods]);

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
  });

  const toggleSide = () => {
    setSide(side === Side.DEPOSIT ? Side.WITHDRAW : Side.DEPOSIT);
  };

  return (
    <FormProvider {...methods}>
      <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
        <StyledVerticalStack gap={2} full center>
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
