import {
  ApiError,
  Asset,
  AssetCategory,
  BankAccount,
  Blockchain,
  Fiat,
  Sell,
  SellPaymentInfo,
  TransactionError,
  TransactionType,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useAuthContext,
  useBankAccountContext,
  useFiat,
  useSell,
  useSessionContext,
} from '@dfx.swiss/react';
import {
  AssetIconVariant,
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { BankAccountSelector } from 'src/components/order/bank-account-selector';
import { AddressSelector } from 'src/components/order/address-selector';
import { AddressSwitch } from 'src/components/payment/address-switch';
import { addressLabel } from '../config/labels';
import { PaymentInformationContent } from 'src/components/payment/payment-info-sell';
import { PrivateAssetHint } from 'src/components/private-asset-hint';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { ErrorHint } from '../components/error-hint';
import { ExchangeRate } from '../components/exchange-rate';
import { SellCompletion } from '../components/payment/sell-completion';
import { QuoteErrorHint } from '../components/quote-error-hint';
import { SanctionHint } from '../components/sanction-hint';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import useDebounce from '../hooks/debounce.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
// import { useTxHelper } from '../hooks/tx-helper.hook';

enum Side {
  SPEND = 'SPEND',
  GET = 'GET',
}

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
  targetAmount: string;
  blockchain: Blockchain;
  address: Address;
}

interface CustomAmountError {
  key: string;
  defaultValue: string;
  interpolation?: Record<string, string | number> | undefined;
  hideInfos: boolean;
}

interface ValidatedData extends SellPaymentInfo {
  sideToUpdate?: Side;
}

export default function SellScreen(): JSX.Element {
  useAddressGuard('/login');

  const { translate, translateError, currency: prefCurrency } = useSettingsContext();
  const { isInitialized, closeServices } = useAppHandlingContext();
  const { logout } = useSessionContext();
  const { session } = useAuthContext();
  const { bankAccounts, updateAccount } = useBankAccountContext();
  const { blockchain: walletBlockchain, activeWallet, switchBlockchain } = useWalletContext();
  // const { getBalances, sendTransaction, canSendTransaction } = useTxHelper();
  const getBalances = () => Promise.resolve(undefined);
  const canSendTransaction = () => false;
  const { assets, getAssets } = useAssetContext();
  const { getAsset, isSameAsset } = useAsset();
  const { navigate } = useNavigation();
  const {
    assets: assetFilter,
    assetIn,
    assetOut,
    amountIn,
    amountOut,
    blockchain,
    externalTransactionId,
    flags,
    setParams,
    hideTargetSelection,
    availableBlockchains,
  } = useAppParams();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { currencies, receiveFor } = useSell();
  const { rootRef } = useLayoutContext();

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<CustomAmountError>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();
  const [isLoading, setIsLoading] = useState<Side>();
  const [paymentInfo, setPaymentInfo] = useState<Sell>();
  const [balances] = useState<AssetBalance[]>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTxDone, setTxDone] = useState<boolean>(false);
  const [sellTxId] = useState<string>();
  const [bankAccountSelection, setBankAccountSelection] = useState(false);
  const [showsSwitchScreen, setShowsSwitchScreen] = useState(false);
  const [validatedData, setValidatedData] = useState<ValidatedData>();

  // form
  const { control, handleSubmit, setValue, resetField } = useForm<FormData>({ mode: 'onTouched' });

  const selectedBankAccount = useWatch({ control, name: 'bankAccount' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const enteredAmount = useWatch({ control, name: 'amount' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const selectedTargetAmount = useWatch({ control, name: 'targetAmount' });
  const selectedBlockchain = useWatch({ control, name: 'blockchain' });
  const selectedAddress = useWatch({ control, name: 'address' });

  const availableBalance = selectedAsset && findBalance(selectedAsset);

  useEffect(() => {
    // availableAssets && getBalances(availableAssets, selectedAddress?.address, selectedAddress?.chain).then(setBalances);
    console.log('getBalances disabled temporarily');
  }, [getBalances, availableAssets]);

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  const filteredAssets = assets && filterAssets(Array.from(assets.values()).flat(), assetFilter);
  const blockchains = availableBlockchains?.filter((b) => {
    if (!b || typeof b !== 'string') return false;
    return filteredAssets?.some((a) => a?.blockchain === b);
  });


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
    const currency =
      getCurrency(currencies, assetOut) ??
      getCurrency(currencies, prefCurrency?.name) ??
      getDefaultCurrency(currencies);
    if (prefCurrency && currency) setVal('currency', currency);
  }, [assetOut, getCurrency, prefCurrency, currencies]);

  useEffect(() => {
    if (amountIn) {
      setVal('amount', amountIn);
    } else if (amountOut) {
      setVal('targetAmount', amountOut);
    }
  }, [amountIn, amountOut]);

  useEffect(() => setBlockchainAndAddress(), [session?.address, translate]);

  useEffect(() => {
    if (selectedAddress && selectedAddress.address === translate('screens/buy', 'Switch address')) {
      setShowsSwitchScreen(true);
      setBlockchainAndAddress();
    }
  }, [selectedAddress]);

  useEffect(() => {
    if (selectedBlockchain && selectedBlockchain !== blockchain) {
      setParams({ blockchain: selectedBlockchain });
      switchBlockchain(selectedBlockchain);
      resetField('asset');
      setAvailableAssets(undefined);
    }
  }, [selectedBlockchain]);

  useEffect(() => {
    if (selectedBankAccount && selectedBankAccount.preferredCurrency)
      setVal('currency', selectedBankAccount.preferredCurrency);
  }, [selectedBankAccount]);

  useEffect(() => {
    if (!enteredAmount) {
      setCustomAmountError(undefined);
    }
  }, [enteredAmount]);

  // SPEND data changed
  useEffect(() => {
    const requiresUpdate =
      enteredAmount !== paymentInfo?.amount?.toString() || selectedAsset?.uniqueName !== paymentInfo?.asset.uniqueName;

    const hasSpendData = enteredAmount && selectedAsset;
    const hasGetData = selectedTargetAmount && selectedCurrency && selectedBankAccount;

    if (requiresUpdate) {
      if (hasSpendData) {
        updateData(Side.GET);
      } else if (hasGetData) {
        updateData(Side.SPEND);
      }
    }

    // requiresUpdate && updateData(Side.GET);
  }, [enteredAmount, selectedAsset]);

  // GET data changed
  useEffect(() => {
    const requiresUpdate =
      selectedTargetAmount !== paymentInfo?.estimatedAmount?.toString() ||
      selectedCurrency?.name !== paymentInfo?.currency?.name ||
      selectedBankAccount?.iban !== validatedData?.iban;

    const hasSpendData = enteredAmount && selectedAsset;
    const hasGetData = selectedTargetAmount && selectedCurrency && selectedBankAccount;

    if (requiresUpdate) {
      if (hasGetData) {
        updateData(Side.SPEND);
      } else if (hasSpendData) {
        updateData(Side.GET);
      }
    }

    // requiresUpdate && updateData(isSameTargetAmount && enteredAmount ? Side.GET : Side.SPEND);
  }, [selectedTargetAmount, selectedCurrency, selectedBankAccount]);

  function updateData(sideToUpdate: Side) {
    const data = validateData({
      amount: sideToUpdate === Side.GET ? enteredAmount : undefined,
      currency: selectedCurrency,
      asset: selectedAsset,
      targetAmount: sideToUpdate === Side.SPEND || enteredAmount === undefined ? selectedTargetAmount : undefined,
      bankAccount: selectedBankAccount,
    });

    data && setValidatedData({ ...data, sideToUpdate });
  }

  useEffect(() => {
    let isRunning = true;

    setErrorMessage(undefined);
    setPaymentInfo(undefined);
    setIsLoading(undefined);

    if (!validatedData) return;

    const data: SellPaymentInfo = { ...validatedData, externalTransactionId };

    setIsLoading(validatedData.sideToUpdate);
    receiveFor(data)
      .then((sell) => {
        if (isRunning) {
          validateSell(sell);
          setPaymentInfo(sell);

          // load exact price
          if (sell) {
            return receiveFor({ ...data, exactPrice: true });
          }
        }
      })
      .then((info) => {
        if (isRunning && info) {
          validatedData.sideToUpdate === Side.SPEND
            ? setVal('amount', info.amount.toString())
            : setVal('targetAmount', info.estimatedAmount.toString());
          setPaymentInfo(info);
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
      .finally(() => isRunning && setIsLoading(undefined));

    return () => {
      isRunning = false;
    };
  }, [useDebounce(validatedData, 500)]);

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
      case TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING:
      case TransactionError.VIDEO_IDENT_REQUIRED:
      case TransactionError.NATIONALITY_NOT_ALLOWED:
      case TransactionError.IBAN_CURRENCY_MISMATCH:
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

  function validateData({
    amount: amountStr,
    currency,
    asset,
    targetAmount: targetAmountStr,
    bankAccount,
  }: Partial<FormData> = {}): SellPaymentInfo | undefined {
    const amount = Number(amountStr);
    const targetAmount = Number(targetAmountStr);
    if (asset != null && currency != null && bankAccount != null) {
      return amount > 0
        ? { amount, currency, asset, iban: bankAccount.iban }
        : targetAmount > 0
        ? { currency, asset, targetAmount, iban: bankAccount.iban }
        : undefined;
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
    return updateAccount(selectedBankAccount.id, { preferredCurrency: selectedCurrency as Fiat });
  }

  function getPaymentInfoString(paymentInfo: Sell, selectedBankAccount: BankAccount): string {
    return (
      paymentInfo &&
      selectedBankAccount &&
      translate(
        'screens/sell',
        'Send the selected amount to the address below. This address can be used multiple times, it is always the same for payouts from {{chain}} to your IBAN {{iban}} in {{currency}}.',
        {
          chain: paymentInfo.asset.blockchain || 'blockchain',
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

  function setBlockchainAndAddress() {
    if (isInitialized && session?.address && blockchains) {
      const defaultBlockchain = blockchain ? blockchains.find(b => b === blockchain) || blockchains[0] : blockchains[0];
      if (defaultBlockchain) {
        setVal('blockchain', defaultBlockchain);
        
        // Set current address as default
        const currentAddress = {
          address: addressLabel(session),
          label: 'Current address',
          chain: defaultBlockchain,
        };
        setVal('address', currentAddress);
      }
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
      console.log('sendTransaction disabled temporarily');

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

  useLayoutOptions({
    title: bankAccountSelection
      ? translate('screens/sell', 'Select payment account')
      : translate('navigation/links', 'Sell'),
    onBack: bankAccountSelection ? () => setBankAccountSelection(false) : undefined,
    textStart: true,
  });

  return (
    <>
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
                        (kycError &&
                          [
                            TransactionError.BANK_TRANSACTION_MISSING,
                            TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING,
                          ].includes(kycError)) ||
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
                      loading={isLoading === Side.SPEND}
                      disabled={isLoading === Side.SPEND}
                      full
                    />
                  </div>

                  <div className="flex-[1_0_9rem]">
                    <StyledSearchDropdown<Asset>
                      rootRef={rootRef}
                      name="asset"
                      placeholder={translate('general/actions', 'Select') + '...'}
                      items={availableAssets.sort((a, b) => {
                        const balanceA = findBalance(a) || 0;
                        const balanceB = findBalance(b) || 0;
                        return balanceB - balanceA;
                      })}
                      labelFunc={(item) => item.name}
                      balanceFunc={findBalanceString}
                      assetIconFunc={(item) => item.name as AssetIconVariant}
                      filterFunc={(item: Asset, search?: string | undefined) =>
                        !search || item.name.toLowerCase().includes(search.toLowerCase())
                      }
                      hideBalanceWhenClosed
                      full
                    />
                  </div>
                </StyledHorizontalStack>
                {!hideTargetSelection && (
                  <StyledHorizontalStack gap={1}>
                    <div className="flex-[3_1_9rem] min-w-0">
                      <AddressSelector control={control} name="address" selectedBlockchain={selectedBlockchain} />
                    </div>
                    <div className="flex-[1_0_9rem] min-w-0">
                      <StyledDropdown<Blockchain>
                        control={control}
                        rootRef={rootRef}
                        name="blockchain"
                        placeholder="Select blockchain..."
                        items={blockchains ?? []}
                        labelFunc={(blockchain) => blockchain?.toString() || ''}
                        full
                      />
                    </div>
                  </StyledHorizontalStack>
                )}
              </StyledVerticalStack>

              <StyledVerticalStack gap={2} full>
                <h2 className="text-dfxGray-700">
                  {translate('screens/buy', paymentInfo?.rate === 1 ? 'You get' : 'You get about')}
                </h2>
                <StyledHorizontalStack gap={1}>
                  <div className="flex-[3_1_9rem]">
                    <StyledInput
                      type="number"
                      name="targetAmount"
                      loading={isLoading === Side.GET}
                      disabled={isLoading === Side.GET}
                      full
                    />
                  </div>
                  <div className="flex-[1_0_9rem]">
                    <StyledDropdown<Fiat>
                      rootRef={rootRef}
                      name="currency"
                      placeholder={translate('general/actions', 'Select') + '...'}
                      items={currencies}
                      labelFunc={(item) => item.name}
                      descriptionFunc={(item) => toDescription(item)}
                      full
                    />
                  </div>
                </StyledHorizontalStack>
                <BankAccountSelector
                  value={selectedBankAccount}
                  onChange={(account) => setVal('bankAccount', account)}
                  placeholder={translate('screens/sell', 'Add or select your IBAN')}
                  isModalOpen={bankAccountSelection}
                  onModalToggle={setBankAccountSelection}
                />
              </StyledVerticalStack>

              {isLoading && !paymentInfo ? (
                <StyledVerticalStack center>
                  <StyledLoadingSpinner size={SpinnerSize.LG} />
                </StyledVerticalStack>
              ) : (
                <>
                  {kycError && !customAmountError && <QuoteErrorHint type={TransactionType.SELL} error={kycError} />}

                  {errorMessage && (
                    <StyledVerticalStack center className="text-center">
                      <ErrorHint message={errorMessage} />

                      <StyledButton
                        width={StyledButtonWidth.MIN}
                        label={translate('general/actions', 'Retry')}
                        onClick={() => updateData(Side.GET)} // re-trigger
                        className="mt-4"
                        color={StyledButtonColor.STURDY_WHITE}
                      />
                    </StyledVerticalStack>
                  )}

                  {paymentInfo &&
                    !kycError &&
                    !errorMessage &&
                    !customAmountError?.hideInfos &&
                    (selectedAsset?.category === AssetCategory.PRIVATE && !flags?.includes('private') ? (
                      <PrivateAssetHint asset={selectedAsset} />
                    ) : (
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
                          type={TransactionType.SELL}
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
                    ))}
                </>
              )}
            </StyledVerticalStack>
          )}
        </Form>
      )}
    </>
  );
}
