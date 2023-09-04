import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWalletContext } from '../contexts/wallet.context';
import { useNavigation } from './navigation.hook';

export function useSessionGuard(redirectPath = '/') {
  const { isLoggedIn } = useSessionContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();
  const { pathname } = useLocation();

  useEffect(() => {
    if (isInitialized && !isLoggedIn)
      navigate({ pathname: redirectPath, search: `?${new URLSearchParams({ 'redirect-path': pathname })}` });
  }, [isInitialized, isLoggedIn, navigate]);
}

export function useKycDataGuard(redirectPath = '/') {
  const { user, isUserLoading } = useUserContext();
  const { navigate } = useNavigation();
  const { pathname } = useLocation();

  useEffect(() => {
    if (user && !isUserLoading && !user.kycDataComplete)
      navigate({ pathname: redirectPath, search: `?${new URLSearchParams({ 'redirect-path': pathname })}` });
  }, [user, isUserLoading, navigate]);
}
