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
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { AddBankAccount } from '../components/payment/add-bank-account';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useParamContext } from '../contexts/param.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import useDebounce from '../hooks/debounce.hook';
import { useKycDataGuard, useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { isDefined } from '../util/utils';

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
  const { getBalances, blockchain: walletBlockchain } = useWalletContext();
  const { availableBlockchains } = useSessionContext();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { navigate } = useNavigation();
  const { assets, assetIn, assetOut, amountIn, bankAccount, blockchain } = useParamContext();
  const { isAllowedToSell } = useKycHelper();
  const { toDescription, toSymbol, getCurrency, getDefaultCurrency } = useFiat();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [balances, setBalances] = useState<AssetBalance[]>();

  useEffect(() => {
    availableAssets && getBalances(availableAssets).then(setBalances);
  }, [getBalances, availableAssets]);

  // form
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ mode: 'onTouched' });

  const data = useWatch({ control });
  const selectedBankAccount = useWatch({ control, name: 'bankAccount' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const enteredAmount = useWatch({ control, name: 'amount' });

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  useEffect(() => {
    const activeBlockchain = walletBlockchain ?? blockchain;
    const blockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { sellable: true, comingSoon: false });
    const activeAssets = assets
      ? assets
          .split(',')
          .map((a) => getAsset(blockchainAssets, a))
          .filter(isDefined)
      : blockchainAssets;
    setAvailableAssets(activeAssets);

    const asset = getAsset(activeAssets, assetIn) ?? (activeAssets.length === 1 && activeAssets[0]);
    if (asset) setVal('asset', asset);
  }, [assetIn, getAsset, getAssets, blockchain, walletBlockchain]);

  useEffect(() => {
    const currency = getCurrency(currencies, assetOut) ?? getDefaultCurrency(currencies);
    if (currency) setVal('currency', currency);
  }, [assetOut, getCurrency, currencies]);

  useEffect(() => {
    if (amountIn) setVal('amount', amountIn);
  }, [amountIn]);

  useEffect(() => {
    if (bankAccount && bankAccounts?.length) {
      const account = getAccount(bankAccounts, bankAccount);
      if (account) {
        setVal('bankAccount', account);
      } else if (!isCreatingAccount && Validations.Iban(countries).validate(bankAccount) === true) {
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
      .then(setPaymentInfo)
      .catch((error: ApiError) => {
        if (error.statusCode === 400 && error.message === 'Ident data incomplete') {
          navigate('/profile');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [validatedData]);

  function checkForAmountAvailable(amount: number, asset: Asset): boolean {
    const balance = findBalance(asset) ?? 0;
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
        translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
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

  const kycRequired = paymentInfo && !isAllowedToSell(paymentInfo.estimatedAmount);

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0 && data.asset != null && data.bankAccount != null && data.currency != null) {
      return data as FormData;
    }
  }

  function findBalance(asset: Asset): number | undefined {
    return balances?.find((b) => b.asset.id === asset.id)?.amount;
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
              balanceFunc={(item) => findBalance(item)?.toString() ?? ''}
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
                      minFeeCurrency: validatedData?.currency ? toSymbol(validatedData.currency) : '',
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
