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
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { PaymentInformation, PaymentInformationContent } from '../components/buy/payment-information';
import { MailEdit } from '../components/edit/mail.edit';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import useDebounce from '../hooks/debounce.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { usePath } from '../hooks/path.hook';

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
  const { assetIn, assetOut, amountIn, blockchain } = usePath();
  const { toDescription, getCurrency, getDefaultCurrency } = useFiat();
  const { isAllowedToBuy } = useKycHelper();
  const { user } = useUserContext();

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
  } = useForm<FormData>({ defaultValues: { amount: amountIn } });

  const data = useWatch({ control });
  const selectedCurrency = useWatch({ control, name: 'currency' });

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  useEffect(() => {
    const blockchains = blockchain ? [blockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { buyable: true, comingSoon: false });
    setAvailableAssets(blockchainAssets);

    const asset = getAsset(blockchainAssets, assetOut) ?? (blockchainAssets.length === 1 && blockchainAssets[0]);
    if (asset) setVal('asset', asset);
  }, [assetOut, getAsset, getAssets]);

  useEffect(() => {
    const currency = getCurrency(currencies, assetIn) ?? getDefaultCurrency(currencies);
    if (currency) setVal('currency', currency);
  }, [assetIn, getCurrency, currencies]);

  // data validation
  const validatedData = validateData(useDebounce(data, 500));
  const dataValid = validatedData != null;
  const kycRequired = dataValid && !isLoading && !isAllowedToBuy(Number(validatedData?.amount));

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
        translate('screens/buy', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
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
    >
      {showsCompletion && paymentInfo ? (
        <BuyCompletion showsSimple={showsSimple} paymentInfo={paymentInfo} />
      ) : (
        <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
          <StyledVerticalStack gap={8} full>
            {currencies && availableAssets && (
              <>
                <StyledDropdown<Asset>
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
                        window.scrollTo(0, 0);
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

function BuyCompletion({
  showsSimple,
  paymentInfo,
}: {
  showsSimple: boolean;
  paymentInfo: PaymentInformation;
}): JSX.Element {
  const { translate } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();

  function getHeader(): string {
    return showsSimple
      ? translate('screens/buy', 'Nice! You are all set! Give us a minute to handle your transaction')
      : translate(
          'screens/buy',
          'As soon as the transfer arrives in our bank account, we will transfer your asset in your wallet',
        );
  }

  return (
    <StyledVerticalStack gap={4}>
      <div className="mx-auto">
        <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
      </div>
      <p className="text-base font-bold text-center text-dfxBlue-800">{getHeader()}</p>
      {showsSimple ? (
        <>
          <p className="text-center text-dfxBlue-800">
            {translate(
              'screens/buy',
              'As soon as the transfer arrives in our bank account, we will transfer your asset to your wallet. We will inform you about the progress of any purchase or sale via E-mail.',
            )}
          </p>
          <StyledButton
            label={translate('general/actions', 'Close')}
            onClick={() =>
              closeServices({
                type: CloseType.BUY,
                buy: { paymentInfo: paymentInfo.buy, amount: paymentInfo.amount },
              })
            }
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            caps
          />
        </>
      ) : (
        <MailEdit
          onSubmit={(email) =>
            (!email || email.length === 0) &&
            closeServices({
              type: CloseType.BUY,
              buy: { paymentInfo: paymentInfo.buy, amount: paymentInfo.amount },
            })
          }
          infoText={translate(
            'screens/buy',
            'Enter your email address if you want to be informed about the progress of any purchase or sale',
          )}
          hideLabels
          isOptional
        />
      )}
    </StyledVerticalStack>
  );
}
