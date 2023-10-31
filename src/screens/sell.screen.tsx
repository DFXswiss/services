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
  CopyButton,
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledBankAccountListItem,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledModalButton,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { TransactionError } from '@dfx.swiss/react/dist/definitions/transaction';
import { useEffect, useRef, useState } from 'react';
import { Controller, DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { AddBankAccount } from '../components/payment/add-bank-account';
import { QrCopy } from '../components/payment/qr-copy';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useClipboard } from '../hooks/clipboard.hook';
import useDebounce from '../hooks/debounce.hook';
import { useKycDataGuard, useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useSellHelper } from '../hooks/sell-helper.hook';
import { isDefined } from '../util/utils';

interface FormData {
  bankAccount: BankAccount;
  currency: Fiat;
  asset: Asset;
  amount: string;
}

export default function SellScreen(): JSX.Element {
  useSessionGuard();
  useKycDataGuard('/profile');
  const { copy } = useClipboard();
  const { translate } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const { bankAccounts, createAccount, updateAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { blockchain: walletBlockchain, activeWallet } = useWalletContext();
  const { getBalances, sendTransaction, canSendTransaction } = useSellHelper();
  const { availableBlockchains } = useSessionContext();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { navigate } = useNavigation();
  const { assets, assetIn, assetOut, amountIn, bankAccount, blockchain } = useAppParams();
  const { isComplete } = useKycHelper();
  const { toDescription, toSymbol, getCurrency, getDefaultCurrency } = useFiat();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();
  const rootRef = useRef<HTMLDivElement>(null);

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [kycRequired, setKycRequired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [balances, setBalances] = useState<AssetBalance[]>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTxDone, setTxDone] = useState<boolean>(false);
  const [sellTxId, setSellTxId] = useState<string>();
  const [bankAccountSelection, setBankAccountSelection] = useState(false);

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

  const availableBalance = selectedAsset && findBalance(selectedAsset);

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
      .then(validateSell)
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
    if (balances && amount > Number(balance)) {
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

  function validateSell(sell: Sell): Sell | undefined {
    switch (sell.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmountCrypto(sell.minVolume),
            currency: sell.asset.name,
          }),
        );
        return undefined;

      case TransactionError.AMOUNT_TOO_HIGH:
        if (!isComplete) {
          setKycRequired(true);
          return undefined;
        }
    }

    setCustomAmountError(undefined);
    setKycRequired(false);

    return sell;
  }

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
    setIsProcessing(true);

    await updateBankAccount();

    if (canSendTransaction()) {
      if (activeWallet) {
        await sendTransaction(paymentInfo).then(setSellTxId);
      } else {
        return close(paymentInfo, false);
      }
    }

    setTxDone(true);
    setIsProcessing(false);
  }

  function close(sell: Sell, isComplete: boolean) {
    closeServices({ type: CloseType.SELL, isComplete, sell }, isComplete);
  }

  const rules = Utils.createRules({
    bankAccount: Validations.Required,
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  return (
    <Layout
      title={
        bankAccountSelection
          ? translate('screens/sell', 'Select payment account')
          : translate('general/services', 'Sell')
      }
      onBack={bankAccountSelection ? () => setBankAccountSelection(false) : undefined}
      rootRef={rootRef}
    >
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        {paymentInfo && isTxDone ? (
          <StyledVerticalStack gap={4} full>
            <div className="mx-auto">
              <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
            </div>
            <p className="text-dfxBlue-800 text-center px-20">
              {canSendTransaction() && (
                <>
                  {translate('screens/sell', 'Your transaction was executed successfully.')}
                  <br />
                </>
              )}
              {translate(
                'screens/payment',
                'We will inform you about the progress of any purchase or sale via E-mail.',
              )}
            </p>
            {sellTxId && (
              <StyledHorizontalStack gap={2} center>
                <p className="text-dfxBlue-800">{translate('screens/sell', 'Transaction hash')}:</p>
                <span className="text-dfxBlue-800 font-bold">{`${sellTxId.substring(0, 5)}...${sellTxId.substring(
                  sellTxId.length - 5,
                )}`}</span>
                <CopyButton onCopy={() => copy(sellTxId)} />
              </StyledHorizontalStack>
            )}

            <StyledButton
              width={StyledButtonWidth.FULL}
              label={translate('general/actions', 'Close')}
              onClick={() => close(paymentInfo, true)}
              caps={false}
              className="my-4"
              isLoading={isProcessing}
            />
          </StyledVerticalStack>
        ) : (
          <StyledVerticalStack center gap={8} full className="relative">
            {availableAssets && (
              <StyledDropdown<Asset>
                rootRef={rootRef}
                name="asset"
                label={translate('screens/sell', 'Your Wallet')}
                placeholder={translate('general/actions', 'Please select...')}
                labelIcon={IconVariant.WALLET}
                items={availableAssets}
                labelFunc={(item) => item.name}
                balanceFunc={(item) => findBalance(item)?.toString() ?? ''}
                assetIconFunc={(item) => item.name as AssetIconVariant}
                descriptionFunc={(item) => item.blockchain}
                full
              />
            )}
            {bankAccounts && !isCreatingAccount && (
              <Controller
                name="bankAccount"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <div className="w-full">
                      <StyledModalButton
                        onClick={() => setBankAccountSelection(true)}
                        onBlur={onBlur}
                        label={translate('screens/sell', 'Cash out to my bank account')}
                        placeholder={translate('screens/sell', 'Add or select your IBAN')}
                        value={Utils.formatIban(value?.iban) ?? undefined}
                        description={value?.label}
                      />
                    </div>

                    {bankAccountSelection && (
                      <>
                        <div className="absolute h-full w-full z-1 bg-white">
                          {bankAccounts.length && (
                            <>
                              <StyledVerticalStack gap={4}>
                                {bankAccounts.map((account, i) => (
                                  <button
                                    key={i}
                                    className="text-start"
                                    onClick={() => {
                                      onChange(account);
                                      setBankAccountSelection(false);
                                    }}
                                  >
                                    <StyledBankAccountListItem bankAccount={account} />
                                  </button>
                                ))}
                              </StyledVerticalStack>

                              <div className={`h-[1px] bg-dfxGray-400 w-full my-6`} />
                            </>
                          )}

                          <AddBankAccount
                            onSubmit={(account) => {
                              onChange(account);
                              setBankAccountSelection(false);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              />
            )}
            {currencies && (
              <StyledDropdown<Fiat>
                rootRef={rootRef}
                name="currency"
                label={translate('screens/sell', 'Your Currency')}
                placeholder={translate('screens/sell', 'e.g. EUR')}
                labelIcon={IconVariant.BANK}
                items={currencies}
                labelFunc={(item) => item.name}
                descriptionFunc={(item) => toDescription(item)}
                full
              />
            )}
            {selectedAsset && (
              <div className="text-start w-full">
                <StyledInput
                  type={'number'}
                  label={translate('screens/sell', 'Enter your desired payout amount')}
                  placeholder="0.00"
                  prefix={selectedAsset.name}
                  buttonLabel={availableBalance ? 'MAX' : undefined}
                  buttonClick={() => availableBalance && setVal('amount', `${availableBalance}`)}
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
              <>
                {paymentInfo.paymentRequest && !canSendTransaction() && (
                  <div>
                    <p className="font-semibold text-sm text-dfxBlue-800">
                      {translate('screens/sell', 'Pay with your wallet')}
                    </p>
                    <QrCopy data={paymentInfo.paymentRequest} />
                  </div>
                )}
                <div>
                  <div className="pt-4 w-full">
                    <StyledLink
                      label={translate(
                        'screens/payment',
                        'Please note that by using this service you automatically accept our terms and conditions.',
                      )}
                      url={process.env.REACT_APP_TNC_URL}
                      dark
                    />
                  </div>
                  <StyledButton
                    width={StyledButtonWidth.FULL}
                    label={translate(
                      'screens/sell',
                      canSendTransaction()
                        ? 'Complete transaction in your wallet'
                        : 'Click here once you have issued the transaction',
                    )}
                    onClick={() => handleNext(paymentInfo)}
                    caps={false}
                    className="my-4"
                    isLoading={isProcessing}
                  />
                </div>
              </>
            )}
          </StyledVerticalStack>
        )}
      </Form>
    </Layout>
  );
}
