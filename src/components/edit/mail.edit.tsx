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
import { useLanguageContext } from '../../contexts/language.context';

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
  const { translate } = useLanguageContext();

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
          label={translate('component/mail-edit', 'Contact information')}
          placeholder={translate('component/mail-edit', 'E-mail address')}
          name="email"
          hideLabel={hideLabels}
        />
        {infoText && infoTextPlacement === MailEditInfoTextPlacement.BELOW_INPUT && (
          <InfoTextElement text={infoText} iconColor={infoTextIconColor} />
        )}
        <StyledHorizontalStack gap={4}>
          {showCancelButton && onCancel && (
            <StyledButton
              label={translate('component/mail-edit', 'cancel')}
              onClick={onCancel}
              color={StyledButtonColor.STURDY_WHITE}
              width={StyledButtonWidth.FULL}
              caps
            />
          )}
          <StyledButton
            disabled={!isValid}
            label={isOptional ? translate('component/mail-edit', 'finish') : translate('component/mail-edit', 'save')}
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
