import { useUserContext } from '@dfx.swiss/react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { reportClientError } from 'src/util/client-error';

export function useReportDisplayedError(message: string | undefined): void {
  const { pathname } = useLocation();
  const { user } = useUserContext();

  useEffect(() => {
    if (!message) return;

    reportClientError(Object.assign(new Error(message), { name: 'HandledError' }), pathname, user?.accountId);
  }, [message, pathname, user?.accountId]);
}
