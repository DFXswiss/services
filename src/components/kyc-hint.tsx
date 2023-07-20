import { StyledButton, StyledButtonWidth, StyledInfoText, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useLanguageContext } from '../contexts/language.context';
import { useKycHelper } from '../hooks/kyc-helper.hook';

export function KycHint(): JSX.Element {
  const { translate } = useLanguageContext();
  const { start, limit } = useKycHelper();
  
  return (
    <StyledVerticalStack gap={4} marginY={4}>
      <StyledInfoText invertedIcon>
        {translate(
          'screens/kyc',
          'Your account needs to get verified once your daily transaction volume exceeds {{limit}}. If you want to increase your daily trading limit, please complete our KYC (Know-Your-Customer) process.',
          { limit },
        )}
      </StyledInfoText>
      <StyledButton width={StyledButtonWidth.FULL} label={translate('screens/kyc', 'Complete KYC')} onClick={start} />
    </StyledVerticalStack>
  );
}
