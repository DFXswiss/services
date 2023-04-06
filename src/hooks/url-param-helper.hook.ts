import { useApiSession } from '../api/hooks/api-session.hook';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { Utils } from '../utils';
import { useQuery } from './query.hook';

interface UrlParamHelperInterface {
  readParamsAndReload: () => void;
}

export function useUrlParamHelper(): UrlParamHelperInterface {
  const { updateSession } = useApiSession();
  const { setRedirectUri } = useAppHandlingContext();
  const { session, redirectUri, reloadWithoutBlockedParams } = useQuery();

  function readParamsAndReload() {
    if (session && Utils.isJwt(session)) {
      updateSession(session);
    }
    if (redirectUri) {
      setRedirectUri(redirectUri);
    }
    reloadWithoutBlockedParams();
  }

  return { readParamsAndReload };
}
