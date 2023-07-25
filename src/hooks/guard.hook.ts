import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { usePath } from './path.hook';

export function useSessionGuard(redirectPath = '/') {
  const { isInitialized, isLoggedIn } = useSessionContext();
  const { navigate } = usePath();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) navigate(redirectPath);
  }, [isInitialized, isLoggedIn, navigate]);
}

export function useKycDataGuard(redirectPath = '/') {
  const { user } = useUserContext();
  const { navigate } = usePath();

  useEffect(() => {
    if (user && !user.kycDataComplete) navigate(redirectPath);
  }, [user, navigate]);
}
