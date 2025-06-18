import { ApiError, useApi } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
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

  useLayoutOptions({});

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
          navigate({ pathname: `/error`, search: `?msg=${error.message}` });
        })
        .finally(() => {
          urlParams.delete('otp');
          setUrlParams(urlParams);
        });
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <StyledVerticalStack gap={6} full center>
      <StyledLoadingSpinner size={SpinnerSize.LG} />
      <p className="text-dfxGray-700">{translate('screens/home', 'Logging in...')} </p>
    </StyledVerticalStack>
  );
}
