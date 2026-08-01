import {
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { useNavigation } from '../hooks/navigation.hook';

// Shown when a staff endpoint answers 403 { code: 'STAFF_KYC_REQUIRED' }: the role is fine, but the
// account behind it has not completed an identification. Without this the caller only sees a bare
// "Forbidden resource" and has no way to tell that their own KYC is what unblocks it. `useGuardedApi`
// routes here from every staff hook, so this covers all staff screens rather than one dashboard.
export default function StaffKycRequiredScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { start } = useKycHelper();
  const { goBack } = useNavigation();

  useLayoutOptions({ title: translate('screens/kyc', 'Identification required') });

  return (
    <StyledVerticalStack gap={6} full center>
      <StyledInfoText invertedIcon>
        {translate(
          'screens/kyc',
          'Access to internal tools now requires an identified person behind the account. Your role is unchanged — what is missing is your identification.',
        )}
      </StyledInfoText>

      <StyledInfoText invertedIcon>
        {translate(
          'screens/kyc',
          'Complete the identification to restore access. This is the same process customers go through and only has to be done once.',
        )}
      </StyledInfoText>

      <StyledVerticalStack gap={3} full>
        <StyledButton width={StyledButtonWidth.FULL} label={translate('screens/kyc', 'Start KYC')} onClick={start} />
        <StyledButton
          width={StyledButtonWidth.FULL}
          color={StyledButtonColor.GRAY_OUTLINE}
          label={translate('general/actions', 'Back')}
          onClick={goBack}
        />
      </StyledVerticalStack>
    </StyledVerticalStack>
  );
}
