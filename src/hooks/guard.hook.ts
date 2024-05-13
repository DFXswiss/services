import { useAuthContext, useSessionContext, useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useWalletContext } from '../contexts/wallet.context';
import { useNavigation } from './navigation.hook';

export function useAddressGuard(redirectPath = '/', isActive = true) {
  useSessionGuard(true, redirectPath, isActive);
}

export function useUserGuard(redirectPath = '/', isActive = true) {
  useSessionGuard(false, redirectPath, isActive);
}

function useSessionGuard(requireActiveAddress: boolean, redirectPath: string, isActive: boolean) {
  const { isLoggedIn } = useSessionContext();
  const { session } = useAuthContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (isActive && isInitialized && (!isLoggedIn || (requireActiveAddress && !session?.address))) {
      navigate(redirectPath, { setRedirect: true });
    }
  }, [isInitialized, isLoggedIn, navigate, isActive]);
}

export function useKycLevelGuard(minLevel: number, redirectPath = '/') {
  const { isInitialized } = useWalletContext();
  const { user, isUserLoading } = useUserContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (user && !isUserLoading && isInitialized && user.kyc.level < minLevel) {
      navigate(redirectPath, { setRedirect: true });
    }
  }, [isInitialized, user, isUserLoading, navigate]);
}
