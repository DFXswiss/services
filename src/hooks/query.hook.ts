import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface QueryInterface {
  session?: string;
  assetId?: string;
  currencyId?: string;
}

export function useQuery(): QueryInterface {
  const { search } = useLocation();

  const query = useMemo(() => new URLSearchParams(search), [search]);

  function getParameter(key: string): string | undefined {
    const value = query.get(key);
    return value !== null ? value : undefined;
  }

  return { session: getParameter('session'), assetId: getParameter('assetId'), currencyId: getParameter('currencyId') };
}
