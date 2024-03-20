import {
  ApiError,
  Asset,
  Blockchain,
  Buy,
  BuyPaymentInfo,
  Fiat,
  FiatPaymentMethod,
  TransactionError,
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
  IconColor,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCollapsible,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInfoText,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledTextBox,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { NameEdit } from '../components/edit/name.edit';
import { ErrorHint } from '../components/error-hint';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { PaymentInformationContent } from '../components/payment/payment-information';
import { SanctionHint } from '../components/sanction-hint';
import { PaymentMethodDescriptions, PaymentMethodLabels } from '../config/labels';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useBlockchain } from '../hooks/blockchain.hook';
import useDebounce from '../hooks/debounce.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress, isDefined } from '../util/utils';

interface FormData {
  amount: string;
  currency: Fiat;
  paymentMethod: FiatPaymentMethod;
  asset: Asset;
  address: { address: string; label: string; type: string };
}

const EmbeddedWallet = 'CakeWallet';

export function BuyScreen(): JSX.Element {
  useSessionGuard();
  const { translate, translateError } = useSettingsContext();
  const { availableBlockchains, logout } = useSessionContext();
  const { session } = useAuthContext();
  const { currencies, receiveFor } = useBuy();
  const { toSymbol } = useFiat();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { assets, assetIn, assetOut, amountIn, blockchain, paymentMethod, externalTransactionId, wallet } =
    useAppParams();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { isComplete } = useKycHelper();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const { blockchain: walletBlockchain } = useWalletContext();
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
  const { control, handleSubmit, setValue } = useForm<FormData>({
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

  const availablePaymentMethods = [FiatPaymentMethod.BANK];

  (!selectedAsset || selectedAsset.instantBuyable) && availablePaymentMethods.push(FiatPaymentMethod.INSTANT);

  (isDfxHosted || !isEmbedded) &&
    wallet !== EmbeddedWallet &&
    user?.wallet !== EmbeddedWallet &&
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
    const blockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { buyable: true, comingSoon: false });
    const activeAssets = assets
      ? assets
          .split(',')
          .map((a) => getAsset(blockchainAssets, a))
          .filter(isDefined)
      : blockchainAssets;
    setAvailableAssets(activeAssets);

    const asset = getAsset(activeAssets, assetOut) ?? (activeAssets.length === 1 && activeAssets[0]);
    if (asset) setVal('asset', asset);
  }, [assetOut, getAsset, getAssets, blockchain, walletBlockchain]);

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
    if (selectedAddress && selectedAddress.type === 'Logout') {
      setShowsSwitchScreen(true);
      setAddress();
    }
  }, [selectedAddress]);

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
          const info = validateBuy(buy);
          setPaymentInfo(info);

          // load exact price
          if (info && !info.exactPrice) {
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

  function validateBuy(buy: Buy): Buy | undefined {
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
        return undefined;

      case TransactionError.AMOUNT_TOO_HIGH:
        if (!isComplete) {
          setKycError(buy.error);
          return undefined;
        }
        break;

      case TransactionError.KYC_REQUIRED:
      case TransactionError.KYC_REQUIRED_INSTANT:
        setKycError(buy.error);
        return undefined;
    }

    return buy;
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
  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  function setAddress() {
    if (session?.address)
      setVal('address', {
        address: blankedAddress(session.address),
        label: translate('screens/buy', 'Target address'),
        type: 'Address',
      });
  }

  function onAddressSwitch() {
    logout();
    navigate('/switch', { setRedirect: true });
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

  const baseRate =
    paymentInfo &&
    `${Utils.formatAmount(paymentInfo.exchangeRate)} ${paymentInfo.currency.name}/${paymentInfo.asset.name}`;
  const feeAmount =
    paymentInfo && Math.max((paymentInfo.fee * paymentInfo.amount) / 100, paymentInfo.minFee ?? 0).toFixed(2);
  const minFee = paymentInfo && `, min. ${paymentInfo.minFee}${toSymbol(paymentInfo.currency)}`;
  const dfxFee =
    paymentInfo &&
    `${feeAmount}${toSymbol(paymentInfo.currency)} (${paymentInfo.fee}%${paymentInfo.minFee ? minFee : ''})`;

  const l1Replacement =
    paymentInfo?.asset.blockchain === Blockchain.BITCOIN
      ? 'Lightning'
      : paymentInfo?.asset.blockchain === Blockchain.ETHEREUM
      ? 'Arbitrum / Optimism'
      : undefined;

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
        <>
          <p className="text-dfxBlue-800 mb-2">
            {translate('screens/buy', 'Are you sure you want to send to a different address?')}
          </p>
          <StyledHorizontalStack>
            <StyledButton
              color={StyledButtonColor.STURDY_WHITE}
              width={StyledButtonWidth.MIN}
              label={translate('general/actions', 'No')}
              onClick={() => setShowsSwitchScreen(false)}
            />
            <StyledButton
              width={StyledButtonWidth.MIN}
              label={translate('general/actions', 'Yes')}
              onClick={onAddressSwitch}
            />
          </StyledHorizontalStack>
        </>
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
                  <h2 className="text-dfxGray-700">{translate('screens/buy', 'You spend')}</h2>
                  <StyledHorizontalStack gap={1}>
                    <div className="flex-[3_1_9rem]">
                      <StyledInput
                        type={'number'}
                        placeholder="0.00"
                        prefix={selectedCurrency && toSymbol(selectedCurrency)}
                        name="amount"
                        forceError={kycError === TransactionError.AMOUNT_TOO_HIGH || customAmountError != null}
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
                      <StyledSearchDropdown<Asset>
                        rootRef={rootRef}
                        name="asset"
                        placeholder={translate('general/actions', 'Select...')}
                        items={availableAssets}
                        labelFunc={(item) => item.name}
                        assetIconFunc={(item) => item.name as AssetIconVariant}
                        descriptionFunc={(item) => toString(item.blockchain)}
                        filterFunc={(item: Asset, search?: string | undefined) =>
                          !search || item.name.toLowerCase().includes(search.toLowerCase())
                        }
                        full
                      />
                    </div>
                  </StyledHorizontalStack>
                  <StyledDropdown<{ address: string; label: string; type: string }>
                    rootRef={rootRef}
                    name="address"
                    items={[
                      {
                        address: translate('screens/buy', 'Switch address'),
                        label: translate('screens/buy', 'Login with a different address'),
                        type: 'Logout',
                      },
                    ]}
                    labelFunc={(item) => item.address}
                    descriptionFunc={(item) => item.label}
                    full
                    forceEnable
                  />
                </StyledVerticalStack>

                {isLoading && (
                  <StyledVerticalStack center>
                    <StyledLoadingSpinner size={SpinnerSize.LG} />
                  </StyledVerticalStack>
                )}

                {!isLoading && kycError && <KycHint error={kycError} />}

                {!isLoading && errorMessage && (
                  <StyledVerticalStack center className="text-center">
                    <ErrorHint message={errorMessage} />

                    <StyledButton
                      width={StyledButtonWidth.MIN}
                      label={translate('general/actions', 'Retry')}
                      onClick={updateData}
                      className="my-4"
                      color={StyledButtonColor.STURDY_WHITE}
                    />
                  </StyledVerticalStack>
                )}

                {!isLoading && paymentInfo && !kycError && !errorMessage && (
                  <>
                    <StyledCollapsible
                      full
                      label={translate('screens/payment', 'Exchange rate')}
                      title={`${Utils.formatAmount(paymentInfo.rate)} ${paymentInfo.currency.name}/${
                        paymentInfo.asset.name
                      }`}
                    >
                      <StyledVerticalStack gap={2}>
                        <div className="grid gap-1 w-full text-sm grid-cols-[8rem_1fr]">
                          <div className="text-dfxGray-800">{translate('screens/payment', 'Base rate')}</div>
                          <div>{baseRate}</div>
                          <div className="text-dfxGray-800">{translate('screens/payment', 'DFX fee')}</div>
                          <StyledVerticalStack>
                            <div>{dfxFee}</div>
                            {l1Replacement && (
                              <div className="mt-1 text-xs text-dfxGray-700 leading-tight">
                                {translate(
                                  'screens/buy',
                                  'Use {{chain}} as a Layer 2 solution to benefit from lower transaction fees',
                                  { chain: l1Replacement },
                                )}
                              </div>
                            )}
                          </StyledVerticalStack>
                        </div>
                        <StyledInfoText iconColor={IconColor.GRAY} discreet>
                          {translate(
                            'screens/payment',
                            'This exchange rate is not guaranteed. The effective rate is determined when the transactions are received and processed by DFX.',
                          )}
                        </StyledInfoText>
                      </StyledVerticalStack>
                    </StyledCollapsible>

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
                              'Please note that by using this service you automatically accept our terms and conditions.',
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
                            className="my-4"
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
                              className="my-4"
                            />
                          </div>
                        </>
                      )
                    )}
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
