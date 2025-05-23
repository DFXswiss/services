import { ApiError, useApi } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';

interface RedirectResponse {
  redirectUrl: string;
}

export default function MailLoginScreen() {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { call } = useApi();

  const [urlParams, setUrlParams] = useSearchParams();

  const otp = urlParams.get('otp');

  useEffect(() => {
    if (otp) {
      call<RedirectResponse>({
        url: `auth/mail/redirect?code=${otp}`,
        method: 'GET',
      })
        .then(({ redirectUrl }) => {
          window.location.href = redirectUrl;
        })
        .catch((error: ApiError) => {
          urlParams.delete('otp');
          setUrlParams(urlParams);
          navigate({ pathname: `/error`, search: `?msg=${error.message}` });
        });
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <Layout>
      <StyledVerticalStack gap={6} full center>
        <StyledLoadingSpinner size={SpinnerSize.LG} />
        <p className="text-dfxGray-700">{translate('screens/home', 'Logging in...')} </p>
      </StyledVerticalStack>
    </Layout>
  );
}
