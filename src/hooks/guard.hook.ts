import { useAuthContext, useSessionContext, useUserContext } from '@dfx.swiss/react';
import { UserRole } from '@dfx.swiss/react/dist/definitions/jwt';
import { useEffect } from 'react';
import { useWalletContext } from '../contexts/wallet.context';
import { useNavigation } from './navigation.hook';

export function useAddressGuard(redirectPath = '/', isActive = true) {
  useSessionGuard(true, redirectPath, isActive);
}

export function useUserGuard(redirectPath = '/', isActive = true) {
  useSessionGuard(false, redirectPath, isActive);
}

export function useAdminGuard(redirectPath = '/', isActive = true) {
  useUserRoleGuard([UserRole.ADMIN], redirectPath, isActive);
}

export function useComplianceGuard(redirectPath = '/', isActive = true) {
  useUserRoleGuard([UserRole.ADMIN, UserRole.COMPLIANCE], redirectPath, isActive);
}

function useUserRoleGuard(requiresUserRoles: UserRole[], redirectPath = '/', isActive = true) {
  const { isLoggedIn } = useSessionContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();
  const { session } = useAuthContext();

  useEffect(() => {
    if (isActive && isInitialized && (!isLoggedIn || (session && !requiresUserRoles.includes(session.role)))) {
      navigate(redirectPath, { setRedirect: true });
    }
  }, [session, isLoggedIn, isInitialized, navigate, isActive]);
}

function useSessionGuard(requireActiveAddress: boolean, redirectPath: string, isActive: boolean) {
  const { isLoggedIn } = useSessionContext();
  const { session } = useAuthContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (isActive && isInitialized) {
      if (!isLoggedIn) {
        navigate(redirectPath, { setRedirect: true });
      } else if (isLoggedIn && requireActiveAddress && !session?.address) {
        navigate('/connect', { setRedirect: true });
      }
    }
  }, [session, isInitialized, isLoggedIn, navigate, isActive]);
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
