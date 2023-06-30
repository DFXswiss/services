import { Utils, useApiSession } from '@dfx.swiss/react';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useBalanceContext } from '../contexts/balance.context';
import { useQuery } from './query.hook';

interface UrlParamHelperInterface {
  readParamsAndReload: () => void;
}

export function useUrlParamHelper(): UrlParamHelperInterface {
  const { updateSession } = useApiSession();
  const { setRedirectUri } = useAppHandlingContext();
  const { readBalances } = useBalanceContext();
  const { session, redirectUri, balances, reloadWithoutBlockedParams } = useQuery();

  function readParamsAndReload() {
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

  return { readParamsAndReload };
}
