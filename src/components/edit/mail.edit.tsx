import { useForm } from 'react-hook-form';
import { IconColors } from '../../stories/DfxIcon';
import Form from '../../stories/form/Form';
import StyledInput from '../../stories/form/StyledInput';
import StyledHorizontalStack from '../../stories/layout-helpers/StyledHorizontalStack';
import StyledVerticalStack from '../../stories/layout-helpers/StyledVerticalStack';
import StyledButton, { StyledButtonColors, StyledButtonWidths } from '../../stories/StyledButton';
import StyledInfoText from '../../stories/StyledInfoText';
import { useLanguageContext } from '../../contexts/language.context';
import { Utils, Validations, useUserContext } from '@dfx.swiss/react';

interface MailEditProps {
  infoText?: string;
  infoTextIconColor?: IconColors;
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
  infoTextIconColor = IconColors.RED,
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
              color={StyledButtonColors.STURDY_WHITE}
              width={StyledButtonWidths.FULL}
              caps
            />
          )}
          <StyledButton
            disabled={!isValid}
            label={isOptional ? translate('component/mail-edit', 'finish') : translate('component/mail-edit', 'save')}
            onClick={handleSubmit(saveUser)}
            isLoading={isUserUpdating}
            width={StyledButtonWidths.FULL}
            caps
          />
        </StyledHorizontalStack>
      </StyledVerticalStack>
    </Form>
  );
}

function InfoTextElement({ text, iconColor }: { text: string; iconColor: IconColors }): JSX.Element {
  return <StyledInfoText iconColor={iconColor}>{text}</StyledInfoText>;
}
