import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface QueryInterface {
  address?: string;
  signature?: string;
  wallet?: string;
  session?: string;
  redirectUri?: string;
  blockchain?: string;
  balances?: string;
  assetId?: string;
  currencyId?: string;
  amount?: string;
  reloadWithoutBlockedParams: () => void;
}

export function useQuery(): QueryInterface {
  const navigate = useNavigate();
  const { search, pathname } = useLocation();

  const blockedParams = ['address', 'signature', 'wallet', 'session', 'blockchain', 'redirect-uri', 'balances'];

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
    address: getParameter('address'),
    signature: getParameter('signature'),
    wallet: getParameter('wallet'),
    session: getParameter('session'),
    redirectUri: getParameter('redirect-uri'),
    blockchain: getParameter('blockchain'),
    balances: getParameter('balances'),
    assetId: getParameter('assetId'),
    currencyId: getParameter('currencyId'),
    amount: getParameter('amount'),
    reloadWithoutBlockedParams,
  };
}
