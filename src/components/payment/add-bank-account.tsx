import { BankAccount, CreateBankAccount, Utils, Validations, useBankAccountContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInput,
  StyledSpacer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSettingsContext } from '../../contexts/settings.context';
import { ErrorHint } from '../error-hint';

interface AddBankAccountProps {
  onSubmit: (bankAccount: BankAccount) => void;
}

export function AddBankAccount({ onSubmit }: AddBankAccountProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateBankAccount>({ mode: 'onTouched' });
  const { createAccount, isAccountLoading } = useBankAccountContext();
  const { allowedCountries } = useSettingsContext();

  async function createBankAccount(newAccount: CreateBankAccount): Promise<void> {
    setError(undefined);
    createAccount(newAccount)
      .then(onSubmit)
      .catch((e) => setError(e.message ?? 'Unknown error'));
  }

  const rules = Utils.createRules({
    iban: [Validations.Required, Validations.Iban(allowedCountries)],
  });

  return (
    <Form
      control={control}
      rules={rules}
      errors={errors}
      onSubmit={handleSubmit(createBankAccount)}
      translate={translateError}
    >
      <StyledVerticalStack gap={4}>
        <StyledInput
          name="iban"
          autocomplete="iban"
          label={translate('screens/payment', 'IBAN')}
          placeholder="XX XXXX XXXX XXXX XXXX X"
        />
        <StyledInput
          name="label"
          autocomplete="label"
          label={translate('screens/sell', 'Optional - Account Designation')}
          placeholder={translate('screens/sell', 'e.g. Deutsche Bank')}
        />
        <StyledSpacer spacing={-1} />

        {error && (
          <div className="text-center">
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          disabled={!isValid}
          color={StyledButtonColor.RED}
          label={translate('screens/iban', 'Add bank account')}
          onClick={handleSubmit(createBankAccount)}
          isLoading={isAccountLoading}
          caps
          width={StyledButtonWidth.FULL}
          className="mb-4"
        />
      </StyledVerticalStack>
    </Form>
  );
}
