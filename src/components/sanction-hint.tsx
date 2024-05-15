import { useUserContext } from '@dfx.swiss/react';
import { IconColor, StyledInfoText } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';

export function SanctionHint(): JSX.Element {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();

  return user && user.kyc.level < 30 ? (
    <StyledInfoText iconColor={IconColor.BLUE}>
      {translate(
        'screens/kyc',
        'Note: Your account is not verified. Your transaction will only be processed if you do not have the same name as a sanctioned or politically exposed person.',
      )}
    </StyledInfoText>
  ) : (
    <></>
  );
}
