import { ApiError, BankAccount, CreateBankAccount, Utils, Validations, useBankAccountContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInfoText,
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
  confirmationText?: string;
}

export function AddBankAccount({ onSubmit, confirmationText }: AddBankAccountProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();

  const [error, setError] = useState<string>();
  const [customError, setCustomError] = useState<string>();
  const [confirmBankAccount, setConfirmBankAccount] = useState<BankAccount>();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateBankAccount>({ mode: 'onTouched' });
  const { createAccount } = useBankAccountContext();
  const { allowedCountries } = useSettingsContext();

  async function createBankAccount(newAccount: CreateBankAccount): Promise<void> {
    setError(undefined);
    setCustomError(undefined);
    setConfirmBankAccount(undefined);

    setIsLoading(true);
    createAccount(newAccount)
      .then(!confirmationText ? onSubmit : setConfirmBankAccount)
      .catch((e: ApiError) => {
        if (e.statusCode === 403) {
          setCustomError(translate('screens/iban', 'This IBAN already exists in another DFX customer account.'));
        } else if (e.statusCode === 409) {
          let error = translate('screens/iban', 'This IBAN already exists in another DFX customer account.') + ' ';
          error += e.message?.includes('account merge')
            ? translate(
                'screens/kyc',
                'We have just sent you an email. To continue with your existing account, please confirm your email address by clicking on the link sent.',
              )
            : translate('screens/kyc', 'Start the KYC process with the same email to merge your accounts.');

          setCustomError(error);
        } else if (e.statusCode === 400 && e.message?.includes('Multi-account IBAN')) {
          setCustomError(
            translate(
              'screens/iban',
              'This is a multi-account IBAN and cannot be added as a personal account. Please send the confirmation of the bank transaction as a PDF to support@dfx.swiss.',
            ),
          );
        } else {
          setError(e.message ?? 'Unknown error');
        }
      })
      .finally(() => setIsLoading(false));
  }

  const rules = Utils.createRules({
    iban: [Validations.Required, Validations.Iban(allowedCountries)],
  });

  return confirmBankAccount ? (
    <>
      <p className="text-dfxGray-700">{confirmationText}</p>

      <StyledButton
        color={StyledButtonColor.RED}
        label={translate('general/actions', 'OK')}
        onClick={() => onSubmit(confirmBankAccount)}
      />
    </>
  ) : (
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
          autocomplete="iban-label"
          label={translate('screens/sell', 'Optional - Account Designation')}
          placeholder={translate('screens/sell', 'e.g. Deutsche Bank')}
        />
        <StyledSpacer spacing={-1} />

        {error && (
          <div className="text-center">
            <ErrorHint message={error} />
          </div>
        )}

        {customError && (
          <div className="text-left">
            <StyledInfoText invertedIcon>{customError}</StyledInfoText>
          </div>
        )}

        <StyledButton
          type="submit"
          disabled={!isValid}
          color={StyledButtonColor.RED}
          label={translate('screens/iban', 'Add bank account')}
          onClick={handleSubmit(createBankAccount)}
          isLoading={isLoading}
          caps
          width={StyledButtonWidth.FULL}
          className="mb-4"
        />
      </StyledVerticalStack>
    </Form>
  );
}
