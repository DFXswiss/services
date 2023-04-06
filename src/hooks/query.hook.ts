import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface QueryInterface {
  session?: string;
  redirectUri?: string;
  blockchain?: string;
  assetId?: string;
  currencyId?: string;
  reloadWithoutBlockedParams: () => void;
}

export function useQuery(): QueryInterface {
  const navigate = useNavigate();
  const { search, pathname } = useLocation();

  const blockedParams = ['session', 'blockchain', 'redirect-uri'];

  const query = useMemo(() => new URLSearchParams(search), [search]);

  function getParameter(key: string): string | undefined {
    const value = query.get(key);
    return value !== null ? value : undefined;
  }

  function reloadWithoutBlockedParams() {
    if (blockedParams.map((param) => query.has(param)).every((b) => !b)) return;
    blockedParams.forEach((param) => query.delete(param));
    navigate(`${pathname}?${query.toString()}`);
  }

  return {
    session: getParameter('session'),
    redirectUri: getParameter('redirect-uri'),
    blockchain: getParameter('blockchain'),
    assetId: getParameter('assetId'),
    currencyId: getParameter('currencyId'),
    reloadWithoutBlockedParams,
  };
}
