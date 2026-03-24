import { ApiError, Utils, Validations, useAuth } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useAppParams } from 'src/hooks/app-params.hook';
import { useAppHandlingContext } from '../../../contexts/app-handling.context';
import { useSettingsContext } from '../../../contexts/settings.context';
import { useNavigation } from '../../../hooks/navigation.hook';
import { ConnectError, ConnectProps } from '../connect-shared';

interface FormData {
  mail: string;
}

export default function ConnectMail({ onCancel }: ConnectProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { signInWithMail } = useAuth();
  const { navigate } = useNavigation();
  const { redirectPath } = useAppHandlingContext();
  const { search } = useLocation();
  const { recommendationCode } = useAppParams();

  const [isLoading, setIsLoading] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingMail, setPendingMail] = useState<string>();
  const [error, setError] = useState<string>();

  const mail = new URLSearchParams(search).get('user') || undefined;

  const win: Window = window;
  const redirectUri = redirectPath && `${win.location.origin}${redirectPath}`;

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { mail },
  });

  const rules = Utils.createRules({
    mail: [Validations.Required, Validations.Mail],
  });

  function showMailConfirmation({ mail }: FormData): void {
    setPendingMail(mail);
    setShowConfirmation(true);
  }

  async function submit(mail: string): Promise<void> {
    setIsLoading(true);
    setError(undefined);
    signInWithMail(mail, redirectUri, recommendationCode)
      .then(() => setMailSent(true))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }

  function goBack() {
    onCancel();
    navigate({ pathname: '/' }, { clearParams: ['user'] });
  }

  return (
    <Form
      control={control}
      rules={rules}
      errors={errors}
      onSubmit={handleSubmit(showMailConfirmation)}
      translate={translateError}
    >
      <StyledVerticalStack gap={6} full center>
        {mailSent ? (
          <>
            <p className="text-dfxGray-700">
              {translate('screens/home', 'We have sent an email with further instructions to the address provided.')}
            </p>

            <StyledButton
              label={translate('general/actions', 'Back')}
              onClick={goBack}
              width={StyledButtonWidth.MIN}
              color={StyledButtonColor.STURDY_WHITE}
            />
          </>
        ) : showConfirmation && pendingMail ? (
          <>
            <p className="text-dfxGray-700">{translate('screens/kyc', 'Is this email address correct?')}</p>
            <p className="text-lg font-bold text-dfxBlue-800 break-all">{pendingMail}</p>

            <StyledHorizontalStack gap={4} spanAcross>
              <StyledButton
                label={translate('general/actions', 'Change')}
                onClick={() => setShowConfirmation(false)}
                color={StyledButtonColor.STURDY_WHITE}
                width={StyledButtonWidth.FULL}
              />
              <StyledButton
                label={translate('general/actions', 'Confirm')}
                onClick={() => submit(pendingMail)}
                width={StyledButtonWidth.FULL}
                isLoading={isLoading}
              />
            </StyledHorizontalStack>

            {error && <ConnectError error={error} />}
          </>
        ) : (
          <>
            <StyledInput
              name="mail"
              autocomplete="email"
              type="email"
              label={translate('screens/kyc', 'Email address')}
              placeholder={translate('screens/kyc', 'example@mail.com')}
              disabled={isLoading}
              full
              smallLabel
            />

            <StyledButton
              type="submit"
              disabled={!isValid}
              label={translate('general/actions', 'Next')}
              onClick={handleSubmit(showMailConfirmation)}
              width={StyledButtonWidth.MIN}
              className="self-center"
            />

            {error && <ConnectError error={error} />}
          </>
        )}
      </StyledVerticalStack>
    </Form>
  );
}
