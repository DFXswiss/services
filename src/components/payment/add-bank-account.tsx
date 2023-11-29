import {
  BankAccount,
  CreateBankAccount,
  Utils,
  Validations,
  useBankAccountContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInput,
  StyledSpacer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useForm } from 'react-hook-form';
import { useSettingsContext } from '../../contexts/settings.context';

interface AddBankAccountProps {
  onSubmit: (bankAccount: BankAccount) => void;
}

export function AddBankAccount({ onSubmit }: AddBankAccountProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateBankAccount>({ mode: 'onTouched' });
  const { createAccount, isAccountLoading } = useBankAccountContext();
  const { countries } = useUserContext();

  async function createBankAccount(newAccount: CreateBankAccount): Promise<void> {
    createAccount(newAccount).then(onSubmit);
  }

  const rules = Utils.createRules({
    iban: [Validations.Required, Validations.Iban(countries)],
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
        <StyledInput name="iban" label={translate('screens/payment', 'IBAN')} placeholder="XX XXXX XXXX XXXX XXXX X" />
        <StyledInput
          name="label"
          label={translate('screens/sell', 'Optional - Account Designation')}
          placeholder={translate('screens/sell', 'e.g. Deutsche Bank')}
        />
        <StyledSpacer spacing={-1} />
        <StyledButton
          type="submit"
          disabled={!isValid}
          color={StyledButtonColor.RED}
          label={translate('screens/sell', 'Add Bank Account')}
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
