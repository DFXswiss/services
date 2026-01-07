import { Country, Utils, Validations } from '@dfx.swiss/react';
import {
  AlignContent,
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledHorizontalStack,
  StyledInput,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
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

      // Pre-fill form with bank details if available
      if (data.refundTarget) {
        setValue('iban', data.refundTarget);
      }
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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
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
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/payment', 'Transaction amount')}>
          <p>
            {refundData.inputAmount} {refundData.inputAsset?.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'DFX fee')}>
          <p>
            {refundData.fee.dfx} {refundData.refundAsset?.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Bank fee')}>
          <p>
            {refundData.fee.bank} {refundData.refundAsset?.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'Network fee')}>
          <p>
            {refundData.fee.network} {refundData.refundAsset?.name}
          </p>
        </StyledDataTableRow>
        <StyledDataTableRow
          label={translate('screens/payment', 'Refund amount')}
          infoText={translate('screens/payment', 'Refund amount is the transaction amount minus the fee.')}
        >
          <p>
            {refundData.refundAmount} {refundData.refundAsset?.name}
          </p>
        </StyledDataTableRow>
        {refundData.bankDetails?.name && (
          <StyledDataTableRow label={translate('screens/payment', 'Name')}>
            <p>{refundData.bankDetails.name}</p>
          </StyledDataTableRow>
        )}
        {(refundData.bankDetails?.address || refundData.bankDetails?.houseNumber) && (
          <StyledDataTableRow label={translate('screens/payment', 'Address')}>
            <p>{[refundData.bankDetails.address, refundData.bankDetails.houseNumber].filter(Boolean).join(' ')}</p>
          </StyledDataTableRow>
        )}
        {(refundData.bankDetails?.zip || refundData.bankDetails?.city) && (
          <StyledDataTableRow label={translate('screens/payment', 'City')}>
            <p>{[refundData.bankDetails.zip, refundData.bankDetails.city].filter(Boolean).join(' ')}</p>
          </StyledDataTableRow>
        )}
        {refundData.bankDetails?.country && (
          <StyledDataTableRow label={translate('screens/payment', 'Country')}>
            <p>{refundData.bankDetails.country}</p>
          </StyledDataTableRow>
        )}
        {refundData.bankDetails?.iban && (
          <StyledDataTableRow label={translate('screens/payment', 'IBAN')}>
            <p>{Utils.formatIban(refundData.bankDetails.iban) ?? refundData.bankDetails.iban}</p>
          </StyledDataTableRow>
        )}
        {refundData.bankDetails?.bic && (
          <StyledDataTableRow label={translate('screens/payment', 'BIC')}>
            <p>{refundData.bankDetails.bic}</p>
          </StyledDataTableRow>
        )}
      </StyledDataTable>

      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full>
          <StyledInput
            name="iban"
            label={translate('screens/payment', 'Chargeback IBAN')}
            placeholder="CH..."
            full
            smallLabel
          />
          <StyledInput
            name="creditorName"
            autocomplete="name"
            label={translate('screens/kyc', 'Name')}
            placeholder={translate('screens/kyc', 'John Doe')}
            full
            smallLabel
          />
          <StyledHorizontalStack gap={2}>
            <StyledInput
              name="creditorStreet"
              autocomplete="street"
              label={translate('screens/kyc', 'Street')}
              placeholder={translate('screens/kyc', 'Street')}
              full
              smallLabel
            />
            <StyledInput
              name="creditorHouseNumber"
              autocomplete="house-number"
              label={translate('screens/kyc', 'House nr.')}
              placeholder="xx"
              small
              smallLabel
            />
          </StyledHorizontalStack>
          <StyledHorizontalStack gap={2}>
            <StyledInput
              name="creditorZip"
              autocomplete="zip"
              label={translate('screens/kyc', 'ZIP code')}
              placeholder="12345"
              small
              smallLabel
            />
            <StyledInput
              name="creditorCity"
              autocomplete="city"
              label={translate('screens/kyc', 'City')}
              placeholder={translate('screens/kyc', 'City')}
              full
              smallLabel
            />
          </StyledHorizontalStack>
          <StyledSearchDropdown<Country>
            rootRef={rootRef}
            name="creditorCountry"
            autocomplete="country"
            label={translate('screens/kyc', 'Country')}
            placeholder={translate('general/actions', 'Select') + '...'}
            items={allowedCountries}
            labelFunc={(item) => item.name}
            filterFunc={(i, s) => !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))}
            matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
            full
            smallLabel
          />

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
