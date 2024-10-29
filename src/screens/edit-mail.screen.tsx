import { ApiError, TfaLevel, useApi, useUserContext, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Layout } from 'src/components/layout';
import { EditOverlay } from 'src/components/overlays';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function EditMailScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { changeMail, verifyMail } = useUserContext();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const { call } = useApi();

  const [checking2fa, setChecking2fa] = useState(true);
  const [mailVerificationStep, setMailVerificationStep] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    call({ url: 'kyc/2fa?level=Basic', version: 'v2', method: 'GET' })
      .catch(() => navigate('/2fa', { state: { level: TfaLevel.BASIC }, setRedirect: true }))
      .finally(() => setChecking2fa(false));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<{ token: string }>({ mode: 'onTouched' });

  async function onSubmit(newEmail: string) {
    return changeMail(newEmail)
      .then(() => setMailVerificationStep(true))
      .catch((e: ApiError) => setError(e.message));
  }

  async function onVerify(data: { token: string }) {
    setError(undefined);
    setTokenInvalid(false);
    setIsSubmitting(true);

    verifyMail(data.token)
      .then(() => navigate('/settings'))
      .catch((e: ApiError) => (e.statusCode === 403 ? setTokenInvalid(true) : setError(e.message ?? 'Unknown error')))
      .finally(() => setIsSubmitting(false));
  }

  const rules = Utils.createRules({
    token: [Validations.Required],
  });

  return (
    <Layout title={translate('general/actions', 'Edit email')}>
      <StyledVerticalStack gap={4} full center>
        {checking2fa ? (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        ) : !mailVerificationStep ? (
          <EditOverlay
            label={translate('screens/kyc', 'Email address')}
            prefill={user?.mail}
            placeholder={translate('screens/kyc', 'Email address')}
            validation={Validations.Mail}
            onCancel={() => navigate('/account')}
            onEdit={onSubmit}
          />
        ) : (
          <Form
            control={control}
            rules={rules}
            errors={errors}
            onSubmit={handleSubmit(onVerify)}
            translate={translateError}
          >
            <StyledVerticalStack gap={4} full>
              <h2 className="text-dfxGray-700">
                <span className="font-medium">
                  {translate(
                    'screens/2fa',
                    'We just sent you an Email to your new Email address. Enter the 6-digit code from this Email.',
                  )}
                </span>
              </h2>
              <StyledInput
                name="token"
                type="number"
                placeholder={translate('screens/2fa', 'Email code')}
                forceError={tokenInvalid}
                forceErrorMessage={tokenInvalid ? translate('screens/2fa', 'Invalid or expired code') : undefined}
                full
              />

              <StyledVerticalStack gap={2} full center>
                <StyledButton
                  type="submit"
                  width={StyledButtonWidth.MIN}
                  label={translate('general/actions', 'Next')}
                  onClick={handleSubmit(onVerify)}
                  isLoading={isSubmitting}
                  disabled={!isValid}
                />
              </StyledVerticalStack>
            </StyledVerticalStack>
          </Form>
        )}
        {error && (
          <StyledVerticalStack full center>
            <ErrorHint message={error} />
          </StyledVerticalStack>
        )}
      </StyledVerticalStack>
    </Layout>
  );
}
