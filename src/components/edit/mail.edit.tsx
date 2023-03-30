import { useForm } from 'react-hook-form';
import { useUserContext } from '../../api/contexts/user.context';
import { IconColors } from '../../stories/DfxIcon';
import Form from '../../stories/form/Form';
import StyledInput from '../../stories/form/StyledInput';
import StyledHorizontalStack from '../../stories/layout-helpers/StyledHorizontalStack';
import StyledVerticalStack from '../../stories/layout-helpers/StyledVerticalStack';
import StyledButton, { StyledButtonColors, StyledButtonWidths } from '../../stories/StyledButton';
import StyledInfoText from '../../stories/StyledInfoText';
import { Utils } from '../../utils';
import Validations from '../../validations';

interface MailEditProps {
  infoText?: string;
  infoTextIconColor?: IconColors;
  infoTextPlacement?: MailEditInfoTextPlacement;
  showCancelButton?: boolean;
  hideLabels?: boolean;
  isOptional?: boolean;
  onSubmit: () => void;
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

  async function saveUser({ email }: FormData): Promise<void> {
    if (!email || email.length === 0) return onSubmit();
    return changeMail(email).then(onSubmit);
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
          label="Contact information"
          placeholder="E-mail address"
          name="email"
          hideLabel={hideLabels}
          darkTheme
        />
        {infoText && infoTextPlacement === MailEditInfoTextPlacement.BELOW_INPUT && (
          <InfoTextElement text={infoText} iconColor={infoTextIconColor} />
        )}
        <StyledHorizontalStack gap={4}>
          {showCancelButton && onCancel && (
            <StyledButton
              label="cancel"
              onClick={onCancel}
              color={StyledButtonColors.PALE_WHITE}
              width={StyledButtonWidths.FULL}
              caps
            />
          )}
          <StyledButton
            disabled={!isValid}
            label={isOptional ? 'finish' : 'save'}
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
  return (
    <StyledInfoText darkTheme iconColor={iconColor}>
      {text}
    </StyledInfoText>
  );
}
