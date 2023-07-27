import { Utils, useApiSession, useSessionContext } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { useAppHandlingContext } from './app-handling.context';
import { useBalanceContext } from './balance.context';

interface AppParams {
  address?: string;
  signature?: string;
  wallet?: string;
  session?: string;
  redirectUri?: string;
  blockchain?: string;
  balances?: string;
  amountIn?: string;
  amountOut?: string;
  assetIn?: string;
  assetOut?: string;
  bankAccount?: string;
}

interface ParamContextInterface extends AppParams {
  init(search: string): Promise<void>;
  isInitialized: boolean;
}

const ParamContext = createContext<ParamContextInterface>(undefined as any);

export function useParamContext(): ParamContextInterface {
  return useContext(ParamContext);
}

export function ParamContextProvider(props: PropsWithChildren): JSX.Element {
  const { updateSession } = useApiSession();
  const { login, signUp, logout } = useSessionContext();
  const { setRedirectUri } = useAppHandlingContext();
  const { readBalances } = useBalanceContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [params, setParams] = useState<AppParams>({});

  const blockedParams = ['address', 'signature', 'wallet', 'session', 'redirect-uri', 'balances'];

  function getParameter(query: URLSearchParams, key: string): string | undefined {
    return query.get(key) ?? undefined;
  }

  function reloadWithoutBlockedParams(query: URLSearchParams) {
    if (blockedParams.map((param) => query.has(param)).every((b) => !b)) return;
    blockedParams.forEach((param) => query.delete(param));

    const { location } = window as Window;
    location.replace(`${location.origin}${location.pathname}?${query}`);
  }

  async function init(search: string) {
    // extract params
    const query = new URLSearchParams(search);
    const urlParams = {
      address: getParameter(query, 'address'),
      signature: getParameter(query, 'signature'),
      wallet: getParameter(query, 'wallet'),
      session: getParameter(query, 'session'),
      redirectUri: getParameter(query, 'redirect-uri'),
      blockchain: getParameter(query, 'blockchain'),
      balances: getParameter(query, 'balances'),
      amountIn: getParameter(query, 'amount-in'),
      amountOut: getParameter(query, 'amount-out'),
      assetIn: getParameter(query, 'asset-in'),
      assetOut: getParameter(query, 'asset-out'),
      bankAccount: getParameter(query, 'bank-account'),
    };

    setParams(urlParams);

    // session
    if (urlParams.address && urlParams.signature) {
      const session = await createSession(urlParams.address, urlParams.signature, urlParams.wallet);

      !session && logout();
    } else if (urlParams.session && Utils.isJwt(urlParams.session)) {
      updateSession(urlParams.session);
    }

    if (urlParams.redirectUri) {
      setRedirectUri(urlParams.redirectUri);
    }

    if (urlParams.balances) {
      readBalances(urlParams.balances);
    }

    setIsInitialized(true);

    reloadWithoutBlockedParams(query);
  }

  async function createSession(address: string, signature: string, wallet?: string): Promise<string | undefined> {
    try {
      return (await login(address, signature)) ?? (await signUp(address, signature, wallet));
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  const context = useMemo(() => ({ init, isInitialized, ...params }), [isInitialized, params]);

  return <ParamContext.Provider value={context}>{props.children}</ParamContext.Provider>;
}
