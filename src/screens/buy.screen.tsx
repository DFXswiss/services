import {
  ApiError,
  Asset,
  Blockchain,
  Buy,
  BuyPaymentInfo,
  Fiat,
  FiatPaymentMethod,
  TransactionError,
  TransactionType,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useAuthContext,
  useBuy,
  useFiat,
  useSessionContext,
  useUserContext,
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
  StyledTextBox,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { AssetCategory } from '@dfx.swiss/react/dist/definitions/asset';
import { useEffect, useRef, useState } from 'react';
import { FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { NameEdit } from '../components/edit/name.edit';
import { ErrorHint } from '../components/error-hint';
import { ExchangeRate } from '../components/exchange-rate';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { AddressSwitch } from '../components/payment/address-switch';
import { BuyCompletion } from '../components/payment/buy-completion';
import { PaymentInformationContent } from '../components/payment/payment-information';
import { PrivateAssetHint } from '../components/private-asset-hint';
import { SanctionHint } from '../components/sanction-hint';
import { PaymentMethodDescriptions, PaymentMethodLabels } from '../config/labels';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useBlockchain } from '../hooks/blockchain.hook';
import useDebounce from '../hooks/debounce.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress } from '../util/utils';

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

interface FormData {
  amount: string;
  currency: Fiat;
  paymentMethod: FiatPaymentMethod;
  asset: Asset;
  address: Address;
}

const EmbeddedWallet = 'CakeWallet';

export function BuyScreen(): JSX.Element {
  useAddressGuard();

  const { translate, translateError } = useSettingsContext();
  const { logout } = useSessionContext();
  const { session } = useAuthContext();
  const { currencies, receiveFor } = useBuy();
  const { toSymbol } = useFiat();
  const { assets, getAssets } = useAssetContext();
  const { getAsset, isSameAsset } = useAsset();
  const {
    assets: assetFilter,
    titleIn,
    titleOut,
    hideExchangeRate,
    assetIn,
    assetOut,
    amountIn,
    blockchain,
    paymentMethod,
    externalTransactionId,
    wallet,
    flags,
    setParams,
    hideTargetSelection,
    availableBlockchains,
  } = useAppParams();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const { blockchain: walletBlockchain, switchBlockchain } = useWalletContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { toString } = useBlockchain();
  const { isEmbedded, isDfxHosted, isInitialized } = useAppHandlingContext();

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [paymentInfo, setPaymentInfo] = useState<Buy>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [showsSwitchScreen, setShowsSwitchScreen] = useState(false);
  const [showsNameForm, setShowsNameForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [isContinue, setIsContinue] = useState(false);
  const [validatedData, setValidatedData] = useState<BuyPaymentInfo>();

  // form
  const { control, handleSubmit, setValue, resetField } = useForm<FormData>({
    defaultValues: {
      amount: '100',
    },
  });

  const selectedAmount = useWatch({ control, name: 'amount' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });
  const selectedAddress = useWatch({ control, name: 'address' });

  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  const filteredAssets = assets && filterAssets(Array.from(assets.values()).flat(), assetFilter);
  const blockchains = availableBlockchains?.filter((b) => filteredAssets?.some((a) => a.blockchain === b));

  const addressItems: Address[] =
    session?.address && blockchains?.length
      ? [
          ...blockchains.map((b) => ({
            address: blankedAddress(session.address ?? ''),
            label: toString(b),
            chain: b,
          })),
          {
            address: translate('screens/buy', 'Switch address'),
            label: translate('screens/buy', 'Login with a different address'),
          },
        ]
      : [];
  const availablePaymentMethods = [FiatPaymentMethod.BANK];

  (!selectedAsset || selectedAsset.instantBuyable) && availablePaymentMethods.push(FiatPaymentMethod.INSTANT);

  (isDfxHosted || !isEmbedded) &&
    wallet !== EmbeddedWallet &&
    user?.activeAddress?.wallet !== EmbeddedWallet &&
    (!selectedAsset || selectedAsset?.cardBuyable) &&
    availablePaymentMethods.push(FiatPaymentMethod.CARD);

  const availableCurrencies = currencies?.filter((c) =>
    selectedPaymentMethod === FiatPaymentMethod.CARD
      ? c.cardSellable
      : selectedPaymentMethod === FiatPaymentMethod.INSTANT
      ? c.instantSellable
      : c.sellable,
  );

  useEffect(() => {
    const activeBlockchain = walletBlockchain ?? blockchain;
    const activeBlockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(activeBlockchains, { buyable: true, comingSoon: false }).filter(
      (a) => a.category === AssetCategory.PUBLIC || a.name === assetOut,
    );
    const activeAssets = filterAssets(blockchainAssets, assetFilter);

    setAvailableAssets(activeAssets);

    const asset = getAsset(activeAssets, assetOut) ?? (activeAssets.length === 1 && activeAssets[0]);
    if (asset) setVal('asset', asset);
  }, [assetOut, assetFilter, getAsset, getAssets, blockchain, walletBlockchain, availableBlockchains]);

  useEffect(() => {
    const currency =
      getCurrency(availableCurrencies, selectedCurrency?.name) ??
      getCurrency(availableCurrencies, assetIn) ??
      getDefaultCurrency(availableCurrencies);
    if (currency) setVal('currency', currency);
  }, [assetIn, getCurrency, currencies, selectedPaymentMethod]);

  useEffect(() => {
    const selectedMethod =
      availablePaymentMethods.find((m) => m === selectedPaymentMethod) ??
      availablePaymentMethods.find((m) => m.toLowerCase() === paymentMethod?.toLowerCase()) ??
      FiatPaymentMethod.BANK;

    if (isInitialized && selectedMethod) setVal('paymentMethod', selectedMethod);
  }, [availablePaymentMethods, paymentMethod]);

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
    if (!selectedAmount) {
      setCustomAmountError(undefined);
    }
  }, [selectedAmount]);

  // data validation/fetch
  useEffect(() => updateData(), [selectedAmount, selectedCurrency, selectedAsset, selectedPaymentMethod]);

  function updateData() {
    const data = validateData({
      amount: selectedAmount,
      currency: selectedCurrency,
      asset: selectedAsset,
      paymentMethod: selectedPaymentMethod,
    });
    setValidatedData(data);
  }

  useEffect(() => {
    let isRunning = true;

    setErrorMessage(undefined);

    if (!validatedData) {
      setPaymentInfo(undefined);
      setIsLoading(false);
      setIsPriceLoading(false);
      return;
    }

    const data: BuyPaymentInfo = { ...validatedData, externalTransactionId };

    setIsLoading(true);
    receiveFor(data)
      .then((buy) => {
        if (isRunning) {
          validateBuy(buy);
          setPaymentInfo(buy);

          // load exact price
          if (buy && !buy.exactPrice) {
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
          setPaymentInfo(undefined);
          setErrorMessage(error.message ?? 'Unknown error');
        }
      })
      .finally(() => isRunning && setIsLoading(false));

    return () => {
      isRunning = false;
    };
  }, [useDebounce(validatedData, 500)]);

  function validateBuy(buy: Buy): void {
    setCustomAmountError(undefined);
    setKycError(undefined);

    switch (buy.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmount(buy.minVolume),
            currency: buy.currency.name,
          }),
        );
        return;

      case TransactionError.AMOUNT_TOO_HIGH:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is above maximum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmount(buy.maxVolume),
            currency: buy.currency.name,
          }),
        );
        return;

      case TransactionError.LIMIT_EXCEEDED:
      case TransactionError.KYC_REQUIRED:
      case TransactionError.KYC_DATA_REQUIRED:
      case TransactionError.KYC_REQUIRED_INSTANT:
      case TransactionError.BANK_TRANSACTION_MISSING:
        setKycError(buy.error);
        return;
    }
  }

  function validateData({ amount: amountStr, currency, asset, paymentMethod }: Partial<FormData> = {}):
    | BuyPaymentInfo
    | undefined {
    const amount = Number(amountStr);
    if (amount > 0 && asset != null && currency != null && paymentMethod != null) {
      return { amount, currency, asset, paymentMethod };
    }
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

  function onCardBuy(info: Buy) {
    if (info.nameRequired) {
      setShowsNameForm(true);
    } else {
      openPaymentLink();
    }
  }

  function openPaymentLink() {
    if (!paymentInfo?.paymentLink) return;

    setIsContinue(true);
    window.location.href = paymentInfo.paymentLink;
  }

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  const title = showsCompletion
    ? translate('screens/buy', 'Done!')
    : showsSwitchScreen
    ? translate('screens/buy', 'Switch address')
    : translate('screens/buy', 'Buy');

  return (
    <Layout
      title={title}
      backButton={!showsCompletion}
      onBack={showsNameForm ? () => setShowsNameForm(false) : undefined}
      textStart
      rootRef={rootRef}
      scrollRef={scrollRef}
    >
      {showsSwitchScreen ? (
        <AddressSwitch onClose={(r) => (r ? onAddressSwitch() : setShowsSwitchScreen(false))} />
      ) : showsCompletion && paymentInfo ? (
        <BuyCompletion user={user} paymentInfo={paymentInfo} navigateOnClose />
      ) : showsNameForm ? (
        <NameEdit onSuccess={openPaymentLink} />
      ) : (
        <Form control={control} rules={rules} errors={{}} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
          <StyledVerticalStack gap={8} full center>
            {availableCurrencies && availableAssets && (
              <>
                <StyledVerticalStack gap={2} full>
                  <h2 className="text-dfxGray-700">{translate('screens/buy', titleIn ?? 'You spend')}</h2>
                  <StyledHorizontalStack gap={1}>
                    <div className="flex-[3_1_9rem]">
                      <StyledInput
                        type="number"
                        placeholder="0.00"
                        prefix={selectedCurrency && toSymbol(selectedCurrency)}
                        name="amount"
                        forceError={customAmountError != null}
                        forceErrorMessage={customAmountError}
                        full
                      />
                    </div>
                    <div className="flex-[1_0_9rem]">
                      <StyledDropdown<Fiat>
                        rootRef={rootRef}
                        name="currency"
                        placeholder={translate('general/actions', 'Select...')}
                        items={availableCurrencies}
                        labelFunc={(item) => item.name}
                        descriptionFunc={(item) => toDescription(item)}
                        full
                      />
                    </div>
                  </StyledHorizontalStack>
                  <StyledDropdown<FiatPaymentMethod>
                    rootRef={rootRef}
                    name="paymentMethod"
                    placeholder={translate('general/actions', 'Select...')}
                    items={availablePaymentMethods}
                    labelFunc={(item) => translate('screens/payment', PaymentMethodLabels[item])}
                    descriptionFunc={(item) => translate('screens/payment', PaymentMethodDescriptions[item])}
                    full
                  />
                </StyledVerticalStack>

                <StyledVerticalStack gap={2} full>
                  <h2 className="text-dfxGray-700">{translate('screens/buy', titleOut ?? 'You get about')}</h2>
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
                      <StyledSearchDropdown<Asset>
                        rootRef={rootRef}
                        name="asset"
                        placeholder={translate('general/actions', 'Select...')}
                        items={availableAssets}
                        labelFunc={(item) => item.name}
                        assetIconFunc={(item) => item.name as AssetIconVariant}
                        descriptionFunc={(item) => item.description}
                        filterFunc={(item: Asset, search?: string | undefined) =>
                          !search || item.name.toLowerCase().includes(search.toLowerCase())
                        }
                        full
                      />
                    </div>
                  </StyledHorizontalStack>

                  {!hideTargetSelection && (
                    <StyledDropdown<Address>
                      rootRef={rootRef}
                      name="address"
                      items={addressItems}
                      labelFunc={(item) => item.address}
                      descriptionFunc={(item) => item.label}
                      full
                      forceEnable
                    />
                  )}
                </StyledVerticalStack>

                {isLoading ? (
                  <StyledVerticalStack center>
                    <StyledLoadingSpinner size={SpinnerSize.LG} />
                  </StyledVerticalStack>
                ) : (
                  <>
                    {kycError && <KycHint type={TransactionType.BUY} error={kycError} />}

                    {errorMessage && (
                      <StyledVerticalStack center className="text-center">
                        <ErrorHint message={errorMessage} />

                        <StyledButton
                          width={StyledButtonWidth.MIN}
                          label={translate('general/actions', 'Retry')}
                          onClick={updateData}
                          className="mt-4"
                          color={StyledButtonColor.STURDY_WHITE}
                        />
                      </StyledVerticalStack>
                    )}

                    {paymentInfo &&
                      !kycError &&
                      !errorMessage &&
                      !customAmountError &&
                      (selectedAsset?.category === AssetCategory.PRIVATE && !flags?.includes('private') ? (
                        <PrivateAssetHint asset={selectedAsset} />
                      ) : (
                        <>
                          {hideExchangeRate !== 'true' && (
                            <ExchangeRate
                              exchangeRate={paymentInfo.exchangeRate}
                              rate={paymentInfo.rate}
                              fees={paymentInfo.fees}
                              feeCurrency={paymentInfo.currency}
                              from={paymentInfo.currency}
                              to={paymentInfo.asset}
                            />
                          )}

                          {selectedPaymentMethod !== FiatPaymentMethod.CARD ? (
                            <>
                              <div>
                                <PaymentInformationContent info={paymentInfo} />
                              </div>
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
                                  label={translate('screens/buy', 'Click here once you have issued the transfer')}
                                  onClick={() => {
                                    setShowsCompletion(true);
                                    scrollRef.current?.scrollTo(0, 0);
                                  }}
                                  caps={false}
                                  className="mt-4"
                                />
                              </div>
                            </>
                          ) : (
                            paymentInfo.paymentLink && (
                              <>
                                <SanctionHint />
                                <div className="leading-none">
                                  <StyledLink
                                    label={translate(
                                      'screens/payment',
                                      'Please note that by using this service you automatically accept our terms and conditions and authorize DFX.swiss to collect the above amount via your chosen payment method and agree that this amount cannot be canceled, recalled or refunded.',
                                    )}
                                    url={process.env.REACT_APP_TNC_URL}
                                    small
                                    dark
                                  />
                                  <StyledButton
                                    width={StyledButtonWidth.FULL}
                                    label={translate('general/actions', 'Next')}
                                    onClick={() => onCardBuy(paymentInfo)}
                                    isLoading={isContinue}
                                    className="mt-4"
                                  />
                                </div>
                              </>
                            )
                          )}
                        </>
                      ))}
                  </>
                )}
              </>
            )}
          </StyledVerticalStack>
        </Form>
      )}
    </Layout>
  );
}
