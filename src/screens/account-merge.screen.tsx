import { ApiError, useApi, useAuthContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';

interface MergeRedirect {
  kycHash: string;
  accessToken?: string;
}

export default function AccountMerge() {
  const { translate } = useSettingsContext();
  const { setAuthenticationToken } = useAuthContext();
  const { navigate } = useNavigation();
  const { call } = useApi();

  const [urlParams, setUrlParams] = useSearchParams();

  const otp = urlParams.get('otp');

  useEffect(() => {
    if (otp) {
      call<MergeRedirect>({
        url: `auth/mail/confirm?code=${otp}`,
        method: 'GET',
      })
        .then(({ kycHash, accessToken }: MergeRedirect) => {
          setAuthenticationToken(accessToken);
          navigate(`/kyc?code=${kycHash}`);
        })
        .catch((error: ApiError) => {
          navigate(`/error?msg=${error.message}`);
        });
    } else {
      navigate('/kyc');
    }

    if (urlParams.has('otp')) {
      urlParams.delete('otp');
      setUrlParams(urlParams);
    }
  }, []);

  return (
    <Layout>
      <StyledVerticalStack gap={6} full center>
        <StyledLoadingSpinner size={SpinnerSize.LG} />
        <p className="text-dfxGray-700">{translate('screens/kyc', 'Merging your accounts...')} </p>
      </StyledVerticalStack>
    </Layout>
  );
}
