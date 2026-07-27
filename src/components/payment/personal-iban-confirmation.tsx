import {
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';

interface PersonalIbanConfirmationProps {
  onConfirm: () => void;
  onDecline: () => void;
}

export function PersonalIbanConfirmationPrompt({
  onConfirm,
  onDecline,
}: PersonalIbanConfirmationProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack center className="text-center" gap={4}>
      <StyledInfoText invertedIcon>
        {translate(
          'screens/payment',
          'Bank Frick will assign you a unique IBAN for transfers. The account behind it belongs to DFX AG. This cannot be undone. Do you want to request and use it?',
        )}
      </StyledInfoText>
      <StyledButton
        width={StyledButtonWidth.FULL}
        label={translate('screens/payment', 'Request and use personal IBAN')}
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
