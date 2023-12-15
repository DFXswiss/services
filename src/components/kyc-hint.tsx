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

export function KycHint(): JSX.Element {
  const { translate } = useSettingsContext();
  const { start, limit } = useKycHelper();
  const { navigate } = useNavigation();
  const { user } = useUserContext();

  function onLink() {
    navigate('/link', { setRedirect: true });
  }

  return (
    <StyledVerticalStack gap={4} full center>
      <StyledInfoText invertedIcon>
        {translate(
          'screens/kyc',
          'Your account needs to get verified once your daily transaction volume exceeds {{limit}}. If you want to increase your daily trading limit, please complete our KYC (Know-Your-Customer) process.',
          { limit: limit ?? '' },
        )}
      </StyledInfoText>
      <StyledButton width={StyledButtonWidth.FULL} label={translate('screens/kyc', 'Complete KYC')} onClick={start} />
      {user?.kycLevel === 0 && (
        <StyledLink label={translate('screens/kyc', 'I am already verified with DFX')} onClick={onLink} dark />
      )}
    </StyledVerticalStack>
  );
}
