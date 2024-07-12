import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledHorizontalStack } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';

interface WarningProps {
  text: string;
  onClose: (confirm: boolean) => void;
}

export function Warning({ text, onClose }: WarningProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">{text}</p>
      <StyledHorizontalStack>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Back')}
          onClick={() => onClose(false)}
        />
        <StyledButton
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Proceed')}
          onClick={() => onClose(true)}
        />
      </StyledHorizontalStack>
    </>
  );
}
