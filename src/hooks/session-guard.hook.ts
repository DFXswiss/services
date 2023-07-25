import { useSessionContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { usePath } from './path.hook';

function useSessionGuard(redirectPath = '/') {
  const { isInitialized, isLoggedIn } = useSessionContext();
  const { navigate } = usePath();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) navigate(redirectPath);
  }, [isInitialized, isLoggedIn]);
}

export default useSessionGuard;
