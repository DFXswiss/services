import { ApiError, Utils, Validations, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  IconColor,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInfoText,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSettingsContext } from '../../contexts/settings.context';
import { useMergedAccount } from '../../hooks/merged-account.hook';
import { ErrorHint } from '../error-hint';

interface MailEditProps {
  infoText?: string;
  infoTextIconColor?: IconColor;
  infoTextPlacement?: MailEditInfoTextPlacement;
  showCancelButton?: boolean;
  hideLabels?: boolean;
  isOptional?: boolean;
  onSubmit: (email?: string) => void;
  onCancel?: () => void;
}

export enum MailEditInfoTextPlacement {
  ABOVE_INPUT,
  BELOW_INPUT,
}

interface FormData {
  email: string;
}

export function MailEdit({
  onSubmit,
  onCancel,
  showCancelButton = false,
  hideLabels = false,
  isOptional = false,
  infoText,
  infoTextIconColor = IconColor.RED,
  infoTextPlacement = MailEditInfoTextPlacement.ABOVE_INPUT,
}: MailEditProps): JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onTouched' });
  const { updateMail, isUserUpdating } = useUserContext();
  const { translate, translateError } = useSettingsContext();
  const { handleMergedError } = useMergedAccount();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [showLinkHint, setShowLinkHint] = useState(false);
  const [error, setError] = useState<string>();

  function showMailConfirmation({ email }: FormData): void {
    setError(undefined);
    if (!email || email.length === 0) return onSubmit(email);
    setPendingEmail(email);
    setShowConfirmation(true);
  }

  async function saveUser(email: string): Promise<void> {
    setError(undefined);
    setShowLinkHint(false);
    setIsSaving(true);

    return updateMail(email)
      .then(() => onSubmit(email))
      .catch((e: ApiError) => {
        if (handleMergedError(e)) return;

        // the address belongs to an existing account: the merge mail is already out, so retrying
        // only sends another one — the user has to follow the link instead
        if (e.statusCode === 409 && e.message?.includes('exists') && e.message.includes('merge'))
          return setShowLinkHint(true);

        // This step can only set a first address. Changing an existing one needs 2FA plus a code
        // sent to the new address, and this component has no field to enter that code — so say so
        // instead of sending the user through a 2FA redirect that cannot restore this screen.
        if (e.code === 'TFA_REQUIRED')
          return setError(
            translate(
              'screens/kyc',
              'This account already has an email address. You can change it in your account settings.',
            ),
          );

        setError(e.message);
      })
      .finally(() => setIsSaving(false));
  }

  const rules = Utils.createRules({
    email: [!isOptional && Validations.Required, Validations.Mail],
  });

  if (showLinkHint) {
    return (
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
          onClick={() => onSubmit()}
        />
      </StyledVerticalStack>
    );
  }

  if (showConfirmation && pendingEmail) {
    return (
      <StyledVerticalStack gap={6} center>
        <p className="text-dfxGray-700 text-center">{translate('screens/kyc', 'Is this email address correct?')}</p>
        <p className="text-lg font-bold text-dfxBlue-800 break-all text-center">{pendingEmail}</p>

        {error && (
          <StyledVerticalStack full center>
            <ErrorHint message={error} />
          </StyledVerticalStack>
        )}

        <StyledHorizontalStack gap={4}>
          <StyledButton
            label={translate('general/actions', 'Change')}
            onClick={() => {
              setError(undefined);
              setShowConfirmation(false);
            }}
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
            caps
          />
          <StyledButton
            label={translate('general/actions', 'Confirm')}
            onClick={() => saveUser(pendingEmail)}
            isLoading={isSaving || isUserUpdating}
            width={StyledButtonWidth.FULL}
            caps
          />
        </StyledHorizontalStack>
      </StyledVerticalStack>
    );
  }

  return (
    <Form
      control={control}
      errors={errors}
      rules={rules}
      onSubmit={handleSubmit(showMailConfirmation)}
      translate={translateError}
    >
      <StyledVerticalStack gap={6}>
        {infoText && infoTextPlacement === MailEditInfoTextPlacement.ABOVE_INPUT && (
          <InfoTextElement text={infoText} iconColor={infoTextIconColor} />
        )}
        <StyledInput
          label={translate('screens/kyc', 'Contact information')}
          placeholder={translate('screens/kyc', 'Email address')}
          name="email"
          autocomplete="email"
          hideLabel={hideLabels}
        />
        {infoText && infoTextPlacement === MailEditInfoTextPlacement.BELOW_INPUT && (
          <InfoTextElement text={infoText} iconColor={infoTextIconColor} />
        )}
        <StyledHorizontalStack gap={4}>
          {showCancelButton && onCancel && (
            <StyledButton
              label={translate('general/actions', 'Cancel')}
              onClick={onCancel}
              color={StyledButtonColor.STURDY_WHITE}
              width={StyledButtonWidth.FULL}
              caps
            />
          )}
          <StyledButton
            type="submit"
            disabled={!isValid}
            label={isOptional ? translate('general/actions', 'Finish') : translate('general/actions', 'Save')}
            onClick={handleSubmit(showMailConfirmation)}
            isLoading={isUserUpdating}
            width={StyledButtonWidth.FULL}
            caps
          />
        </StyledHorizontalStack>
      </StyledVerticalStack>
    </Form>
  );
}

function InfoTextElement({ text, iconColor }: { text: string; iconColor: IconColor }): JSX.Element {
  return <StyledInfoText iconColor={iconColor}>{text}</StyledInfoText>;
}
