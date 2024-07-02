import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledHorizontalStack } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';

interface WarningProps {
  onClose: (confirm: boolean) => void;
}

export function Warning({ onClose }: WarningProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">
        {translate('screens/support', 'Please be cautious. We will never contact you first. Beware of scams.')}
      </p>
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
