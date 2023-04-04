import { useEffect, useMemo, useState } from 'react';
import { useAssetContext } from '../../api/contexts/asset.context';
import { useLanguageContext } from '../../contexts/language.context';
import { useQuery } from '../../hooks/query.hook';
import { Layout } from '../../components/layout';
import { useFiat } from '../../api/hooks/fiat.hook';
import { DeepPartial, useForm, useWatch } from 'react-hook-form';
import { Utils } from '../../utils';
import Validations from '../../validations';
import Form from '../../stories/form/Form';
import StyledInput from '../../stories/form/StyledInput';
import useDebounce from '../../hooks/debounce.hook';
import { useKyc } from '../../hooks/kyc.hook';
import { useBuyContext } from '../../api/contexts/buy.context';
import { Buy } from '../../api/definitions/buy';
import { PaymentInformation, PaymentInformationContent } from '../../components/buy/payment-information';
import StyledButton, { StyledButtonColors, StyledButtonWidths } from '../../stories/StyledButton';
import StyledVerticalStack from '../../stories/layout-helpers/StyledVerticalStack';
import StyledInfoText from '../../stories/StyledInfoText';
import DfxIcon, { IconColors, IconSizes, IconVariant } from '../../stories/DfxIcon';
import { MailEdit } from '../../components/edit/mail.edit';
import { useUserContext } from '../../api/contexts/user.context';

interface FormData {
  amount: number;
}

export function BuyPaymentScreen(): JSX.Element {
  const { currencies, receiveFor } = useBuyContext();
  const { translate } = useLanguageContext();
  const { assets, getAsset } = useAssetContext();
  const { isAllowedToBuy, start, limit } = useKyc();
  const { toSymbol } = useFiat();
  const { assetId, currencyId } = useQuery();
  const { user } = useUserContext();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInformation>();
  const [customAmountError, setCustomAmountError] = useState<string>();
  const [showsCompletion, setShowsCompletion] = useState(false);

  const asset = useMemo(() => getAsset(Number(assetId)), [assetId, assets, getAsset]);
  const currency = useMemo(
    () => currencies?.find((currency) => currency.id === Number(currencyId)),
    [currencyId, currencies],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();
  const data = useWatch({ control });
  const validatedData = validateData(useDebounce(data, 500));

  const dataValid = validatedData != null;
  const kycRequired = dataValid && !isAllowedToBuy(Number(validatedData?.amount));

  const showsSimple = user?.mail != null;

  useEffect(() => {
    if (!dataValid || !currency || !asset) return;

    const amount = Number(validatedData.amount);
    receiveFor({
      currency,
      amount,
      asset,
    })
      .then((value) => checkForMinDeposit(value, amount))
      .then((value) => toPaymentInformation(value))
      .then(setPaymentInfo);
  }, [validatedData, currency, asset]);

  function getHeader(): string {
    return showsSimple
      ? translate('screens/buy/payment', 'Nice! You are all set! Give us a minute to handle your transaction')
      : translate(
          'screens/buy/payment',
          'As soon as the transfer arrives in our bank account, we will transfer your asset in your wallet.',
        );
  }

  function checkForMinDeposit(buy: Buy, amount: number): Buy | undefined {
    if (buy.minDeposit.amount > amount) {
      setCustomAmountError(
        translate('screens/buy/payment', 'Entered amount is below minimum deposit of {{amount}} {{asset}}', {
          amount: Utils.formatAmount(buy.minDeposit.amount),
          asset: buy.minDeposit.asset,
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
      fee: `${buy.fee} %`,
      currency,
      amount: Number(data.amount),
    };
  }

  function onSubmit(_data: FormData) {
    // TODO (Krysh): fix broken form validation and onSubmit
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0) {
      return data as FormData;
    }
  }

  const rules = Utils.createRules({
    amount: Validations.Required,
  });

  function handleDone() {
    console.log('done');
  }

  return (
    <Layout
      backTitle={showsCompletion ? translate('screens/buy/payment', 'Done!') : translate('screens/buy/payment', 'Buy')}
      backToApp={showsCompletion}
      start
    >
      {showsCompletion ? (
        <StyledVerticalStack gap={4}>
          <div className="mx-auto">
            <DfxIcon size={IconSizes.XXL} icon={IconVariant.PROCESS_DONE} color={IconColors.BLUE} />
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
                label={translate('general/actions', 'close')}
                onClick={handleDone}
                color={StyledButtonColors.PALE_WHITE}
                width={StyledButtonWidths.FULL}
                caps
              />
            </>
          ) : (
            <MailEdit
              onSubmit={handleDone}
              onCancel={handleDone}
              infoText={translate(
                'screens/buy/payment',
                'Enter your email address if you want to be informed about the progress of any purchase or sale.',
              )}
              showCancelButton
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
              full
            />
          </Form>

          {paymentInfo && dataValid && !kycRequired && (
            <>
              <PaymentInformationContent info={paymentInfo} />
              <StyledButton
                width={StyledButtonWidths.FULL}
                label={translate('screens/buy/payment', 'Click once your bank transfer is completed.')}
                onClick={() => {
                  setShowsCompletion(true);
                }}
                caps={false}
              />
            </>
          )}
          {kycRequired && (
            <StyledVerticalStack gap={4} marginY={4}>
              <StyledInfoText invertedIcon>
                {translate(
                  'screens/buy/payment',
                  'Your account needs to get verified once your daily transaction volume exceeds {{limit}}. If you want to increase your daily trading limit, please complete our KYC (Know-Your-Customer) process.',
                  { limit },
                )}
              </StyledInfoText>
              <StyledButton
                width={StyledButtonWidths.FULL}
                label={translate('screens/buy/payment', 'Complete KYC')}
                onClick={start}
              />
            </StyledVerticalStack>
          )}
        </>
      )}
    </Layout>
  );
}
