import {
  Asset,
  Blockchain,
  Buy,
  BuyPaymentInfo,
  BuyPaymentMethod,
  Fiat,
  TransactionError,
  UserStatus,
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
  StyledCollapsible,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledTextBox,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { PaymentInformationContent } from '../components/payment/payment-information';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import useDebounce from '../hooks/debounce.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { blankedAddress, isDefined } from '../util/utils';

interface FormData {
  amount: string;
  currency: Fiat;
  paymentMethod: BuyPaymentMethod;
  asset: Asset;
  address: { address: string; label: string; type: string };
}

const paymentLabels = {
  [BuyPaymentMethod.BANK]: 'Bank transaction',
  [BuyPaymentMethod.CARD]: 'Credit card',
};

const paymentDescriptions = {
  [BuyPaymentMethod.BANK]: 'SEPA, SEPA instant',
  [BuyPaymentMethod.CARD]: 'Mastercard, Visa, Google Pay, Apple Pay',
};

export function BuyScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { availableBlockchains, logout } = useSessionContext();
  const { session } = useAuthContext();
  const { currencies, receiveFor } = useBuy();
  const { toSymbol } = useFiat();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { assets, assetIn, assetOut, amountIn, blockchain, flags, paymentMethod } = useAppParams();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { isComplete } = useKycHelper();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const { blockchain: walletBlockchain } = useWalletContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { setRedirectPath } = useAppHandlingContext();

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [paymentInfo, setPaymentInfo] = useState<Buy>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [kycRequired, setKycRequired] = useState<boolean>(false);
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [showsSwitchScreen, setShowsSwitchScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isContinue, setIsContinue] = useState(false);
  const [validatedData, setValidatedData] = useState<BuyPaymentInfo>();

  const availablePaymentMethods = [BuyPaymentMethod.BANK];
  (user?.status === UserStatus.ACTIVE || flags?.includes(BuyPaymentMethod.CARD)) &&
    availablePaymentMethods.push(BuyPaymentMethod.CARD);
  const defaultPaymentMethod =
    availablePaymentMethods.find((m) => m.toLowerCase() === paymentMethod?.toLowerCase()) ?? BuyPaymentMethod.BANK;

  // form
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      amount: '100',
      paymentMethod: defaultPaymentMethod,
    },
  });

  const selectedAmount = useWatch({ control, name: 'amount' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const selectedAsset = useWatch({ control, name: 'asset' });
  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });
  const selectedAddress = useWatch({ control, name: 'address' });

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

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
    const currency = getCurrency(currencies, assetIn) ?? getDefaultCurrency(currencies);
    if (currency) setVal('currency', currency);
  }, [assetIn, getCurrency, currencies]);

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
  useEffect(() => {
    const data = validateData({
      amount: selectedAmount,
      currency: selectedCurrency,
      asset: selectedAsset,
      paymentMethod: selectedPaymentMethod,
    });
    setValidatedData(data);
  }, [selectedAmount, selectedCurrency, selectedAsset, selectedPaymentMethod]);

  useEffect(() => {
    if (!validatedData) {
      setPaymentInfo(undefined);
      return;
    }

    setIsLoading(true);
    receiveFor(validatedData)
      .then(validateBuy)
      .then(setPaymentInfo)
      .finally(() => setIsLoading(false));
  }, [useDebounce(validatedData, 500)]);

  function validateBuy(buy: Buy): Buy | undefined {
    switch (buy.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError(
          translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
            amount: Utils.formatAmount(buy.minVolume),
            currency: buy.currency.name,
          }),
        );
        setKycRequired(false);
        return undefined;

      case TransactionError.AMOUNT_TOO_HIGH:
        if (!isComplete) {
          setCustomAmountError(undefined);
          setKycRequired(true);
          return undefined;
        }
    }

    setCustomAmountError(undefined);
    setKycRequired(false);

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
    setRedirectPath(pathname);
    logout();
    navigate('/login');
  }

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  const showsSimple = user?.mail != null;

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

  return (
    <Layout title={title} backButton={!showsCompletion} textStart rootRef={rootRef} scrollRef={scrollRef}>
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
        <BuyCompletion showsSimple={showsSimple} paymentInfo={paymentInfo} navigateOnClose />
      ) : (
        <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
          <StyledVerticalStack gap={8} full center>
            {currencies && availableAssets && (
              <>
                <StyledVerticalStack gap={2} full>
                  <h2 className="text-dfxGray-700">{translate('screens/buy', 'You spend')}</h2>
                  <StyledHorizontalStack gap={1}>
                    <div className="flex-1">
                      <StyledInput
                        type={'number'}
                        placeholder="0.00"
                        prefix={selectedCurrency && toSymbol(selectedCurrency)}
                        name="amount"
                        forceError={kycRequired || customAmountError != null}
                        forceErrorMessage={customAmountError}
                        full
                      />
                    </div>
                    <div style={{ flex: '0 0 13rem' }}>
                      <StyledDropdown<Fiat>
                        rootRef={rootRef}
                        name="currency"
                        placeholder={translate('general/actions', 'Please select...')}
                        items={currencies}
                        labelFunc={(item) => item.name}
                        descriptionFunc={(item) => toDescription(item)}
                        full
                      />
                    </div>
                  </StyledHorizontalStack>
                  <StyledDropdown<BuyPaymentMethod>
                    rootRef={rootRef}
                    name="paymentMethod"
                    placeholder={translate('general/actions', 'Please select...')}
                    items={availablePaymentMethods}
                    labelFunc={(item) => translate('screens/buy', paymentLabels[item])}
                    descriptionFunc={(item) => translate('screens/buy', paymentDescriptions[item])}
                    full
                  />
                </StyledVerticalStack>
                <StyledVerticalStack gap={2} full>
                  <h2 className="text-dfxGray-700">{translate('screens/buy', 'You get (estimate)')}</h2>
                  <StyledHorizontalStack gap={1}>
                    <div className="flex-1">
                      <StyledTextBox
                        text={
                          paymentInfo && !isLoading ? `≈ ${Utils.formatAmountCrypto(paymentInfo.estimatedAmount)}` : ' '
                        }
                        full
                      />
                    </div>
                    <div style={{ flex: '0 0 13rem' }}>
                      <StyledDropdown<Asset>
                        rootRef={rootRef}
                        name="asset"
                        placeholder={translate('general/actions', 'Please select...')}
                        items={availableAssets}
                        labelFunc={(item) => item.name}
                        assetIconFunc={(item) => item.name as AssetIconVariant}
                        descriptionFunc={(item) => item.blockchain}
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

                {!isLoading && kycRequired && <KycHint />}

                {!isLoading && paymentInfo && !kycRequired && (
                  <>
                    <StyledCollapsible
                      full
                      label={translate('screens/buy', 'Exchange rate')}
                      title={`${Utils.formatAmount(paymentInfo.rate)} ${paymentInfo.currency.name}/${
                        paymentInfo.asset.name
                      }`}
                    >
                      <StyledDataTable showBorder={false}>
                        <StyledDataTableRow noPadding label={translate('screens/buy', 'Base rate')}>
                          {baseRate}
                        </StyledDataTableRow>
                        <StyledDataTableRow noPadding label={translate('screens/buy', 'DFX fee')}>
                          {dfxFee}
                        </StyledDataTableRow>
                      </StyledDataTable>
                    </StyledCollapsible>

                    {selectedPaymentMethod === BuyPaymentMethod.BANK ? (
                      <div>
                        <PaymentInformationContent info={paymentInfo} />
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
                          label={translate('screens/buy', 'Click here once you have issued the transfer')}
                          onClick={() => {
                            setShowsCompletion(true);
                            scrollRef.current?.scrollTo(0, 0);
                          }}
                          caps={false}
                          className="my-4"
                        />
                      </div>
                    ) : (
                      paymentInfo.paymentLink && (
                        <div>
                          <StyledLink
                            label={translate(
                              'screens/payment',
                              'Please note that by using this service you automatically accept our terms and conditions and authorize DFX.swiss to collect the above amount via your chosen payment method and agree that this amount cannot be canceled, recalled or refunded.',
                            )}
                            url={process.env.REACT_APP_TNC_URL}
                            dark
                          />
                          <StyledButton
                            width={StyledButtonWidth.FULL}
                            label={translate('general/actions', 'Next')}
                            onClick={() => {
                              setIsContinue(true);
                              window.location.href = paymentInfo.paymentLink as string;
                            }}
                            isLoading={isContinue}
                            caps={false}
                            className="my-4"
                          />
                        </div>
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
