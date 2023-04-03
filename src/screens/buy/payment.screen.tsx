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
import StyledButton, { StyledButtonWidths } from '../../stories/StyledButton';
import StyledVerticalStack from '../../stories/layout-helpers/StyledVerticalStack';
import StyledInfoText from '../../stories/StyledInfoText';

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

  function checkForMinDeposit(buy: Buy, amount: number): Buy | undefined {
    if (buy.minDeposit.amount > amount) {
      setCustomAmountError(
        translate('screens/buy', 'Entered amount is below minimum deposit of {{amount}} {{asset}}', {
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

  return (
    <Layout backTitle={translate('screens/buy', 'Buy')} start>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledInput
          type={'number'}
          label={translate('screens/buy', 'Buy Amount')}
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
            label={translate('screens/buy', 'Click once your bank transfer is completed.')}
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
              'screens/buy',
              'Your account needs to get verified once your daily transaction volume exceeds {{limit}}. If you want to increase your daily trading limit, please complete our KYC (Know-Your-Customer) process.',
              { limit },
            )}
          </StyledInfoText>
          <StyledButton
            width={StyledButtonWidths.FULL}
            label={translate('screens/buy', 'Complete KYC')}
            onClick={start}
          />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
