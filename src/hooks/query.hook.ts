import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface QueryInterface {
  session?: string;
  assetId?: string;
  currencyId?: string;
  reloadWithoutSession: () => void;
}

export function useQuery(): QueryInterface {
  const navigate = useNavigate();
  const { search, pathname } = useLocation();

  const query = useMemo(() => new URLSearchParams(search), [search]);

  function getParameter(key: string): string | undefined {
    const value = query.get(key);
    return value !== null ? value : undefined;
  }

  function reloadWithoutSession() {
    query.delete('session');
    navigate(`${pathname}?${query.toString()}`);
  }

  return {
    session: getParameter('session'),
    assetId: getParameter('assetId'),
    currencyId: getParameter('currencyId'),
    reloadWithoutSession,
  };
}
