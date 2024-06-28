import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledHorizontalStack } from '@dfx.swiss/react-components';
import { Trans } from 'react-i18next';
import { useSettingsContext } from '../../contexts/settings.context';

interface AddressDeleteProps {
  address: string;
  onClose: (confirm: boolean) => void;
}

export function AddressDelete({ address, onClose }: AddressDeleteProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">
        <Trans i18nKey="screens/home.delete" values={{ address }}>
          Are you sure you want to delete the address <strong>{address}</strong> from your DFX account? This action is
          irreversible.
        </Trans>
      </p>
      <StyledHorizontalStack>
        <StyledButton
          color={StyledButtonColor.STURDY_WHITE}
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Cancel')}
          onClick={() => onClose(false)}
        />
        <StyledButton
          width={StyledButtonWidth.MIN}
          label={translate('general/actions', 'Delete')}
          onClick={() => onClose(true)}
        />
      </StyledHorizontalStack>
    </>
  );
}
