import { Buy, Sell, Utils, useApiSession, useSessionContext } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';
import { url } from '../util/utils';
import { useBalanceContext } from './balance.context';

// --- INTERFACES --- //
// CAUTION: params need to be added to index-widget.tsx
const urlParams = [
  'lang',
  'address',
  'signature',
  'wallet',
  'ref-code',
  'session',
  'redirect-uri',
  'mode',
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
  lang?: string;
  address?: string;
  signature?: string;
  wallet?: string;
  refCode?: string;
  session?: string;
  redirectUri?: string;
  mode?: string;
  blockchain?: string;
  balances?: string;
  amountIn?: string;
  amountOut?: string;
  assets?: string;
  assetIn?: string;
  assetOut?: string;
  bankAccount?: string;
}

export enum CloseType {
  BUY = 'buy',
  SELL = 'sell',
  CANCEL = 'cancel',
}

export interface CloseMessageData {
  type: CloseType;
  isComplete?: boolean;
  buy?: Buy;
  sell?: Sell;
}

export interface CancelServicesParams extends CloseMessageData {
  type: CloseType.CANCEL;
}

export interface BuyServicesParams extends CloseMessageData {
  type: CloseType.BUY;
  isComplete: boolean;
  buy: Buy;
}

export interface SellServicesParams extends CloseMessageData {
  type: CloseType.SELL;
  isComplete: boolean;
  sell: Sell;
}

export type CloseServicesParams = CancelServicesParams | BuyServicesParams | SellServicesParams;

// --- CONTEXT --- //
interface AppHandlingContextInterface {
  homePath: string;
  isInitialized: boolean;
  isEmbedded: boolean;
  params: AppParams;
  setParams: (params: Partial<AppParams>) => void;
  closeServices: (params: CloseServicesParams) => void;
}

interface AppHandlingContextProps extends PropsWithChildren {
  home: string;
  isWidget: boolean;
  params?: AppParams;
  router: Router;
  closeCallback?: (data: CloseMessageData) => void;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider(props: AppHandlingContextProps): JSX.Element {
  const { redirectUri: storeRedirectUri } = useStore();
  const { isUsedByIframe, sendMessage } = useIframe();
  const { updateSession } = useApiSession();
  const { login, signUp, logout } = useSessionContext();
  const { readBalances } = useBalanceContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string>();
  const [params, setParams] = useState<AppParams>({});

  const search = (window as Window).location.search;
  const query = new URLSearchParams(search);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!redirectUri) setRedirectUri(storeRedirectUri.get());
  }, []);

  // parameters
  function getParameter(query: URLSearchParams, key: string): string | undefined {
    return query.get(key) ?? undefined;
  }

  function setParameters(params: Partial<AppParams>) {
    setParams((p) => ({ ...p, ...params }));
  }

  async function init() {
    const params = props.params ?? extractUrlParams();

    setParams(params);

    const hasSession = await checkSession(params);

    if (params.redirectUri) {
      setRedirectUri(params.redirectUri);
    }

    if (params.balances || hasSession) {
      readBalances(params.balances);
    }

    setIsInitialized(true);

    removeUrlParams(query);
  }

  function extractUrlParams(): AppParams {
    return {
      lang: getParameter(query, 'lang'),
      address: getParameter(query, 'address'),
      signature: getParameter(query, 'signature'),
      wallet: getParameter(query, 'wallet'),
      refCode: getParameter(query, 'ref-code'),
      session: getParameter(query, 'session'),
      redirectUri: getParameter(query, 'redirect-uri'),
      mode: getParameter(query, 'mode'),
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

  function removeUrlParams(query: URLSearchParams) {
    if (urlParams.map((param) => query.has(param)).every((b) => !b)) return;
    urlParams.forEach((param) => query.delete(param));

    const { location } = window;
    props.router.navigate({ pathname: `${location.origin}${location.pathname}`, search: `?${query}` });
  }

  async function checkSession(params: AppParams): Promise<boolean> {
    if (params.address && params.signature) {
      const session = await createSession(params.address, params.signature, params.wallet, params.refCode);
      if (session) {
        return true;
      } else {
        logout();
        return false;
      }
    } else if (params.session && Utils.isJwt(params.session)) {
      updateSession(params.session);
      return true;
    }

    return false;
  }

  async function createSession(
    address: string,
    signature: string,
    wallet?: string,
    refCode?: string,
  ): Promise<string | undefined> {
    try {
      return (await login(address, signature)) ?? (await signUp(address, signature, wallet, refCode));
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  // closing
  function closeServices(params: CloseServicesParams) {
    if (props.isWidget) {
      props.closeCallback?.(createCloseMessageData(params));
    } else if (isUsedByIframe) {
      sendMessage(createCloseMessageData(params));
    } else {
      const win: Window = window;
      win.location = getRedirectUri(params);
    }
  }

  function getRedirectUri(params: CloseServicesParams): string {
    switch (params.type) {
      case CloseType.BUY:
        return `${redirectUri}${params.type}`;

      case CloseType.SELL:
        const urlParams = new URLSearchParams({
          routeId: params.sell.routeId.toString(),
          amount: params.sell.amount.toString(),
          isComplete: params.isComplete.toString(),
        });
        return url(`${redirectUri}${params.type}`, urlParams);

      default:
        return `${redirectUri}`;
    }
  }

  function createCloseMessageData(params: CloseServicesParams): CloseMessageData {
    switch (params.type) {
      case CloseType.BUY:
      case CloseType.SELL:
        return params;

      default:
        return { type: CloseType.CANCEL };
    }
  }

  const context = useMemo(
    () => ({
      homePath: props.home,
      isEmbedded: props.isWidget || isUsedByIframe,
      closeServices,
      isInitialized,
      params,
      setParams: setParameters,
    }),
    [props.home, props.isWidget, isUsedByIframe, redirectUri, isInitialized, params],
  );

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
