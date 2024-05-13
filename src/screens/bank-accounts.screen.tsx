import {
  ApiError,
  Iban,
  Utils,
  Validations,
  useBankAccount,
  useSessionContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledInfoText,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function BankAccountsScreen(): JSX.Element {
  useUserGuard('/login');

  const { navigate } = useNavigation();
  const { translate, translateError } = useSettingsContext();
  const { getIbans, addIban } = useBankAccount();
  const { isLoggedIn } = useSessionContext();
  const { countries } = useUserContext();

  const [accounts, setAccounts] = useState<Iban[]>();
  const [isAdd, setIsAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [customError, setCustomError] = useState<string>();

  useEffect(() => {
    if (isLoggedIn)
      getIbans()
        .then(setAccounts)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [isLoggedIn]);

  // form
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<Iban>();

  const rules = Utils.createRules({
    iban: [Validations.Required, Validations.Iban(countries)],
  });

  function onSubmit({ iban }: Iban) {
    setIsSubmitting(true);
    setError(undefined);
    setCustomError(undefined);

    addIban(iban)
      .then(() => navigate('/tx'))
      .catch((e: ApiError) => {
        if (e.statusCode === 409) {
          setCustomError(translate('screens/iban', 'IBAN already exists in another DFX customer account'));
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
      .finally(() => setIsSubmitting(false));
  }

  return (
    <Layout title={translate('screens/iban', 'Bank Accounts')} onBack={isAdd ? () => setIsAdd(false) : undefined}>
      <StyledVerticalStack gap={6} full center>
        {accounts ? (
          isAdd ? (
            <Form
              control={control}
              errors={errors}
              rules={rules}
              onSubmit={handleSubmit(onSubmit)}
              translate={translateError}
            >
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

                {customError && (
                  <div className="text-left">
                    <StyledInfoText invertedIcon>{customError}</StyledInfoText>
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
                      {Utils.formatIban(iban)}
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
        ) : error ? (
          <div>
            <ErrorHint message={error} />
          </div>
        ) : (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        )}
      </StyledVerticalStack>
    </Layout>
  );
}
