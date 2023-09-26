import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useNavigation } from './navigation.hook';

export function useSessionGuard(redirectPath = '/') {
  const { isLoggedIn } = useSessionContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();
  const { pathname } = useLocation();
  const { setRedirectPath } = useAppHandlingContext();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      setRedirectPath(pathname);
      navigate(redirectPath);
    }
  }, [isInitialized, isLoggedIn, navigate]);
}

export function useKycDataGuard(redirectPath = '/') {
  const { isInitialized } = useWalletContext();
  const { user, isUserLoading } = useUserContext();
  const { navigate } = useNavigation();
  const { pathname } = useLocation();
  const { setRedirectPath } = useAppHandlingContext();

  useEffect(() => {
    if (user && !isUserLoading && !user.kycDataComplete && isInitialized) {
      setRedirectPath(pathname);
      navigate(redirectPath);
    }
  }, [isInitialized, user, isUserLoading, navigate]);
}
