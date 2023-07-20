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
import { useLanguageContext } from '../../contexts/language.context';

interface AddBankAccountProps {
  onSubmit: (bankAccount: BankAccount) => void;
}

export function AddBankAccount({ onSubmit }: AddBankAccountProps): JSX.Element {
  const { translate } = useLanguageContext();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateBankAccount>();
  const { createAccount, isAccountLoading } = useBankAccountContext();
  const { countries } = useUserContext();

  async function createBankAccount(newAccount: CreateBankAccount): Promise<void> {
    createAccount(newAccount).then(onSubmit);
  }

  const rules = Utils.createRules({
    iban: [Validations.Required, Validations.Iban(countries)],
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(createBankAccount)}>
      <StyledVerticalStack gap={4}>
        <StyledInput name="iban" label={translate('screens/sell', 'IBAN')} placeholder="XX XXXX XXXX XXXX XXXX X" />
        <StyledInput
          name="label"
          label={translate('screens/sell', 'Optional - Account Designation')}
          placeholder={translate('screens/sell', 'eg. Deutsche Bank')}
        />
        <StyledSpacer spacing={-1} />
        <StyledButton
          disabled={!isValid}
          color={StyledButtonColor.RED}
          label={translate('screens/sell', 'Add Bank Account')}
          onClick={handleSubmit(createBankAccount)}
          isLoading={isAccountLoading}
          caps
          width={StyledButtonWidth.FULL}
        />
      </StyledVerticalStack>
    </Form>
  );
}
