import { useUserContext } from '@dfx.swiss/react';
import { IconColor, StyledInfoText } from '@dfx.swiss/react-components';
import { useAppParams } from 'src/hooks/app-params.hook';
import { useSettingsContext } from '../contexts/settings.context';

export function SanctionHint(): JSX.Element {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { accountNotVerifiedHint } = useAppParams();

  return user && user.kyc.level < 30 && accountNotVerifiedHint !== '' ? (
    <StyledInfoText iconColor={IconColor.BLUE}>
      {translate(
        'screens/kyc',
        accountNotVerifiedHint ??
          'Note: Your account is not verified. Your transaction will only be processed if you do not have the same name as a sanctioned or politically exposed person.',
      )}
    </StyledInfoText>
  ) : (
    <></>
  );
}
