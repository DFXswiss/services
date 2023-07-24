import { Utils, useApiSession, useSessionContext } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useBalanceContext } from '../contexts/balance.context';
import { usePath } from './path.hook';

interface UrlParamHelperInterface {
  readParamsAndReload: () => Promise<void>;
}

export function useUrlParamHelper(): UrlParamHelperInterface {
  const { updateSession } = useApiSession();
  const { login, signUp, logout } = useSessionContext();
  const { setRedirectUri } = useAppHandlingContext();
  const { readBalances } = useBalanceContext();
  const { address, signature, wallet, session, redirectUri, balances, reloadWithoutBlockedParams } = usePath();

  async function readParamsAndReload() {
    // session
    if (address && signature) {
      const session = await createSession(address, signature, wallet);

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

  async function createSession(address: string, signature: string, wallet?: string): Promise<string | undefined> {
    try {
      return (await login(address, signature)) ?? (await signUp(address, signature, wallet));
    } catch {}
  }

  return useMemo(() => ({ readParamsAndReload }), []);
}
