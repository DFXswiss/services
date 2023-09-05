import {
  Asset,
  Blockchain,
  Buy,
  Fiat,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useBuy,
  useFiat,
  useSessionContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AssetIconVariant,
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { PaymentInformation, PaymentInformationContent } from '../components/payment/payment-information';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import useDebounce from '../hooks/debounce.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { isDefined } from '../util/utils';

interface FormData {
  currency: Fiat;
  asset: Asset;
  amount: string;
}

export function BuyScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { availableBlockchains } = useSessionContext();
  const { currencies, receiveFor } = useBuy();
  const { toSymbol } = useFiat();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { assets, assetIn, assetOut, amountIn, blockchain } = useAppParams();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { isAllowedToBuy } = useKycHelper();
  const { user } = useUserContext();
  const { blockchain: walletBlockchain } = useWalletContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInformation>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // form
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const data = useWatch({ control });
  const selectedCurrency = useWatch({ control, name: 'currency' });

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

  // data validation
  const validatedData = validateData(useDebounce(data, 500));
  const dataValid = validatedData != null;
  const kycRequired = paymentInfo && !isAllowedToBuy(paymentInfo.amount);

  const showsSimple = user?.mail != null;

  useEffect(() => {
    if (!dataValid) {
      setPaymentInfo(undefined);
      return;
    }

    const amount = Number(validatedData.amount);
    const { asset, currency } = validatedData;

    setIsLoading(true);
    receiveFor({ currency, amount, asset })
      .then((value) => checkForMinDeposit(value, amount, currency.name))
      .then((value) => toPaymentInformation(value, currency))
      .then(setPaymentInfo)
      .finally(() => setIsLoading(false));
  }, [validatedData]);

  function checkForMinDeposit(buy: Buy, amount: number, currency: string): Buy | undefined {
    if (buy.minVolume > amount) {
      setCustomAmountError(
        translate('screens/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
          amount: Utils.formatAmount(buy.minVolume),
          currency,
        }),
      );
      return undefined;
    } else {
      setCustomAmountError(undefined);
      return buy;
    }
  }

  function toPaymentInformation(buy: Buy | undefined, currency: Fiat): PaymentInformation | undefined {
    if (!buy) return undefined;
    return {
      buy: buy,
      recipient: `${buy.name}, ${buy.street} ${buy.number}, ${buy.zip} ${buy.city}, ${buy.country}`,
      estimatedAmount: `${buy.estimatedAmount} ${buy.asset.name}`,
      fee: `${buy.fee} %`,
      minFee: buy.minFee > 0 ? `${buy.minFee}${currency ? toSymbol(currency) : ''}` : undefined,
      currency,
      amount: Number(data.amount),
    };
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0 && data.asset != null && data.currency != null) {
      return data as FormData;
    }
  }

  // misc
  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  return (
    <Layout
      title={showsCompletion ? translate('screens/buy', 'Done!') : translate('screens/buy', 'Buy')}
      backButton={!showsCompletion}
      textStart
      rootRef={rootRef}
      scrollRef={scrollRef}
    >
      {showsCompletion && paymentInfo ? (
        <BuyCompletion showsSimple={showsSimple} paymentInfo={paymentInfo.buy} navigateOnClose />
      ) : (
        <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
          <StyledVerticalStack gap={8} full>
            {currencies && availableAssets && (
              <>
                <StyledDropdown<Asset>
                  rootRef={rootRef}
                  name="asset"
                  label={translate('screens/buy', 'I want to buy')}
                  placeholder={translate('general/actions', 'Please select...')}
                  items={availableAssets}
                  labelFunc={(item) => item.name}
                  assetIconFunc={(item) => item.name as AssetIconVariant}
                  descriptionFunc={(item) => item.blockchain}
                  full
                />
                <StyledDropdown<Fiat>
                  rootRef={rootRef}
                  name="currency"
                  label={translate('screens/buy', 'with')}
                  placeholder={translate('general/actions', 'Please select...')}
                  items={currencies}
                  labelFunc={(item) => item.name}
                  descriptionFunc={(item) => toDescription(item)}
                  full
                />

                {selectedCurrency && (
                  <div>
                    <StyledInput
                      type={'number'}
                      label={translate('screens/buy', 'Buy Amount')}
                      placeholder="0.00"
                      prefix={toSymbol(selectedCurrency)}
                      name="amount"
                      forceError={kycRequired || customAmountError != null}
                      forceErrorMessage={customAmountError}
                      loading={isLoading}
                      full
                    />

                    {paymentInfo && (
                      <p className="text-dfxBlue-800 text-start w-full text-xs pl-7 pt-2">
                        {translate(
                          'screens/buy',
                          paymentInfo.minFee
                            ? '≈ {{estimatedAmount}} (incl. {{fee}} DFX fee - min. {{minFee}})'
                            : '≈ {{estimatedAmount}} (incl. {{fee}} DFX fee)',
                          {
                            estimatedAmount: paymentInfo.estimatedAmount,
                            fee: paymentInfo.fee,
                            minFee: paymentInfo.minFee ?? 0,
                          },
                        )}
                      </p>
                    )}
                    {kycRequired && !customAmountError && <KycHint />}
                  </div>
                )}

                {paymentInfo && dataValid && !kycRequired && (
                  <div>
                    <PaymentInformationContent info={paymentInfo} />

                    <div className="pt-4">
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
                      label={translate('screens/buy', 'Click here once you have issued the transfer')}
                      onClick={() => {
                        setShowsCompletion(true);
                        scrollRef.current?.scrollTo(0, 0);
                      }}
                      caps={false}
                      className="my-4"
                    />
                  </div>
                )}
              </>
            )}
          </StyledVerticalStack>
        </Form>
      )}
    </Layout>
  );
}
