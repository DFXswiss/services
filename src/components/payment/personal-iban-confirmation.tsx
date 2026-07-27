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
  hasStorageWarning: boolean;
}

const STORAGE_WARNING =
  'Your browser could not reliably read or save this choice. You will be asked again after a reload.';

export function PersonalIbanStorageWarning(): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledInfoText invertedIcon>
      {translate('screens/payment', STORAGE_WARNING)}
    </StyledInfoText>
  );
}

export function PersonalIbanConfirmationPrompt({
  onConfirm,
  onDecline,
  hasStorageWarning,
}: PersonalIbanConfirmationProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack center className="text-center" gap={4}>
      <StyledInfoText invertedIcon>
        {translate(
          'screens/payment',
          'A personal IBAN is a real, non-revocable account opened for you at a bank. Please confirm whether you want to request and use it.',
        )}
      </StyledInfoText>
      {hasStorageWarning && <PersonalIbanStorageWarning />}
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
