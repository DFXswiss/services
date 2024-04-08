import { ApiError, Iban, Utils, Validations, useBankAccount, useSessionContext } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function BankAccountsScreen(): JSX.Element {
  useSessionGuard('/login');

  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { getIbans, addIban } = useBankAccount();
  const { isLoggedIn } = useSessionContext();

  const [accounts, setAccounts] = useState<Iban[]>();
  const [isAdd, setIsAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isLoggedIn) getIbans().then(setAccounts);
  }, [isLoggedIn]);

  // form
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<Iban>();

  const rules = Utils.createRules({
    iban: [Validations.Required, Validations.Iban],
  });

  function onSubmit({ iban }: Iban) {
    setIsSubmitting(true);
    addIban(iban)
      .then(() => navigate('/tx'))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Layout title={translate('screens/iban', 'Bank Accounts')} onBack={isAdd ? () => setIsAdd(false) : undefined}>
      <StyledVerticalStack gap={6} full center>
        {accounts ? (
          isAdd ? (
            <Form control={control} errors={errors} rules={rules} onSubmit={handleSubmit(onSubmit)}>
              <StyledVerticalStack gap={3} full>
                <StyledInput
                  name="iban"
                  autocomplete="iban"
                  label={translate('screens/payment', 'IBAN')}
                  placeholder={translate('screens/payment', 'CH46 8914 4632 3427 5387 5')}
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
                  isLoading={isSubmitting}
                  disabled={!isValid}
                  label={translate('general/actions', 'Next')}
                  onClick={handleSubmit(onSubmit)}
                />
              </StyledVerticalStack>
            </Form>
          ) : (
            <>
              {accounts.length > 0 && (
                <div>
                  <h2 className="text-dfxGray-700 mb-2">
                    {translate('screens/iban', 'Accounts already used with DFX')}
                  </h2>
                  {accounts.map(({ iban }) => (
                    <p key={iban} className="text-dfxGray-700">
                      {iban}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-dfxGray-700">
                {translate(
                  'screens/iban',
                  'To find your missing transaction, please add the bank account from which you sent the money.',
                )}
              </p>

              <StyledButton
                color={StyledButtonColor.RED}
                label={translate('screens/iban', 'Add account')}
                onClick={() => setIsAdd(true)}
              />
            </>
          )
        ) : (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        )}
      </StyledVerticalStack>
    </Layout>
  );
}
