import { ApiError, useApi, User, useSessionContext, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { Layout } from '../components/layout';

export default function ErrorScreen(): JSX.Element {
  useUserGuard('/login');

  const { call } = useApi();
  const { navigate } = useNavigation();
  const { user, isUserLoading } = useUserContext();
  const { isLoggedIn } = useSessionContext();
  const { setSession } = useWalletContext();

  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!isUserLoading && user && isLoggedIn) {
      createAccountIfRequired(user)
        .then(() => navigate('/account'))
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
    }
  }, [isUserLoading, user, isLoggedIn]);

  async function createAccountIfRequired(user: User): Promise<void> {
    if (!user.addresses.some((a) => a.isCustody)) {
      return call<{ accessToken: string }>({
        url: 'custody',
        method: 'POST',
        data: {
          addressType: 'EVM',
        },
      }).then(({ accessToken }) => setSession(accessToken));
    }
  }

  return (
    <Layout>
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      )}
    </Layout>
  );
}
