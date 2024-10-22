import { ApiError, useApi, useAuthContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledButton, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
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
  const [kycHash, setKycHash] = useState<string>();

  const otp = urlParams.get('otp');

  useEffect(() => {
    if (otp) {
      urlParams.delete('otp');
      setUrlParams(urlParams);

      call<MergeRedirect>({
        url: `auth/mail/confirm?code=${otp}`,
        method: 'GET',
      })
        .then(({ kycHash, accessToken }: MergeRedirect) => {
          setAuthenticationToken(accessToken);
          setKycHash(kycHash);
        })
        .catch((error: ApiError) => {
          const errorMessage =
            error.statusCode === 400
              ? translate('screens/error', 'Invalid link')
              : error.statusCode === 409
              ? translate('screens/error', 'Merge is already completed')
              : error.message;

          navigate({ pathname: '/error', search: `msg=${errorMessage}` });
        });
    } else {
      navigate('/kyc');
    }
  }, []);

  return (
    <Layout>
      <StyledVerticalStack center gap={5} marginY={5}>
        {kycHash ? (
          <>
            <div>
              <h2 className="text-dfxBlue-800">{translate('screens/error', 'Account merged successfully ')}</h2>
              <p className="text-dfxGray-700">
                {translate('screens/error', 'You can now navigate to your account screen.')}
              </p>
            </div>

            <StyledButton
              label={translate('screens/kyc', 'My account')}
              onClick={() => navigate(`/account?code=${kycHash}`)}
            />
          </>
        ) : (
          <>
            <StyledLoadingSpinner size={SpinnerSize.LG} />
            <p className="text-dfxGray-700">{translate('screens/kyc', 'Merging your accounts...')} </p>
          </>
        )}
      </StyledVerticalStack>
    </Layout>
  );
}
