import { Country, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { RefundCreditorFields } from 'src/components/refund/refund-creditor-fields';
import { RefundDataTable } from 'src/components/refund/refund-data-table';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { TransactionRefundData, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

interface FormData {
  iban: string;
  creditorName: string;
  creditorStreet: string;
  creditorHouseNumber: string;
  creditorZip: string;
  creditorCity: string;
  creditorCountry: Country;
}

export default function ComplianceBankTxReturnScreen(): JSX.Element {
  useComplianceGuard();

  const { id } = useParams<{ id: string }>();
  const { translate, translateError, allowedCountries } = useSettingsContext();
  const { getTransactionRefundData, processTransactionRefund } = useCompliance();
  const { goBack } = useNavigation();
  const { rootRef } = useLayoutContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [refundData, setRefundData] = useState<TransactionRefundData>();
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    setValue,
  } = useForm<FormData>({ mode: 'onTouched' });

  useEffect(() => {
    if (id) {
      loadRefundData(+id);
    }
  }, [id]);

  async function loadRefundData(transactionId: number) {
    setIsLoading(true);
    setError(undefined);

    try {
      const data = await getTransactionRefundData(transactionId);
      setRefundData(data);

      if (data.refundTarget) setValue('iban', data.refundTarget);
      if (data.bankDetails) {
        if (data.bankDetails.name) setValue('creditorName', data.bankDetails.name);
        if (data.bankDetails.address) setValue('creditorStreet', data.bankDetails.address);
        if (data.bankDetails.houseNumber) setValue('creditorHouseNumber', data.bankDetails.houseNumber);
        if (data.bankDetails.zip) setValue('creditorZip', data.bankDetails.zip);
        if (data.bankDetails.city) setValue('creditorCity', data.bankDetails.city);
        if (data.bankDetails.country) {
          const country = allowedCountries.find((c) => c.symbol === data.bankDetails?.country);
          if (country) setValue('creditorCountry', country);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(formData: FormData) {
    if (!id) return;

    setIsSubmitting(true);
    setError(undefined);

    try {
      await processTransactionRefund(+id, {
        refundTarget: formData.iban,
        name: formData.creditorName,
        address: formData.creditorStreet,
        houseNumber: formData.creditorHouseNumber || undefined,
        zip: formData.creditorZip,
        city: formData.creditorCity,
        country: formData.creditorCountry.symbol,
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const rules = Utils.createRules({
    iban: Validations.Required,
    creditorName: Validations.Required,
    creditorStreet: Validations.Required,
    creditorZip: Validations.Required,
    creditorCity: Validations.Required,
    creditorCountry: Validations.Required,
  });

  useLayoutOptions({ title: translate('screens/compliance', 'Bank Transaction Return') });

  if (success) {
    return (
      <StyledVerticalStack gap={6} full center>
        <div className="text-center">
          <h2 className="text-dfxBlue-800 text-xl font-semibold mb-4">
            {translate('screens/compliance', 'Return initiated successfully')}
          </h2>
          <p className="text-dfxGray-700 mb-6">
            {translate('screens/compliance', 'The bank transaction return has been initiated.')}
          </p>
          <StyledButton label={translate('general/actions', 'Back')} onClick={goBack} width={StyledButtonWidth.MD} />
        </div>
      </StyledVerticalStack>
    );
  }

  if (isLoading) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  if (!refundData) {
    return (
      <StyledVerticalStack gap={6} full center>
        {error && <ErrorHint message={error} />}
        <StyledButton label={translate('general/actions', 'Back')} onClick={goBack} width={StyledButtonWidth.MD} />
      </StyledVerticalStack>
    );
  }

  return (
    <StyledVerticalStack gap={6} full>
      <RefundDataTable refundData={refundData} />

      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full>
          <RefundCreditorFields rootRef={rootRef} control={control} rules={rules} errors={errors} />

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          <StyledButton
            type="submit"
            label={translate('general/actions', 'Confirm refund')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isSubmitting}
          />

          <StyledButton
            label={translate('general/actions', 'Cancel')}
            onClick={goBack}
            width={StyledButtonWidth.FULL}
            color={StyledButtonColor.WHITE}
          />
        </StyledVerticalStack>
      </Form>
    </StyledVerticalStack>
  );
}
