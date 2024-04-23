import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledHorizontalStack } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';

export function AddressSwitch({ onClose }: { onClose: (confirm: boolean) => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">
        {translate('screens/buy', 'Are you sure you want to send to a different address?')}
      </p>
      <StyledHorizontalStack>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'No')}
          onClick={() => onClose(false)}
        />
        <StyledButton
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Yes')}
          onClick={() => onClose(true)}
        />
      </StyledHorizontalStack>
    </>
  );
}
