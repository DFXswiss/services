import { Utils, useApiSession, useSessionContext } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAppHandlingContext } from './app-handling.context';
import { useBalanceContext } from './balance.context';

const urlParams = [
  'address',
  'signature',
  'wallet',
  'session',
  'redirect-uri',
  'blockchain',
  'balances',
  'amount-in',
  'amount-out',
  'assets',
  'asset-in',
  'asset-out',
  'bank-account',
];

export interface AppParams {
  address?: string;
  signature?: string;
  wallet?: string;
  session?: string;
  redirectUri?: string;
  blockchain?: string;
  balances?: string;
  amountIn?: string;
  amountOut?: string;
  assets?: string;
  assetIn?: string;
  assetOut?: string;
  bankAccount?: string;
}

interface ParamContextInterface extends AppParams {
  isInitialized: boolean;
  setParams: (params: Partial<AppParams>) => void;
}

interface ParamContextProps extends PropsWithChildren {
  params?: AppParams;
  router: Router;
}

const ParamContext = createContext<ParamContextInterface>(undefined as any);

export function useParamContext(): ParamContextInterface {
  return useContext(ParamContext);
}

export function ParamContextProvider(props: ParamContextProps): JSX.Element {
  const { updateSession } = useApiSession();
  const { login, signUp, logout } = useSessionContext();
  const { setRedirectUri } = useAppHandlingContext();
  const { readBalances } = useBalanceContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [params, setParams] = useState<AppParams>({});

  const search = (window as Window).location.search;
  const query = new URLSearchParams(search);

  useEffect(() => {
    init();
  }, []);

  function getParameter(query: URLSearchParams, key: string): string | undefined {
    return query.get(key) ?? undefined;
  }

  function setParameters(params: Partial<AppParams>) {
    setParams((p) => ({ ...p, ...params }));
  }

  function reloadWithoutBlockedParams(query: URLSearchParams) {
    if (urlParams.map((param) => query.has(param)).every((b) => !b)) return;
    urlParams.forEach((param) => query.delete(param));

    const { location } = window;
    props.router.navigate({ pathname: `${location.origin}${location.pathname}`, search: `?${query}` });
  }

  async function init() {
    const params = props.params ?? extractUrlParams();

    setParams(params);

    // session
    const hasSession = (params.address && params.signature) || params.session;
    if (params.address && params.signature) {
      const session = await createSession(params.address, params.signature, params.wallet);

      !session && logout();
    } else if (params.session && Utils.isJwt(params.session)) {
      updateSession(params.session);
    }

    if (params.redirectUri) {
      setRedirectUri(params.redirectUri);
    }

    if (params.balances || hasSession) {
      readBalances(params.balances);
    }

    setIsInitialized(true);

    reloadWithoutBlockedParams(query);
  }

  function extractUrlParams(): AppParams {
    return {
      address: getParameter(query, 'address'),
      signature: getParameter(query, 'signature'),
      wallet: getParameter(query, 'wallet'),
      session: getParameter(query, 'session'),
      redirectUri: getParameter(query, 'redirect-uri'),
      blockchain: getParameter(query, 'blockchain'),
      balances: getParameter(query, 'balances'),
      amountIn: getParameter(query, 'amount-in'),
      amountOut: getParameter(query, 'amount-out'),
      assets: getParameter(query, 'assets'),
      assetIn: getParameter(query, 'asset-in'),
      assetOut: getParameter(query, 'asset-out'),
      bankAccount: getParameter(query, 'bank-account'),
    };
  }

  async function createSession(address: string, signature: string, wallet?: string): Promise<string | undefined> {
    try {
      return (await login(address, signature)) ?? (await signUp(address, signature, wallet));
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  const context = useMemo(() => ({ isInitialized, setParams: setParameters, ...params }), [isInitialized, params]);

  return <ParamContext.Provider value={context}>{props.children}</ParamContext.Provider>;
}
