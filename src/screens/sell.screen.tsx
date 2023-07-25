import {
  ApiError,
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  Sell,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useBankAccount,
  useBankAccountContext,
  useFiat,
  useSell,
  useSessionContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AssetIconVariant,
  Form,
  IconVariant,
  StyledBankAccountListItem,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledLink,
  StyledModalDropdown,
  StyledModalWidth,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { AddBankAccount } from '../components/buy/add-bank-account';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useBalanceContext } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import useDebounce from '../hooks/debounce.hook';
import { useKycDataGuard, useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { usePath } from '../hooks/path.hook';

interface FormData {
  bankAccount: BankAccount;
  currency: Fiat;
  asset: Asset;
  amount: string;
}

export function SellScreen(): JSX.Element {
  useSessionGuard();
  useKycDataGuard('/profile');
  const { translate } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const { bankAccounts, createAccount, updateAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { balances } = useBalanceContext();
  const { availableBlockchains } = useSessionContext();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { assetIn, assetOut, amountIn, bankAccount, blockchain } = usePath();
  const { isAllowedToSell } = useKycHelper();
  const { toDescription, toSymbol, getCurrency, getDefaultCurrency } = useFiat();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [kycRequired, setKycRequired] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // form
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { amount: amountIn }, mode: 'onTouched' });

  const data = useWatch({ control });
  const selectedBankAccount = useWatch({ control, name: 'bankAccount' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const enteredAmount = useWatch({ control, name: 'amount' });

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  useEffect(() => {
    const blockchains = blockchain ? [blockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { sellable: true, comingSoon: false });
    setAvailableAssets(blockchainAssets);

    const asset = getAsset(blockchainAssets, assetIn) ?? (blockchainAssets.length === 1 && blockchainAssets[0]);
    if (asset) setVal('asset', asset);
  }, [getAssets]);

  useEffect(() => {
    const currency = getCurrency(currencies, assetOut) ?? getDefaultCurrency(currencies);
    if (currency) setVal('currency', currency);
  }, [assetIn, getCurrency, currencies]);

  useEffect(() => {
    if (bankAccount && bankAccounts?.length) {
      const account = getAccount(bankAccounts, bankAccount);
      if (account) {
        setVal('bankAccount', account);
      } else if (!isCreatingAccount && Validations.Iban(countries).validate(bankAccount)) {
        setIsCreatingAccount(true);
        createAccount({ iban: bankAccount })
          .then((b) => setVal('bankAccount', b))
          .finally(() => setIsCreatingAccount(false));
      }
    }
  }, [bankAccount, getAccount, bankAccounts, countries]);

  // data validation
  const validatedData = validateData(useDebounce(data, 500));
  const dataValid = validatedData != null;

  useEffect(() => {
    if (selectedBankAccount && selectedBankAccount.preferredCurrency)
      setVal('currency', selectedBankAccount.preferredCurrency);
  }, [selectedBankAccount]);

  useEffect(() => {
    if (!enteredAmount) {
      setCustomAmountError(undefined);
      setKycRequired(false);
    }
  }, [enteredAmount]);

  useEffect(() => {
    if (!dataValid) {
      setPaymentInfo(undefined);
      return;
    }

    const amount = Number(validatedData.amount);
    const { asset, currency, bankAccount } = validatedData;

    if (!checkForAmountAvailable(amount, asset)) {
      setPaymentInfo(undefined);
      return;
    }

    setIsLoading(true);
    receiveFor({ iban: bankAccount.iban, currency, amount, asset })
      .then((value) => checkForMinDeposit(value, amount, asset.name))
      .then(checkForKyc)
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

  function checkForAmountAvailable(amount: number, asset: Asset): boolean {
    const balance = findBalance(asset) ?? '0';
    if (amount > Number(balance)) {
      setCustomAmountError(
        translate('screens/sell', 'Entered amount is higher than available balance of {{amount}} {{asset}}', {
          amount: balance,
          asset: asset.name,
        }),
      );
      return false;
    } else {
      setCustomAmountError(undefined);
      return true;
    }
  }

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

  function checkForKyc(sell: Sell | undefined): Sell | undefined {
    if (!sell) return sell;

    setKycRequired(dataValid && !isAllowedToSell(Number(sell.estimatedAmount)));

    return sell;
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0 && data.asset != null && data.bankAccount != null && data.currency != null) {
      return data as FormData;
    }
  }

  function findBalance(asset: Asset): string | undefined {
    const balance =
      balances?.find((b) => +b.token === asset.id) ??
      balances?.find((b) => b.token.toLowerCase() === asset.uniqueName.toLowerCase()) ??
      balances?.find((b) => b.token.toLowerCase() === asset.name.toLowerCase());

    return balance?.amount;
  }

  async function updateBankAccount(): Promise<BankAccount> {
    return updateAccount(selectedBankAccount.id, { preferredCurrency: data.currency as Fiat });
  }

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  async function handleNext(paymentInfo: Sell): Promise<void> {
    await updateBankAccount();

    closeServices({ type: CloseType.SELL, sell: paymentInfo });
  }

  const rules = Utils.createRules({
    bankAccount: Validations.Required,
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  // TODO: (Krysh) add handling for sell screen to replace to profile is user.kycDataIsComplete is false
  return (
    <Layout title={translate('general/services', 'Sell')}>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack gap={8} full>
          {availableAssets && (
            <StyledDropdown<Asset>
              name="asset"
              label={translate('screens/sell', 'Your Wallet')}
              placeholder={translate('general/actions', 'Please select...')}
              labelIcon={IconVariant.WALLET}
              items={availableAssets}
              labelFunc={(item) => item.name}
              balanceFunc={(item) => findBalance(item) ?? ''}
              assetIconFunc={(item) => item.name as AssetIconVariant}
              descriptionFunc={(item) => item.blockchain}
            />
          )}
          {bankAccounts && !isCreatingAccount && (
            <StyledModalDropdown<BankAccount>
              name="bankAccount"
              labelFunc={(item) => Utils.formatIban(item.iban) ?? ''}
              descriptionFunc={(item) => item.label}
              label={translate('screens/sell', 'Cash out to my bank account')}
              placeholder={translate('screens/sell', 'Add or select your IBAN')}
              modal={{
                heading: translate('screens/sell', 'Select your payment account'),
                width: StyledModalWidth.NONE,
                items: bankAccounts,
                itemContent: (b) => <StyledBankAccountListItem bankAccount={b} />,
                form: (onFormSubmit: (item: BankAccount) => void) => <AddBankAccount onSubmit={onFormSubmit} />,
              }}
            />
          )}
          {currencies && (
            <StyledDropdown<Fiat>
              name="currency"
              label={translate('screens/sell', 'Your Currency')}
              placeholder={translate('screens/sell', 'e.g. EUR')}
              labelIcon={IconVariant.BANK}
              items={currencies}
              labelFunc={(item) => item.name}
              descriptionFunc={(item) => toDescription(item)}
            />
          )}
          {selectedAsset && (
            <div className="text-start w-full">
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
              {paymentInfo && paymentInfo.estimatedAmount > 0 && (
                <p className="text-dfxBlue-800 text-start w-full text-xs pt-2 pl-7">
                  {translate(
                    'screens/sell',
                    paymentInfo.minFeeTarget && validatedData?.currency
                      ? '≈ {{estimatedAmount}} {{currency}} (incl. {{fee}} % DFX fee - min. {{minFee}}{{minFeeCurrency}})'
                      : '≈ {{estimatedAmount}} {{currency}} (incl. {{fee}} % DFX fee)',
                    {
                      estimatedAmount: paymentInfo.estimatedAmount,
                      currency: validatedData?.currency.name ?? '',
                      fee: paymentInfo.fee,
                      minFee: paymentInfo.minFeeTarget,
                      minFeeCurrency: toSymbol(validatedData?.currency as Fiat),
                    },
                  )}
                </p>
              )}
              {kycRequired && !customAmountError && <KycHint />}
            </div>
          )}
          {paymentInfo && !kycRequired && (
            <div>
              <div className="pt-4 w-full text-left">
                <StyledLink
                  label={translate(
                    'screens/payment',
                    'Please not that by using this service you automatically accept our terms and conditions.',
                  )}
                  url={process.env.REACT_APP_TNC_URL}
                  dark
                />
              </div>

              <StyledButton
                width={StyledButtonWidth.FULL}
                label={translate('screens/sell', 'Complete transaction in your wallet')}
                onClick={() => handleNext(paymentInfo)}
                caps={false}
                className="my-4"
              />
            </div>
          )}
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}
