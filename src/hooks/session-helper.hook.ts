import { useApiSession } from '../api/hooks/api-session.hook';
import { Utils } from '../utils';
import { useQuery } from './query.hook';

interface SessionHelperInterface {
  updateIfAvailable: () => void;
}

export function useSessionHelper(): SessionHelperInterface {
  const { updateSession } = useApiSession();
  const { session } = useQuery();

  function updateIfAvailable() {
    if (session && Utils.isJwt(session)) {
      updateSession(session);
    }
  }

  return { updateIfAvailable };
}
