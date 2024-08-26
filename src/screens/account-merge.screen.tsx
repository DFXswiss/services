import { ApiError, useApi, useAuthContext } from '@dfx.swiss/react';
import {
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledHorizontalStack,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';

interface MergeRedirect {
  redirectUrl: string;
  accessToken: string;
}

export default function AccountMerge() {
  const { translate } = useSettingsContext();
  const { setAuthenticationToken } = useAuthContext();
  const { navigate } = useNavigation();
  const { call } = useApi();

  const [urlParams, setUrlParams] = useSearchParams();
  const [error, setError] = useState<string>();

  const mergeCode = urlParams.get('merge-code');

  useEffect(() => {
    if (mergeCode) {
      call<MergeRedirect>({
        url: `auth/mail/confirm?code=${mergeCode}`,
        method: 'GET',
      })
        .then(({ redirectUrl, accessToken }: MergeRedirect) => {
          setAuthenticationToken(accessToken);
          return redirectUrl;
        })
        .then((redirectUrl: string) => {
          navigate(redirectUrl.replace(window.location.origin, ''));
        })
        .catch((error: ApiError) => {
          // error "Merge request is already completed
          if (error.statusCode === 409) {
            navigate('/kyc');
            return;
          }
          setError(error.message ?? 'Unknown error');
        });
    }

    if (urlParams.has('merge-code')) {
      urlParams.delete('merge-code');
      setUrlParams(urlParams);
    }
  }, []);

  return (
    <Layout>
      {error ? (
        <StyledVerticalStack center gap={5} marginY={5}>
          <div>
            <h2 className="text-dfxBlue-800">{translate('screens/error', 'Oh, sorry something went wrong')}</h2>
            <p className="text-dfxGray-700">{error}</p>
          </div>

          <StyledHorizontalStack gap={4}>
            <StyledButton
              icon={IconVariant.HELP}
              label={translate('navigation/links', 'Support')}
              color={StyledButtonColor.GRAY_OUTLINE}
              onClick={() => navigate('/support')}
            />
            <StyledButton label={translate('general/actions', 'Back')} onClick={() => navigate('/kyc')} />
          </StyledHorizontalStack>
        </StyledVerticalStack>
      ) : (
        <StyledVerticalStack gap={6} full center>
          <StyledLoadingSpinner size={SpinnerSize.LG} />
          <p className="text-dfxGray-700">{translate('screens/kyc', 'Merging your accounts...')} </p>
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
