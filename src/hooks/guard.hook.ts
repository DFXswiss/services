import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useParamContext } from '../contexts/param.context';
import { useNavigation } from './navigation.hook';

export function useSessionGuard(redirectPath = '/') {
  const { isInitialized: sessionInitialized, isLoggedIn } = useSessionContext();
  const { isInitialized: paramsInitialized } = useParamContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (sessionInitialized && paramsInitialized && !isLoggedIn) navigate(redirectPath);
  }, [sessionInitialized, paramsInitialized, isLoggedIn, navigate]);
}

export function useKycDataGuard(redirectPath = '/') {
  const { user, isUserLoading } = useUserContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (user && !isUserLoading && !user.kycDataComplete) navigate(redirectPath);
  }, [user, isUserLoading, navigate]);
}
