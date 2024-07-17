import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledHorizontalStack } from '@dfx.swiss/react-components';
import { Trans } from 'react-i18next';
import { useSettingsContext } from '../../contexts/settings.context';

export enum DeleteOverlayType {
  NONE,
  ADDRESS,
  ACCOUNT,
}

interface AddressDeleteProps {
  type: DeleteOverlayType;
  onClose: (confirm: boolean) => void;
  address?: string;
}

export function DeleteOverlay({ type, onClose, address }: AddressDeleteProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <p className="text-dfxBlue-800 mb-2">
        {type === DeleteOverlayType.ADDRESS ? (
          <Trans i18nKey="screens/settings.delete" values={{ address }}>
            Are you sure you want to delete the address <strong>{address}</strong> from your DFX account? This action is
            irreversible.
          </Trans>
        ) : (
          translate(
            'screens/settings',
            'Deleting your account is irreversible. Your data will remain on our servers temporarily before permanent deletion. If you have any questions, please contact our support team.',
          )
        )}
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
