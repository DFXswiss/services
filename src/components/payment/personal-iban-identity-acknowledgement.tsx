import {
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';

interface PersonalIbanIdentityAcknowledgementProps {
  onConfirm: () => void;
  onDecline: () => void;
}

export function PersonalIbanIdentityAcknowledgement({
  onConfirm,
  onDecline,
}: PersonalIbanIdentityAcknowledgementProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack center className="text-center" gap={4}>
      <StyledInfoText invertedIcon>
        {translate(
          'screens/payment',
          'A personal IBAN was requested for a different signed-in customer. Do you want to use it for your account?',
        )}
      </StyledInfoText>
      <StyledButton
        width={StyledButtonWidth.FULL}
        label={translate('screens/payment', 'Use requested personal IBAN')}
        onClick={onConfirm}
        color={StyledButtonColor.STURDY_WHITE}
      />
      <StyledButton
        width={StyledButtonWidth.FULL}
        label={translate('screens/payment', 'Continue without personal IBAN')}
        onClick={onDecline}
      />
    </StyledVerticalStack>
  );
}
