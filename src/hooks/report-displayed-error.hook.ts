import { useUserContext } from '@dfx.swiss/react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { reportClientError } from 'src/util/client-error';

export function useReportDisplayedError(message: string | undefined): void {
  const { pathname } = useLocation();
  const { user } = useUserContext();
  const accountIdRef = useRef(user?.accountId);
  accountIdRef.current = user?.accountId;

  useEffect(() => {
    if (!message) return;

    reportClientError(Object.assign(new Error(message), { name: 'HandledError' }), pathname, accountIdRef.current);
  }, [message, pathname]);
}
