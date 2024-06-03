import { KycStepName, KycStepType, TransactionError, TransactionType, useUserContext } from '@dfx.swiss/react';
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

export function KycHint({ type, error }: { type: TransactionType; error: TransactionError }): JSX.Element {
  const { translate } = useSettingsContext();
  const { start, startStep, limit, defaultLimit, limitToString, isComplete } = useKycHelper();
  const { navigate } = useNavigation();
  const { user } = useUserContext();

  function getHint(error: TransactionError): string | undefined {
    switch (error) {
      case TransactionError.LIMIT_EXCEEDED:
        return isComplete
          ? translate(
              'screens/kyc',
              'This transaction exceeds your trading limit of {{limit}}. If you would like to increase your limit, please submit a request using the button below.',
              {
                limit: limit ?? '',
              },
            )
          : translate(
              'screens/kyc',
              'Your account needs to get verified once your daily transaction volume exceeds {{limit}}. If you want to increase your daily trading limit, please complete our KYC (Know-Your-Customer) process.',
              { limit: limit ?? '' },
            );

      case TransactionError.KYC_REQUIRED:
        return translate(
          'screens/kyc',
          'This transaction is only possible with a verified account. Please complete our KYC (Know-Your-Customer) process.',
        );

      case TransactionError.KYC_DATA_REQUIRED:
        return '';

      case TransactionError.KYC_REQUIRED_INSTANT:
        return translate(
          'screens/kyc',
          'Instant bank transactions are only possible with a verified account. If you would like to use SEPA Instant, please complete our KYC (Know-Your-Customer) process.',
        );

      case TransactionError.BANK_TRANSACTION_MISSING:
        return translate(
          'screens/kyc',
          'A buy bank transaction or identification by video is required once {{volume}} exceeds {{limit}}.',
          {
            volume: translate(
              'screens/kyc',
              type === TransactionType.SELL
                ? 'your daily sell transaction volume'
                : type === TransactionType.SWAP
                ? 'your daily swap transaction volume'
                : 'your daily credit card transaction volume',
            ),
            limit: limitToString(defaultLimit),
          },
        );
    }
  }

  const hint = getHint(error);

  return hint != null ? (
    <StyledVerticalStack gap={4} full center>
      {hint && <StyledInfoText invertedIcon>{hint}</StyledInfoText>}

      {error === TransactionError.BANK_TRANSACTION_MISSING ? (
        <StyledButton
          width={StyledButtonWidth.FULL}
          label={translate('screens/kyc', 'Start video identification')}
          onClick={() => startStep(KycStepName.IDENT, KycStepType.VIDEO)}
        />
      ) : (
        <>
          <StyledButton
            width={StyledButtonWidth.FULL}
            label={translate(
              'screens/kyc',
              error === TransactionError.KYC_DATA_REQUIRED
                ? 'Enter user data'
                : isComplete
                ? 'Increase limit'
                : 'Complete KYC',
            )}
            onClick={
              error === TransactionError.KYC_DATA_REQUIRED
                ? () => navigate('/profile', { setRedirect: true })
                : isComplete
                ? () => navigate('/limit')
                : start
            }
          />
          {user?.kyc.level === 0 && (
            <StyledLink
              label={translate('screens/kyc', 'I am already verified with DFX')}
              onClick={() => navigate('/link', { setRedirect: true })}
              dark
            />
          )}
        </>
      )}
    </StyledVerticalStack>
  ) : (
    <></>
  );
}
