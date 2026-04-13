import { FundOrigin, InvestmentDate, Limit } from '@dfx.swiss/react';
import { StyledDropdown, StyledFileUpload, StyledInput } from '@dfx.swiss/react-components';
import { MutableRefObject } from 'react';
import { Control, FieldError } from 'react-hook-form';
import { DateLabels, LimitLabels, OriginFutureLabels, OriginNowLabels } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';

interface LimitRequestFieldsProps {
  rootRef: MutableRefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: Record<string, any>;
  investmentDate?: InvestmentDate;
}

export function LimitRequestFields({
  rootRef,
  control,
  rules,
  errors,
  investmentDate,
}: LimitRequestFieldsProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  function getError(name: string): FieldError | undefined {
    const err = errors?.[name] as FieldError | undefined;
    if (!err?.message) return err;
    return { ...err, message: translateError(err.message) };
  }

  return (
    <>
      <StyledInput
        control={control}
        rules={rules?.name}
        error={getError('name')}
        name="name"
        autocomplete="name"
        label={translate('screens/support', 'Name')}
        placeholder={`${translate('screens/kyc', 'John')} ${translate('screens/kyc', 'Doe')}`}
        full
      />

      <StyledDropdown<Limit>
        control={control}
        rules={rules?.limit}
        error={getError('limit')}
        rootRef={rootRef}
        label={translate('screens/limit', 'Investment volume')}
        items={Object.values(Limit).filter((i) => typeof i !== 'string') as number[]}
        labelFunc={(item) => LimitLabels[item]}
        name="limit"
        placeholder={translate('general/actions', 'Select') + '...'}
        full
      />

      <StyledDropdown<InvestmentDate>
        control={control}
        rules={rules?.investmentDate}
        error={getError('investmentDate')}
        rootRef={rootRef}
        label={translate('screens/limit', 'Investment date')}
        items={Object.values(InvestmentDate)}
        labelFunc={(item) => translate('screens/limit', DateLabels[item])}
        name="investmentDate"
        placeholder={translate('general/actions', 'Select') + '...'}
        full
      />

      <StyledDropdown<FundOrigin>
        control={control}
        rules={rules?.fundOrigin}
        error={getError('fundOrigin')}
        rootRef={rootRef}
        label={translate('screens/limit', 'Origin of funds')}
        items={Object.values(FundOrigin)}
        labelFunc={(item) =>
          translate(
            'screens/limit',
            investmentDate === InvestmentDate.FUTURE ? OriginFutureLabels[item] : OriginNowLabels[item],
          )
        }
        name="fundOrigin"
        placeholder={translate('general/actions', 'Select') + '...'}
        full
      />

      <StyledInput
        control={control}
        rules={rules?.message}
        error={getError('message')}
        name="message"
        label={`${translate('screens/limit', 'Origin of funds')} (${translate('screens/limit', 'free text')})`}
        multiLine
        full
      />

      <StyledFileUpload
        control={control}
        rules={rules?.file}
        error={getError('file')}
        name="file"
        label={translate('screens/support', 'File')}
        placeholder={translate('general/actions', 'Drop files here')}
        buttonLabel={translate('general/actions', 'Browse')}
        full
      />
    </>
  );
}
