import { useEffect, useMemo, useState } from 'react';
import { useLanguageContext } from '../../contexts/language.context';
import { useQuery } from '../../hooks/query.hook';
import { Layout } from '../../components/layout';
import { DeepPartial, useForm, useWatch } from 'react-hook-form';
import useDebounce from '../../hooks/debounce.hook';
import { useKycHelper } from '../../hooks/kyc-helper.hook';
import { PaymentInformation, PaymentInformationContent } from '../../components/buy/payment-information';
import { MailEdit } from '../../components/edit/mail.edit';
import { AppPage, useAppHandlingContext } from '../../contexts/app-handling.context';
import { KycHint } from '../../components/kyc-hint';
import { Buy, Utils, Validations, useAssetContext, useBuy, useFiat, useUserContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';

interface FormData {
  amount: number;
}

export function BuyPaymentScreen(): JSX.Element {
  const { openAppPage } = useAppHandlingContext();
  const { currencies, receiveFor } = useBuy();
  const { translate } = useLanguageContext();
  const { assets, getAsset } = useAssetContext();
  const { isAllowedToBuy } = useKycHelper();
  const { toSymbol } = useFiat();
  const { assetId, currencyId, amount: paramAmount } = useQuery();
  const { user } = useUserContext();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInformation>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [showsCompletion, setShowsCompletion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const asset = useMemo(() => getAsset(Number(assetId), { buyable: true }), [assetId, assets, getAsset]);
  const currency = useMemo(
    () => currencies?.find((currency) => currency.id === Number(currencyId)),
    [currencyId, currencies],
  );
  const defaultAmount = paramAmount ? +paramAmount : undefined;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { amount: defaultAmount } });
  const data = useWatch({ control });
  const validatedData = validateData(useDebounce(data, 500));

  const dataValid = validatedData != null;
  const kycRequired = dataValid && !isLoading && !isAllowedToBuy(Number(validatedData?.amount));

  const showsSimple = user?.mail != null;

  useEffect(() => {
    if (!dataValid || !currency || !asset) {
      setPaymentInfo(undefined);
      return;
    }

    const amount = Number(validatedData.amount);
    setIsLoading(true);
    receiveFor({
      currency,
      amount,
      asset,
    })
      .then((value) => checkForMinDeposit(value, amount, currency.name))
      .then((value) => toPaymentInformation(value))
      .then(setPaymentInfo)
      .finally(() => setIsLoading(false));
  }, [validatedData, currency, asset]);

  function getHeader(): string {
    return showsSimple
      ? translate('screens/buy/payment', 'Nice! You are all set! Give us a minute to handle your transaction')
      : translate(
          'screens/buy/payment',
          'As soon as the transfer arrives in our bank account, we will transfer your asset in your wallet',
        );
  }

  function checkForMinDeposit(buy: Buy, amount: number, currency: string): Buy | undefined {
    if (buy.minVolume > amount) {
      setCustomAmountError(
        translate('screens/buy/payment', 'Entered amount is below minimum deposit of {{amount}} {{currency}}', {
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

  function toPaymentInformation(buy: Buy | undefined): PaymentInformation | undefined {
    if (!buy) return undefined;
    return {
      iban: buy.iban,
      bic: buy.bic,
      purpose: buy.remittanceInfo,
      isSepaInstant: buy.sepaInstant,
      recipient: `${buy.name}, ${buy.street} ${buy.number}, ${buy.zip} ${buy.city}, ${buy.country}`,
      estimatedAmount: `${buy.estimatedAmount} ${asset?.name ?? ''}`,
      fee: `${buy.fee} %`,
      minFee: buy.minFee > 0 ? `${buy.minFee}${currency ? toSymbol(currency) : ''}` : undefined,
      currency,
      amount: Number(data.amount),
    };
  }

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0) {
      return data as FormData;
    }
  }

  const rules = Utils.createRules({
    amount: Validations.Required,
  });

  return (
    <Layout
      backTitle={showsCompletion ? translate('screens/buy/payment', 'Done!') : translate('screens/buy/payment', 'Buy')}
      appPage={showsCompletion ? AppPage.BUY : undefined}
      textStart
    >
      {showsCompletion ? (
        <StyledVerticalStack gap={4}>
          <div className="mx-auto">
            <DfxIcon size={IconSize.XXL} icon={IconVariant.PROCESS_DONE} color={IconColor.BLUE} />
          </div>
          <p className="text-base font-bold text-center text-dfxBlue-800">{getHeader()}</p>
          {showsSimple ? (
            <>
              <p className="text-center text-dfxBlue-800">
                {translate(
                  'screens/buy/payment',
                  'As soon as the transfer arrives in our bank account, we will transfer your asset to your wallet. We will inform you about the progress of any purchase or sale via E-mail.',
                )}
              </p>
              <StyledButton
                label={translate('general/actions', 'Close')}
                onClick={() => openAppPage({page: AppPage.BUY, buyPaymentInfo: paymentInfo})}
                color={StyledButtonColor.STURDY_WHITE}
                width={StyledButtonWidth.FULL}
                caps
              />
            </>
          ) : (
            <MailEdit
              onSubmit={(email) => (!email || email.length === 0) && openAppPage({page: AppPage.BUY, buyPaymentInfo: paymentInfo})}
              infoText={translate(
                'screens/buy/payment',
                'Enter your email address if you want to be informed about the progress of any purchase or sale',
              )}
              hideLabels
              isOptional
            />
          )}
        </StyledVerticalStack>
      ) : (
        <>
          <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
            <StyledInput
              type={'number'}
              label={translate('screens/buy/payment', 'Buy Amount')}
              placeholder="0.00"
              prefix={currency && toSymbol(currency)}
              name="amount"
              forceError={kycRequired || customAmountError != null}
              forceErrorMessage={customAmountError}
              loading={isLoading}
              full
            />
          </Form>
          {paymentInfo && (
            <p className="text-dfxBlue-800 text-start w-full text-xs pl-7 pt-1">
              {translate('screens/buy/payment', '≈ {{estimatedAmount}} (incl. DFX fees)', {
                estimatedAmount: paymentInfo.estimatedAmount,
              })}
            </p>
          )}
          {paymentInfo && dataValid && !kycRequired && (
            <div className="pb-16">
              <PaymentInformationContent info={paymentInfo} />
              <StyledButton
                width={StyledButtonWidth.FULL}
                label={translate('screens/buy/payment', 'Click here once you have issued the transfer')}
                onClick={() => {
                  setShowsCompletion(true);
                  window.scrollTo(0, 0);
                }}
                caps={false}
              />
            </div>
          )}
          {kycRequired && !customAmountError && <KycHint />}
        </>
      )}
    </Layout>
  );
}
