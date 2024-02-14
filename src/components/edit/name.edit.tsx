import { ApiError, Utils, Validations, useKyc } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSettingsContext } from '../../contexts/settings.context';
import { ErrorHint } from '../error-hint';

interface NameEditProps {
  onSuccess: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
}

export function NameEdit({ onSuccess }: NameEditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { setName } = useKyc();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onTouched' });

  function onSubmit(data: FormData) {
    setIsUpdating(true);
    setError(undefined);
    setName(data)
      .then(onSuccess)
      .catch((error: ApiError) => {
        setError(error.message ?? 'Unknown error');
        setIsUpdating(false);
      });
  }

  const rules = Utils.createRules({
    firstName: Validations.Required,
    lastName: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full>
        <StyledHorizontalStack gap={2}>
          <StyledInput
            name="firstName"
            autocomplete="firstname"
            label={translate('screens/kyc', 'First name')}
            placeholder={translate('screens/kyc', 'John')}
            full
            smallLabel
          />
          <StyledInput
            name="lastName"
            autocomplete="lastname"
            label={translate('screens/kyc', 'Last name')}
            placeholder={translate('screens/kyc', 'Doe')}
            full
            smallLabel
          />
        </StyledHorizontalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating}
        />
      </StyledVerticalStack>
    </Form>
  );
}
