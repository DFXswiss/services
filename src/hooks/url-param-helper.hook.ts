import { Utils, useApiSession, useSessionContext } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useBalanceContext } from '../contexts/balance.context';
import { useQuery } from './query.hook';

interface UrlParamHelperInterface {
  readParamsAndReload: () => Promise<void>;
}

export function useUrlParamHelper(): UrlParamHelperInterface {
  const { updateSession } = useApiSession();
  const { login, signUp, logout } = useSessionContext();
  const { setRedirectUri } = useAppHandlingContext();
  const { readBalances } = useBalanceContext();
  const { address, signature, walletId, session, redirectUri, balances, reloadWithoutBlockedParams } = useQuery();

  async function readParamsAndReload() {
    // session
    if (address && signature) {
      const session = await createSession(address, signature, walletId ? +walletId : undefined);

      !session && logout();
    } else if (session && Utils.isJwt(session)) {
      updateSession(session);
    }

    if (redirectUri) {
      setRedirectUri(redirectUri);
    }

    if (balances) {
      readBalances(balances);
    }

    reloadWithoutBlockedParams();
  }

  async function createSession(address: string, signature: string, walletId?: number): Promise<string | undefined> {
    try {
      return (await login(address, signature)) ?? (await signUp(address, signature, walletId));
    } catch {}
  }

  return useMemo(() => ({ readParamsAndReload }), []);
}
