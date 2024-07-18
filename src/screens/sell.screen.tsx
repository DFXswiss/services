import {
  ApiError,
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  Sell,
  TransactionError,
  TransactionType,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useAuthContext,
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
  SpinnerSize,
  StyledBankAccountListItem,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledModalButton,
  StyledSearchDropdown,
  StyledTextBox,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { AssetCategory } from '@dfx.swiss/react/dist/definitions/asset';
import { useEffect, useRef, useState } from 'react';
import { Controller, DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { AddressSwitch } from 'src/components/payment/address-switch';
import { PaymentInformationContent } from 'src/components/payment/payment-info-sell';
import { useWindowContext } from 'src/contexts/window.context';
import { ErrorHint } from '../components/error-hint';
import { ExchangeRate } from '../components/exchange-rate';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { AddBankAccount } from '../components/payment/add-bank-account';
import { SellCompletion } from '../components/payment/sell-completion';
import { SanctionHint } from '../components/sanction-hint';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useBlockchain } from '../hooks/blockchain.hook';
import useDebounce from '../hooks/debounce.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useTxHelper } from '../hooks/tx-helper.hook';
import { blankedAddress } from '../util/utils';

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

interface FormData {
  bankAccount: BankAccount;
  currency: Fiat;
  asset: Asset;
  amount: string;
  address: Address;
}

interface CustomAmountError {
  key: string;
  defaultValue: string;
  interpolation?: Record<string, string | number> | undefined;
  hideInfos: boolean;
}

export default function SellScreen(): JSX.Element {
  useAddressGuard();

  const { translate, translateError } = useSettingsContext();
  const { isInitialized, closeServices } = useAppHandlingContext();
  const { logout } = useSessionContext();
  const { session } = useAuthContext();
  const { width } = useWindowContext();
  const { bankAccounts, createAccount, updateAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { blockchain: walletBlockchain, activeWallet, switchBlockchain } = useWalletContext();
  const { getBalances, sendTransaction, canSendTransaction } = useTxHelper();
  const { assets, getAssets } = useAssetContext();
  const { getAsset, isSameAsset } = useAsset();
  const { navigate } = useNavigation();
  const {
    assets: assetFilter,
    assetIn,
    assetOut,
    amountIn,
    bankAccount,
    blockchain,
    externalTransactionId,
    setParams,
    hideTargetSelection,
    availableBlockchains,
  } = useAppParams();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { currencies, receiveFor } = useSell();
  const { countries } = useUserContext();
  const { toString } = useBlockchain();
  const rootRef = useRef<HTMLDivElement>(null);

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<CustomAmountError>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [balances, setBalances] = useState<AssetBalance[]>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTxDone, setTxDone] = useState<boolean>(false);
  const [sellTxId, setSellTxId] = useState<string>();
  const [bankAccountSelection, setBankAccountSelection] = useState(false);
  const [showsSwitchScreen, setShowsSwitchScreen] = useState(false);

  useEffect(() => {
    availableAssets && getBalances(availableAssets).then(setBalances);
  }, [getBalances, availableAssets]);

  // form
  const { control, handleSubmit, setValue, resetField } = useForm<FormData>({ mode: 'onTouched' });

  const data = useWatch({ control });
  const selectedBankAccount = useWatch({ control, name: 'bankAccount' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const enteredAmount = useWatch({ control, name: 'amount' });
  const selectedAddress = useWatch({ control, name: 'address' });

  const availableBalance = selectedAsset && findBalance(selectedAsset);

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  const filteredAssets = assets && filterAssets(Array.from(assets.values()).flat(), assetFilter);
  const blockchains = availableBlockchains?.filter((b) => filteredAssets?.some((a) => a.blockchain === b));

  const addressItems: Address[] =
    session?.address && blockchains?.length
      ? [
          ...blockchains.map((b) => ({
            address: session.address ?? '',
            label: toString(b),
            chain: b,
          })),
          {
            address: translate('screens/buy', 'Switch address'),
            label: translate('screens/buy', 'Login with a different address'),
          },
        ]
      : [];

  useEffect(() => {
    const activeBlockchain = walletBlockchain ?? blockchain;
    const blockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { sellable: true, comingSoon: false }).filter(
      (a) => a.category === AssetCategory.PUBLIC || a.name === assetIn,
    );
    const activeAssets = filterAssets(blockchainAssets, assetFilter);

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

  useEffect(() => setAddress(), [session?.address, translate]);

  useEffect(() => {
    if (selectedAddress) {
      if (selectedAddress.chain) {
        if (blockchain !== selectedAddress.chain) {
          setParams({ blockchain: selectedAddress.chain });
          switchBlockchain(selectedAddress.chain);
          resetField('asset');
          setAvailableAssets(undefined);
        }
      } else {
        setShowsSwitchScreen(true);
        setAddress();
      }
    }
  }, [selectedAddress]);

  useEffect(() => {
    if (bankAccount && bankAccounts) {
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

  useEffect(() => {
    if (selectedBankAccount && selectedBankAccount.preferredCurrency)
      setVal('currency', selectedBankAccount.preferredCurrency);
  }, [selectedBankAccount]);

  useEffect(() => {
    if (!enteredAmount) {
      setCustomAmountError(undefined);
    }
  }, [enteredAmount]);

  // data validation
  const validatedData = validateData(useDebounce(data, 500));
  const dataValid = validatedData != null;

  useEffect(() => {
    let isRunning = true;

    setErrorMessage(undefined);

    if (!dataValid) {
      setPaymentInfo(undefined);
      setIsLoading(false);
      setIsPriceLoading(false);
      return;
    }

    const amount = Number(validatedData.amount);
    const { asset, currency, bankAccount } = validatedData;
    const data = { iban: bankAccount.iban, currency, amount, asset, externalTransactionId };

    setIsLoading(true);
    receiveFor(data)
      .then((sell) => {
        if (isRunning) {
          validateSell(sell);
          setPaymentInfo(sell);

          // load exact price
          if (sell) {
            setIsPriceLoading(true);
            receiveFor({ ...data, exactPrice: true })
              .then((info) => {
                if (isRunning) {
                  setPaymentInfo(info);
                  setIsPriceLoading(false);
                }
              })
              .catch(console.error);
          }
        }
      })
      .catch((error: ApiError) => {
        if (isRunning) {
          if (error.statusCode === 400 && error.message === 'Ident data incomplete') {
            navigate('/profile');
          } else {
            setPaymentInfo(undefined);
            setErrorMessage(error.message ?? 'Unknown error');
          }
        }
      })
      .finally(() => isRunning && setIsLoading(false));

    return () => {
      isRunning = false;
    };
  }, [validatedData]);

  function validateSell(sell: Sell): void {
    setCustomAmountError(undefined);
    setKycError(undefined);

    // tx errors
    switch (sell.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError({
          key: 'screens/payment',
          defaultValue: 'Entered amount is below minimum deposit of {{amount}} {{currency}}',
          interpolation: {
            amount: Utils.formatAmountCrypto(sell.minVolume),
            currency: sell.asset.name,
          },
          hideInfos: true,
        });
        return;

      case TransactionError.AMOUNT_TOO_HIGH:
        setCustomAmountError({
          key: 'screens/payment',
          defaultValue: 'Entered amount is above maximum deposit of {{amount}} {{currency}}',
          interpolation: {
            amount: Utils.formatAmountCrypto(sell.maxVolume),
            currency: sell.asset.name,
          },
          hideInfos: true,
        });
        return;

      case TransactionError.LIMIT_EXCEEDED:
      case TransactionError.KYC_REQUIRED:
      case TransactionError.KYC_DATA_REQUIRED:
      case TransactionError.KYC_REQUIRED_INSTANT:
      case TransactionError.BANK_TRANSACTION_MISSING:
        setKycError(sell.error);
        return;
    }

    // balance check
    const balance = findBalance(sell.asset) ?? 0;
    if (balances && sell.amount > Number(balance)) {
      setCustomAmountError({
        key: 'screens/payment',
        defaultValue: 'Entered amount is higher than available balance of {{amount}} {{asset}}',
        interpolation: {
          amount: balance,
          asset: sell.asset.name,
        },
        hideInfos: false,
      });
      return;
    }
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0 && data.asset != null && data.bankAccount != null && data.currency != null) {
      return data as FormData;
    }
  }

  function findBalance(asset: Asset): number | undefined {
    return balances?.find((b) => b.asset.id === asset.id)?.amount;
  }

  function findBalanceString(asset: Asset): string {
    const balance = findBalance(asset);
    return balance != null ? Utils.formatAmountCrypto(balance) : '';
  }

  async function updateBankAccount(): Promise<BankAccount> {
    return updateAccount(selectedBankAccount.id, { preferredCurrency: data.currency as Fiat });
  }

  function getPaymentInfoString(paymentInfo: Sell, selectedBankAccount: BankAccount): string {
    return (
      paymentInfo &&
      selectedBankAccount &&
      translate(
        'screens/sell',
        'Send the selected amount to the address below. This address can be used multiple times, it is always the same for payouts from {{chain}} to your IBAN {{iban}} in {{currency}}.',
        {
          chain: toString(paymentInfo.asset.blockchain),
          currency: paymentInfo.currency.name,
          iban: Utils.formatIban(selectedBankAccount.iban) ?? '',
        },
      )
    );
  }

  // misc
  function filterAssets(assets: Asset[], filter?: string): Asset[] {
    if (!filter) return assets;

    const allowedAssets = filter.split(',');
    return assets.filter((a) => allowedAssets.some((f) => isSameAsset(a, f)));
  }

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  function setAddress() {
    if (isInitialized && session?.address && addressItems) {
      const address = addressItems.find((a) => blockchain && a.chain === blockchain) ?? addressItems[0];
      setVal('address', address);
    }
  }

  function onAddressSwitch() {
    logout();
    navigate('/connect', { setRedirect: true });
  }

  async function handleNext(paymentInfo: Sell): Promise<void> {
    setIsProcessing(true);

    await updateBankAccount();

    if (canSendTransaction() && !activeWallet)
      return closeServices({ type: CloseType.SELL, isComplete: false, sell: paymentInfo }, false);

    try {
      if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSellTxId);

      setTxDone(true);
    } finally {
      setIsProcessing(false);
    }
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
          : translate('navigation/links', 'Sell')
      }
      onBack={bankAccountSelection ? () => setBankAccountSelection(false) : undefined}
      textStart
      rootRef={rootRef}
    >
      {showsSwitchScreen ? (
        <AddressSwitch onClose={(r) => (r ? onAddressSwitch() : setShowsSwitchScreen(false))} />
      ) : paymentInfo && isTxDone ? (
        <SellCompletion paymentInfo={paymentInfo} navigateOnClose={true} txId={sellTxId} />
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={{}}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
          hasFormElement={false}
        >
          {availableAssets && currencies && bankAccounts && (
            <StyledVerticalStack gap={8} full center className="relative">
              <StyledVerticalStack gap={2} full>
                <h2 className="text-dfxGray-700">{translate('screens/buy', 'You spend')}</h2>
                <StyledHorizontalStack gap={1}>
                  <div className="flex-[3_1_9rem]">
                    <StyledInput
                      type="number"
                      placeholder="0.00"
                      prefix={selectedAsset && selectedAsset.name}
                      name="amount"
                      buttonLabel={availableBalance ? 'MAX' : undefined}
                      buttonClick={() => availableBalance && setVal('amount', `${availableBalance}`)}
                      forceError={
                        (kycError && kycError === TransactionError.BANK_TRANSACTION_MISSING) ||
                        customAmountError != null
                      }
                      forceErrorMessage={
                        customAmountError &&
                        translate(
                          customAmountError.key,
                          customAmountError.defaultValue,
                          customAmountError.interpolation,
                        )
                      }
                      full
                    />
                  </div>

                  <div className="flex-[1_0_9rem]">
                    <StyledSearchDropdown<Asset>
                      rootRef={rootRef}
                      name="asset"
                      placeholder={translate('general/actions', 'Select...')}
                      items={availableAssets}
                      labelFunc={(item) => item.name}
                      balanceFunc={findBalanceString}
                      assetIconFunc={(item) => item.name as AssetIconVariant}
                      descriptionFunc={(item) => toString(item.blockchain)}
                      filterFunc={(item: Asset, search?: string | undefined) =>
                        !search || item.name.toLowerCase().includes(search.toLowerCase())
                      }
                      hideBalanceWhenClosed
                      full
                    />
                  </div>
                </StyledHorizontalStack>
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
              </StyledVerticalStack>

              <StyledVerticalStack gap={2} full>
                <h2 className="text-dfxGray-700">{translate('screens/buy', 'You get about')}</h2>
                <StyledHorizontalStack gap={1}>
                  <div className="flex-[3_1_9rem]">
                    <StyledTextBox
                      text={
                        paymentInfo && !isLoading ? `≈ ${Utils.formatAmountCrypto(paymentInfo.estimatedAmount)}` : ' '
                      }
                      loading={!isLoading && isPriceLoading}
                      full
                    />
                  </div>
                  <div className="flex-[1_0_9rem]">
                    <StyledDropdown<Fiat>
                      rootRef={rootRef}
                      name="currency"
                      placeholder={translate('general/actions', 'Select...')}
                      items={currencies}
                      labelFunc={(item) => item.name}
                      descriptionFunc={(item) => toDescription(item)}
                      full
                    />
                  </div>
                </StyledHorizontalStack>

                <Controller
                  name="bankAccount"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <>
                      <StyledModalButton
                        onClick={() => setBankAccountSelection(true)}
                        onBlur={onBlur}
                        placeholder={translate('screens/sell', 'Add or select your IBAN')}
                        value={Utils.formatIban(value?.iban) ?? undefined}
                        description={value?.label}
                      />

                      {bankAccountSelection && (
                        <>
                          <div className="absolute h-full w-full z-1 top-0 bg-white">
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
              </StyledVerticalStack>

              {isLoading ? (
                <StyledVerticalStack center>
                  <StyledLoadingSpinner size={SpinnerSize.LG} />
                </StyledVerticalStack>
              ) : (
                <>
                  {kycError && !customAmountError && <KycHint type={TransactionType.SELL} error={kycError} />}

                  {errorMessage && (
                    <StyledVerticalStack center className="text-center">
                      <ErrorHint message={errorMessage} />

                      <StyledButton
                        width={StyledButtonWidth.MIN}
                        label={translate('general/actions', 'Retry')}
                        onClick={() => setVal('amount', enteredAmount)} // re-trigger
                        className="mt-4"
                        color={StyledButtonColor.STURDY_WHITE}
                      />
                    </StyledVerticalStack>
                  )}

                  {paymentInfo && !kycError && !errorMessage && !customAmountError?.hideInfos && (
                    <>
                      <ExchangeRate
                        exchangeRate={1 / paymentInfo.exchangeRate}
                        rate={1 / paymentInfo.rate}
                        fees={paymentInfo.feesTarget}
                        feeCurrency={paymentInfo.currency}
                        from={paymentInfo.currency}
                        to={paymentInfo.asset}
                        steps={paymentInfo.priceSteps}
                        amountIn={paymentInfo.amount}
                        amountOut={paymentInfo.estimatedAmount}
                        type="sell"
                      />

                      <PaymentInformationContent
                        info={paymentInfo}
                        infoText={getPaymentInfoString(paymentInfo, selectedBankAccount)}
                      />

                      <SanctionHint />

                      <div className="w-full leading-none">
                        <StyledLink
                          label={translate(
                            'screens/payment',
                            'Please note that by using this service you automatically accept our terms and conditions. The effective exchange rate is fixed when the money is received and processed by DFX.',
                          )}
                          url={process.env.REACT_APP_TNC_URL}
                          small
                          dark
                        />
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
                          className="mt-4"
                          isLoading={isProcessing}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </StyledVerticalStack>
          )}
        </Form>
      )}
    </Layout>
  );
}
