import { Utils, useApiSession } from '@dfx.swiss/react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useBalanceContext } from '../contexts/balance.context';
import { useQuery } from './query.hook';
import { useMemo } from 'react';

interface UrlParamHelperInterface {
  readParamsAndReload: () => Promise<void>;
}

export function useUrlParamHelper(): UrlParamHelperInterface {
  const { updateSession, deleteSession, createSession } = useApiSession();
  const { setRedirectUri } = useAppHandlingContext();
  const { readBalances } = useBalanceContext();
  const { address, signature, session, redirectUri, balances, reloadWithoutBlockedParams } = useQuery();

  async function readParamsAndReload() {
    if (address && signature) {
      const session = await createSession(address, signature, false).catch(() => undefined);
      session ? updateSession(session) : deleteSession();
    }
    if (session && Utils.isJwt(session)) {
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

  return useMemo(() => ({ readParamsAndReload }), []);
}
