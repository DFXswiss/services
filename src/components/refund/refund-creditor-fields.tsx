import { Country } from '@dfx.swiss/react';
import { StyledHorizontalStack, StyledInput, StyledSearchDropdown } from '@dfx.swiss/react-components';
import { MutableRefObject } from 'react';
import { Control, FieldError } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';

interface RefundCreditorFieldsProps {
  readonly rootRef: MutableRefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly rules?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly errors?: Record<string, any>;
  readonly showIban?: boolean;
  readonly showName?: boolean;
}

export function RefundCreditorFields({
  rootRef,
  control,
  rules,
  errors,
  showIban = true,
  showName = true,
}: RefundCreditorFieldsProps): JSX.Element {
  const { translate, translateError, allowedCountries } = useSettingsContext();

  function getError(name: string): FieldError | undefined {
    const err = errors?.[name] as FieldError | undefined;
    if (!err?.message) return err;
    return { ...err, message: translateError(err.message) };
  }

  return (
    <>
      {showIban && (
        <StyledInput
          control={control}
          rules={rules?.iban}
          error={getError('iban')}
          name="iban"
          label={translate('screens/payment', 'Chargeback IBAN')}
          placeholder="CH..."
          full
          smallLabel
        />
      )}
      {showName && (
        <StyledInput
          control={control}
          rules={rules?.creditorName}
          error={getError('creditorName')}
          name="creditorName"
          autocomplete="name"
          label={translate('screens/kyc', 'Name')}
          placeholder={translate('screens/kyc', 'John Doe')}
          full
          smallLabel
        />
      )}
      <StyledHorizontalStack gap={2}>
        <StyledInput
          control={control}
          rules={rules?.creditorStreet}
          error={getError('creditorStreet')}
          name="creditorStreet"
          autocomplete="street"
          label={translate('screens/kyc', 'Street')}
          placeholder={translate('screens/kyc', 'Street')}
          full
          smallLabel
        />
        <StyledInput
          control={control}
          rules={rules?.creditorHouseNumber}
          error={getError('creditorHouseNumber')}
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
          control={control}
          rules={rules?.creditorZip}
          error={getError('creditorZip')}
          name="creditorZip"
          autocomplete="zip"
          label={translate('screens/kyc', 'ZIP code')}
          placeholder="12345"
          small
          smallLabel
        />
        <StyledInput
          control={control}
          rules={rules?.creditorCity}
          error={getError('creditorCity')}
          name="creditorCity"
          autocomplete="city"
          label={translate('screens/kyc', 'City')}
          placeholder={translate('screens/kyc', 'City')}
          full
          smallLabel
        />
      </StyledHorizontalStack>
      <StyledSearchDropdown<Country>
        control={control}
        rules={rules?.creditorCountry}
        error={getError('creditorCountry')}
        rootRef={rootRef}
        name="creditorCountry"
        autocomplete="country"
        label={translate('screens/kyc', 'Country')}
        placeholder={translate('general/actions', 'Select') + '...'}
        items={allowedCountries ?? []}
        labelFunc={(item) => item.name}
        filterFunc={(i, s) => !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))}
        matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
        full
        smallLabel
      />
    </>
  );
}
