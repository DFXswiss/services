import { Utils, Validations, useUserContext } from '@dfx.swiss/react';
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
import { useForm } from 'react-hook-form';
import { useSettingsContext } from '../../contexts/settings.context';

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
  } = useForm<FormData>();
  const { changeMail, isUserUpdating } = useUserContext();
  const { translate } = useSettingsContext();

  async function saveUser({ email }: FormData): Promise<void> {
    if (!email || email.length === 0) return onSubmit(email);
    return changeMail(email).then(() => onSubmit(email));
  }

  const rules = Utils.createRules({
    email: [!isOptional && Validations.Required, Validations.Mail],
  });

  return (
    <Form control={control} errors={errors} rules={rules} onSubmit={handleSubmit(saveUser)}>
      <StyledVerticalStack gap={6}>
        {infoText && infoTextPlacement === MailEditInfoTextPlacement.ABOVE_INPUT && (
          <InfoTextElement text={infoText} iconColor={infoTextIconColor} />
        )}
        <StyledInput
          label={translate('screens/profile', 'Contact information')}
          placeholder={translate('screens/profile', 'Email address')}
          name="email"
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
            onClick={handleSubmit(saveUser)}
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
