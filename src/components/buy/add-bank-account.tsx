import { useForm } from 'react-hook-form';
import { useBuyContext } from '../../api/contexts/buy.context';
import { useUserContext } from '../../api/contexts/user.context';
import { BankAccount } from '../../api/definitions/bank-account';
import { CreateBankAccount } from '../../api/hooks/bank-account.hook';
import Form from '../../stories/form/Form';
import StyledInput from '../../stories/form/StyledInput';
import StyledSpacer from '../../stories/layout-helpers/StyledSpacer';
import StyledVerticalStack from '../../stories/layout-helpers/StyledVerticalStack';
import StyledButton, { StyledButtonColors, StyledButtonWidths } from '../../stories/StyledButton';
import { Utils } from '../../utils';
import Validations from '../../validations';

interface AddBankAccountProps {
  onSubmit: (bankAccount: BankAccount) => void;
}

export function AddBankAccount({ onSubmit }: AddBankAccountProps): JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateBankAccount>();
  const { createAccount, isAccountLoading } = useBuyContext();
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
        <StyledInput label="IBAN" placeholder="XX XXXX XXXX XXXX XXXX X" name="iban" />
        <StyledInput label="Optional - Account Designation" placeholder="eg. Deutsche Bank" name="label" />
        <StyledSpacer spacing={-1} />
        <StyledButton
          disabled={!isValid}
          color={StyledButtonColors.RED}
          label="Add Bank Account"
          onClick={handleSubmit(createBankAccount)}
          isLoading={isAccountLoading}
          caps
          width={StyledButtonWidths.FULL}
        />
      </StyledVerticalStack>
    </Form>
  );
}
