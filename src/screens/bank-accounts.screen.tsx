import { ApiError, Iban, Utils, Validations, useBankAccount, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledInfoText,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export default function BankAccountsScreen(): JSX.Element {
  useUserGuard('/login');

  const { state } = useLocation();
  const { goBack } = useNavigation();
  const { translate, translateError } = useSettingsContext();
  const { addIban } = useBankAccount();
  const { countries } = useUserContext();

  const isMissingTxIssue = useRef<boolean>(state?.isMissingTxIssue);
  const newIban = useRef<string>();

  const [isAdded, setIsAdded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [customError, setCustomError] = useState<string>();

  useEffect(() => {
    isMissingTxIssue.current = state?.isMissingTxIssue;
  }, []);

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
      .then(() => {
        newIban.current = iban;
        setIsAdded(true);
      })
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
      .finally(() => setIsSubmitting(false));
  }

  function onClose() {
    goBack({ state: { newIban: newIban.current } });
  }

  return (
    <Layout title={translate('screens/iban', 'Bank Accounts')}>
      <StyledVerticalStack gap={6} full center>
        {isAdded ? (
          <>
            <p className="text-dfxGray-700">
              {translate(
                'screens/iban',
                isMissingTxIssue.current
                  ? 'The bank account has been added, all transactions from this IBAN will now be associated with your account. Please check the transaction overview to see if your missing transaction is now visible.'
                  : 'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
              )}
            </p>

            <StyledButton color={StyledButtonColor.RED} label={translate('general/actions', 'OK')} onClick={onClose} />
          </>
        ) : (
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
        )}
      </StyledVerticalStack>
    </Layout>
  );
}
