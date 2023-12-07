import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useWalletContext } from '../contexts/wallet.context';
import { useNavigation } from './navigation.hook';

export function useSessionGuard(redirectPath = '/', isActive = true) {
  const { isLoggedIn } = useSessionContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (isInitialized && !isLoggedIn && isActive) {
      navigate(redirectPath, { setRedirect: true });
    }
  }, [isInitialized, isLoggedIn, navigate, isActive]);
}

export function useKycLevelGuard(minLevel: number, redirectPath = '/') {
  const { isInitialized } = useWalletContext();
  const { user, isUserLoading } = useUserContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (user && !isUserLoading && isInitialized && user.kycLevel < minLevel) {
      navigate(redirectPath, { setRedirect: true });
    }
  }, [isInitialized, user, isUserLoading, navigate]);
}
