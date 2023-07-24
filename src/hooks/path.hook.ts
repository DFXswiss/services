import { useMemo } from 'react';
import { NavigateFunction, NavigateOptions, To, useLocation, useNavigate } from 'react-router-dom';

interface PathInterface {
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
  navigate: NavigateFunction;
}

export function usePath(): PathInterface {
  const navigateTo = useNavigate();
  const { search, pathname } = useLocation();

  const blockedParams = ['address', 'signature', 'wallet', 'session', 'redirect-uri', 'balances'];

  const query = useMemo(() => new URLSearchParams(search), [search]);

  function getParameter(key: string): string | undefined {
    return query.get(key) ?? undefined;
  }

  function reloadWithoutBlockedParams() {
    if (blockedParams.map((param) => query.has(param)).every((b) => !b)) return;
    blockedParams.forEach((param) => query.delete(param));

    navigate(pathname);
  }

  function navigate(to: To | number, options?: NavigateOptions) {
    typeof to === 'number' ? navigateTo(to) : navigateTo(`${to}?${query.toString()}`, options);
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
    navigate,
  };
}
