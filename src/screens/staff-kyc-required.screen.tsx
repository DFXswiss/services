import { useAuthContext, UserRole } from '@dfx.swiss/react';
import {
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { useNavigation } from '../hooks/navigation.hook';

// Shown when a staff endpoint answers 403 { code: 'STAFF_KYC_REQUIRED' }: the role is fine, but the
// account behind it has not completed an identification. Without this the caller only sees a bare
// "Forbidden resource" and has no way to tell that their own KYC is what unblocks it. `useGuardedApi`
// routes here, and every staff data hook and screen obtains its `call` from there, so a blocked screen
// lands on this explanation rather than on a raw error. Individual SDK calls that bypass that hook
// (e.g. useKyc().getFile in the compliance screens) still surface the error inline.
export default function StaffKycRequiredScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { start } = useKycHelper();
  const { navigate } = useNavigation();
  const { setRedirectPath } = useAppHandlingContext();
  const { session } = useAuthContext();

  // The API refuses self-service KYC for Compliance-role accounts ('KYC not allowed for compliance
  // accounts'), so for them the start button below is a guaranteed dead end in a raw error. The rule
  // itself lives in the API; the JWT role is only used to render the instruction that matches the
  // API's answer: such accounts are cleared by an operator, not by running an identification.
  const canStartKyc = session?.role !== UserRole.COMPLIANCE;

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
        {canStartKyc
          ? translate(
              'screens/kyc',
              'Complete the identification to restore access. This is the same process customers go through and only has to be done once.',
            )
          : translate(
              'screens/kyc',
              'On a Compliance account the identification cannot be started here. Please contact your administrator to have your account cleared - access is restored shortly afterwards.',
            )}
      </StyledInfoText>

      <StyledVerticalStack gap={3} full>
        {canStartKyc && (
          <StyledButton width={StyledButtonWidth.FULL} label={translate('screens/kyc', 'Start KYC')} onClick={start} />
        )}
        <StyledButton
          width={StyledButtonWidth.FULL}
          color={StyledButtonColor.GRAY_OUTLINE}
          label={translate('general/actions', 'Back')}
          // Not goBack(): it would navigate to the stored redirect path, and the screen the caller came
          // from is still blocked — they would land right back here. The account page is reachable
          // without staff clearance. The stored path is cleared explicitly because goBack(), the only
          // other place that does it, is no longer involved; leaving it set would misdirect a later
          // consumer of that single slot.
          onClick={() => {
            setRedirectPath(undefined);
            navigate('/account');
          }}
        />
      </StyledVerticalStack>
    </StyledVerticalStack>
  );
}
