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

  const code = urlParams.get('code');

  useEffect(() => {
    if (code) {
      call<RedirectResponse>({
        url: `auth/mail/redirect?code=${code}`,
        method: 'GET',
      })
        .then(({ redirectUrl }) => {
          window.location.href = redirectUrl;
        })
        .catch((error: ApiError) => {
          navigate(`/error?msg=${error.message}`);
        });
    } else {
      navigate('/login');
    }

    if (urlParams.has('code')) {
      urlParams.delete('code');
      setUrlParams(urlParams);
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
