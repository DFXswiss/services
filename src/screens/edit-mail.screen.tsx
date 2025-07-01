import { ApiError, TfaLevel, useKyc, useUserContext, Utils, Validations } from '@dfx.swiss/react';
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
import { EditOverlay } from 'src/components/overlay/edit-overlay';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function EditMailScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { updateMail, verifyMail } = useUserContext();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const { check2fa } = useKyc();

  const [checking2fa, setChecking2fa] = useState(true);
  const [mailVerificationStep, setMailVerificationStep] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLinkHint, setShowLinkHint] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    check2fa(TfaLevel.BASIC)
      .catch(() => navigate('/2fa', { state: { level: TfaLevel.BASIC }, setRedirect: true }))
      .finally(() => setChecking2fa(false));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<{ token: string }>({ mode: 'onTouched' });

  async function onSubmit(newEmail: string) {
    setError(undefined);
    setShowLinkHint(false);

    return updateMail(newEmail)
      .then(() => setMailVerificationStep(true))
      .catch((e: ApiError) => {
        if (e.statusCode === 409 && e.message?.includes('exists')) {
          if (e.message.includes('merge')) {
            setShowLinkHint(true);
          } else {
            setError(e.message);
          }
        } else {
          setError(e.message);
        }
      });
  }

  async function onVerify(data: { token: string }) {
    setError(undefined);
    setTokenInvalid(false);
    setIsSubmitting(true);

    verifyMail(data.token)
      .then(() => navigate('/settings'))
      .catch((e: ApiError) =>
        e.statusCode === 403
          ? setTokenInvalid(true)
          : e.statusCode === 409 && e.message?.includes('exists')
          ? e.message.includes('merge')
            ? setShowLinkHint(true)
            : setError(e.message ?? 'Unknown error')
          : setError(e.message ?? 'Unknown error'),
      )
      .finally(() => setIsSubmitting(false));
  }

  const rules = Utils.createRules({
    token: [Validations.Required],
  });

  useLayoutOptions({ title: translate('general/actions', 'Edit email') });

  return (
    <StyledVerticalStack gap={4} full center>
      {showLinkHint ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">
            {translate('screens/kyc', 'It looks like you already have an account with DFX.')}{' '}
            {translate(
              'screens/kyc',
              'We have just sent you an email. To continue with your existing account, please confirm your email address by clicking on the link sent.',
            )}
          </p>
          <StyledButton
            width={StyledButtonWidth.MIN}
            label={translate('general/actions', 'OK')}
            onClick={() => navigate('/account')}
          />
        </StyledVerticalStack>
      ) : checking2fa ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : !mailVerificationStep ? (
        <EditOverlay
          label={translate('screens/kyc', 'Email address')}
          autocomplete="email"
          prefill={user?.mail}
          placeholder={translate('screens/kyc', 'Email address')}
          validation={Validations.Mail}
          onCancel={() => navigate('/settings')}
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
                  'screens/kyc',
                  'We have sent a 6-digit code to your new email address. Please enter it here.',
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
  );
}
