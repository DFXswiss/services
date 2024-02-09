import { useUserContext } from '@dfx.swiss/react';
import {
  StyledButton,
  StyledButtonWidth,
  StyledInfoText,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';

export enum KycReason {
  LIMIT_EXCEEDED = 'LimitExceeded',
  SEPA_INSTANT = 'SepaInstant',
}

export function KycHint({ reason }: { reason: KycReason }): JSX.Element {
  const { translate } = useSettingsContext();
  const { start, limit } = useKycHelper();
  const { navigate } = useNavigation();
  const { user } = useUserContext();

  function onLink() {
    navigate('/link', { setRedirect: true });
  }

  const hint =
    reason === KycReason.LIMIT_EXCEEDED
      ? translate(
          'screens/kyc',
          'Your account needs to get verified once your daily transaction volume exceeds {{limit}}. If you want to increase your daily trading limit, please complete our KYC (Know-Your-Customer) process.',
          { limit: limit ?? '' },
        )
      : translate(
          'screens/kyc',
          'Instant bank transactions are only possible with a verified account. If you would like to use SEPA Instant, please complete our KYC (Know-Your-Customer) process.',
        );

  return (
    <StyledVerticalStack gap={4} full center>
      <StyledInfoText invertedIcon>{hint}</StyledInfoText>
      <StyledButton width={StyledButtonWidth.FULL} label={translate('screens/kyc', 'Complete KYC')} onClick={start} />
      {user?.kycLevel === 0 && (
        <StyledLink label={translate('screens/kyc', 'I am already verified with DFX')} onClick={onLink} dark />
      )}
    </StyledVerticalStack>
  );
}
