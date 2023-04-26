import { DeepPartial, useForm, useWatch } from 'react-hook-form';
import { useBuyContext } from '../api/contexts/buy.context';
import { BankAccount } from '../api/definitions/bank-account';
import { Layout } from '../components/layout';
import { useLanguageContext } from '../contexts/language.context';
import StyledBankAccountListItem from '../stories/form/StyledBankAccountListItem';
import StyledModalDropdown from '../stories/form/StyledModalDropdown';
import { Utils } from '../utils';
import { Fiat } from '../api/definitions/fiat';
import { Asset } from '../api/definitions/asset';
import { useEffect, useState } from 'react';
import { AddBankAccount } from '../components/buy/add-bank-account';
import StyledVerticalStack from '../stories/layout-helpers/StyledVerticalStack';
import StyledDropdown from '../stories/form/StyledDropdown';
import { IconVariant } from '../stories/DfxIcon';
import { useFiat } from '../api/hooks/fiat.hook';
import StyledInput from '../stories/form/StyledInput';
import useDebounce from '../hooks/debounce.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import Form from '../stories/form/Form';
import Validations from '../validations';
import { useAssetContext } from '../api/contexts/asset.context';
import { useSessionContext } from '../api/contexts/session.context';
import { AppPage, useAppHandlingContext } from '../contexts/app-handling.context';
import { useBalanceContext } from '../contexts/balance.context';
import { AssetIconVariant } from '../stories/DfxAssetIcon';
import { StyledModalWidths } from '../stories/StyledModal';
import StyledButton, { StyledButtonWidths } from '../stories/StyledButton';
import { useSell } from '../api/hooks/sell.hook';
import { Sell } from '../api/definitions/sell';
import { ApiError } from '../api/definitions/error';
import { KycHint } from '../components/kyc-hint';

interface FormData {
  bankAccount: BankAccount;
  currency: Fiat;
  asset: Asset;
  amount: string;
}

export function SellScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const { openAppPage } = useAppHandlingContext();
  const { bankAccounts, currencies, updateAccount } = useBuyContext();
  const { balances } = useBalanceContext();
  const { blockchain, availableBlockchains } = useSessionContext();
  const { assets } = useAssetContext();
  const { isAllowedToSell } = useKycHelper();
  const { toDescription } = useFiat();
  const { receiveFor } = useSell();
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ mode: 'onTouched' });
  const data = useWatch({ control });
  const validatedData = validateData(useDebounce(data, 500));
  const selectedBankAccount = useWatch({ control, name: 'bankAccount' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const enteredAmount = useWatch({ control, name: 'amount' });

  const dataValid = validatedData != null;

  useEffect(() => {
    if (selectedBankAccount && selectedBankAccount.preferredCurrency)
      setValue('currency', selectedBankAccount.preferredCurrency);
  }, [selectedBankAccount]);

  useEffect(() => {
    if ((enteredAmount && enteredAmount.length === 0) || !enteredAmount) {
      setCustomAmountError(undefined);
      setKycRequired(false);
    }
  }, [enteredAmount]);

  useEffect(() => {
    if (assets) {
      const blockchainAssets = availableBlockchains
        ?.filter((b) => (blockchain ? blockchain === b : true))
        .map((blockchain) => assets.get(blockchain))
        .reduce((prev, curr) => prev?.concat(curr ?? []), [])
        ?.filter((asset) => asset.sellable);
      blockchainAssets?.length === 1 && setValue('asset', blockchainAssets[0], { shouldValidate: true });
      setAvailableAssets(blockchainAssets ?? []);
    }
  }, [assets]);

  useEffect(() => {
    if (!dataValid) {
      setPaymentInfo(undefined);
      return;
    }

    const amount = Number(validatedData.amount);
    setIsLoading(true);
    receiveFor({
      iban: validatedData.bankAccount.iban,
      currency: validatedData.currency,
      amount,
      asset: validatedData.asset,
    })
      .then((value) => checkForMinDeposit(value, amount, validatedData.asset.name))
      .then((value) => checkForAmountAvailable(amount, validatedData.asset.name, value))
      .then((value) => {
        setKycRequired(dataValid && !isAllowedToSell(Number(value?.estimatedAmount)));
        return value;
      })
      .then(setPaymentInfo)
      .catch((error: ApiError) => {
        if (error.statusCode === 400 && error.message === 'Ident data incomplete') {
          setKycRequired(true);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [validatedData]);

  function checkForMinDeposit(sell: Sell, amount: number, currency: string): Sell | undefined {
    if (sell.minVolume > amount) {
      setCustomAmountError(
        translate('screens/sell', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
          amount: Utils.formatAmountCrypto(sell.minVolume),
          currency,
        }),
      );
      return undefined;
    } else {
      setCustomAmountError(undefined);
      return sell;
    }
  }

  function checkForAmountAvailable(amount: number, asset: string, sell?: Sell): Sell | undefined {
    if (!sell) return sell;
    const balance = balances?.find((balance) => balance.token === asset);
    if (amount > Number(balance?.amount ?? 0)) {
      setCustomAmountError(
        translate('screens/sell', 'Entered amount is higher than available balance of {{amount}} {{asset}}', {
          amount: balance?.amount ?? 0,
          asset,
        }),
      );
    } else {
      setCustomAmountError(undefined);
      return sell;
    }
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0 && data.asset != null && data.bankAccount != null && data.currency != null) {
      return data as FormData;
    }
  }

  async function updateBankAccount(): Promise<BankAccount> {
    return updateAccount(selectedBankAccount.id, { preferredCurrency: data.currency as Fiat });
  }

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  async function handleNext(): Promise<void> {
    await updateBankAccount();
    // TODO: (Krysh either receive sell id and add as param or use all possible data like depositAddress and co
    openAppPage(AppPage.SELL);
  }

  const rules = Utils.createRules({
    bankAccount: Validations.Required,
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  // TODO: (Krysh) add handling for sell screen to replace to profile is user.kycDataIsComplete is false
  return (
    <Layout backTitle={translate('screens/sell', 'Sell')}>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack gap={8} full>
          {assets && (
            <StyledDropdown<Asset>
              name="asset"
              label={translate('screens/sell', 'YOUR WALLET')}
              placeholder={translate('general/actions', 'Please select...')}
              labelIcon={IconVariant.WALLET}
              items={availableAssets}
              labelFunc={(item) => item.name}
              balanceFunc={(item) => balances?.find((balance) => balance.token === item.name)?.amount ?? ''}
              assetIconFunc={(item) => item.name as AssetIconVariant}
              descriptionFunc={(item) => item.blockchain}
            />
          )}
          {bankAccounts && (
            <StyledModalDropdown<BankAccount>
              name="bankAccount"
              labelFunc={(item) => Utils.formatIban(item.iban) ?? ''}
              descriptionFunc={(item) => item.label}
              label={translate('screens/sell', 'Cash out to my bank account')}
              placeholder={translate('screens/sell', 'Add or select your IBAN')}
              modal={{
                heading: translate('screens/sell', 'Select your payment account'),
                width: StyledModalWidths.NONE,
                items: bankAccounts,
                itemContent: (b) => <StyledBankAccountListItem bankAccount={b} />,
                form: (onFormSubmit: (item: BankAccount) => void) => <AddBankAccount onSubmit={onFormSubmit} />,
              }}
            />
          )}
          {currencies && (
            <StyledDropdown<Fiat>
              name="currency"
              label={translate('screens/sell', 'YOUR CURRENCY')}
              placeholder="e.g. EUR"
              labelIcon={IconVariant.BANK}
              items={currencies}
              labelFunc={(item) => item.name}
              descriptionFunc={(item) => toDescription(item)}
            />
          )}
        </StyledVerticalStack>
        {selectedAsset && (
          <div className="mt-8 text-start w-full">
            <StyledInput
              type={'number'}
              label={translate('screens/sell', 'Enter your desired payout amount')}
              placeholder="0.00"
              prefix={selectedAsset.name}
              name="amount"
              forceError={kycRequired || customAmountError != null}
              forceErrorMessage={customAmountError}
              loading={isLoading}
            />
            {kycRequired && !customAmountError && <KycHint />}
          </div>
        )}
        {paymentInfo && !kycRequired && (
          <>
            {paymentInfo.estimatedAmount > 0 && (
              <p className="text-dfxBlue-800 text-start w-full text-xs pl-12">
                {translate('screens/sell', '≈ {{estimatedAmount}} {{currency}} (incl. all fees)', {
                  estimatedAmount: paymentInfo.estimatedAmount,
                  currency: validatedData?.currency.name ?? '',
                })}
              </p>
            )}
            <StyledButton
              className="mt-4"
              width={StyledButtonWidths.FULL}
              label={translate('screens/sell', 'Complete transaction in your wallet')}
              onClick={handleNext}
              caps={false}
            />
          </>
        )}
      </Form>
    </Layout>
  );
}
