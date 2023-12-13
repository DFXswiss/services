import { Buy, Sell } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';
import { url } from '../util/utils';
import { useBalanceContext } from './balance.context';

// --- INTERFACES --- //
// CAUTION: params need to be added to index-widget.tsx
const urlParams = [
  'headless',
  'flags',
  'lang',
  'address',
  'signature',
  'mail',
  'wallet',
  'refcode',
  'special-code',
  'session',
  'redirect',
  'type',
  'redirect-uri',
  'mode',
  'blockchain',
  'balances',
  'amount-in',
  'amount-out',
  'assets',
  'asset-in',
  'asset-out',
  'payment-method',
  'bank-account',
];

export interface AppParams {
  headless?: string;
  flags?: string;
  lang?: string;
  address?: string;
  signature?: string;
  mail?: string;
  wallet?: string;
  refcode?: string;
  specialCode?: string;
  session?: string;
  redirect?: string;
  type?: string;
  redirectUri?: string;
  mode?: string;
  blockchain?: string;
  balances?: string;
  amountIn?: string;
  amountOut?: string;
  assets?: string;
  assetIn?: string;
  assetOut?: string;
  paymentMethod?: string;
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
  buy?: Buy;
}

export interface SellServicesParams extends CloseMessageData {
  type: CloseType.SELL;
  isComplete: boolean;
  sell: Sell;
}

export type CloseServicesParams = CancelServicesParams | BuyServicesParams | SellServicesParams;

// --- CONTEXT --- //
interface AppHandlingContextInterface {
  isInitialized: boolean;
  isEmbedded: boolean;
  params: AppParams;
  setParams: (params: Partial<AppParams>) => void;
  closeServices: (params: CloseServicesParams, navigate: boolean) => void;
  redirectPath?: string;
  setRedirectPath: (path?: string) => void;
  canClose: boolean;
}

interface AppHandlingContextProps extends PropsWithChildren {
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
  const { readBalances } = useBalanceContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string>();
  const [params, setParams] = useState<AppParams>({});
  const [redirectPath, setRedirectPath] = useState<string>();

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
    const params = extractUrlParams(props.params);

    setParams(params);

    if (params.redirectUri) {
      setRedirectUri(params.redirectUri);
      storeRedirectUri.set(params.redirectUri);
    }

    const hasSession = params.session || (params.address && params.signature);
    if (params.balances || hasSession) {
      readBalances(params.balances);
    }

    setIsInitialized(true);

    removeUrlParams(query);
  }

  function extractUrlParams(params?: AppParams): AppParams {
    return params
      ? {
          session: getParameter(query, 'session'),
          redirect: getParameter(query, 'redirect'),
          type: getParameter(query, 'type'),
          ...params,
        }
      : {
          headless: getParameter(query, 'headless'),
          flags: getParameter(query, 'flags'),
          lang: getParameter(query, 'lang'),
          address: getParameter(query, 'address'),
          signature: getParameter(query, 'signature'),
          mail: getParameter(query, 'mail'),
          wallet: getParameter(query, 'wallet'),
          refcode: getParameter(query, 'refcode'),
          specialCode: getParameter(query, 'special-code'),
          session: getParameter(query, 'session'),
          redirect: getParameter(query, 'redirect'),
          type: getParameter(query, 'type'),
          redirectUri: getParameter(query, 'redirect-uri'),
          mode: getParameter(query, 'mode'),
          blockchain: getParameter(query, 'blockchain'),
          balances: getParameter(query, 'balances'),
          amountIn: getParameter(query, 'amount-in'),
          amountOut: getParameter(query, 'amount-out'),
          assets: getParameter(query, 'assets'),
          assetIn: getParameter(query, 'asset-in'),
          assetOut: getParameter(query, 'asset-out'),
          paymentMethod: getParameter(query, 'payment-method'),
          bankAccount: getParameter(query, 'bank-account'),
        };
  }

  function removeUrlParams(query: URLSearchParams) {
    if (urlParams.map((param) => query.has(param)).every((b) => !b)) return;
    urlParams.forEach((param) => query.delete(param));

    const path = props.router.state.location.pathname;
    props.router.navigate(path, { replace: true });

    const { location, history } = window;
    history.replaceState(undefined, '', url(`${location.origin}${location.pathname}`, query));
  }

  // closing
  function closeServices(params: CloseServicesParams, navigate: boolean) {
    if (props.isWidget) {
      props.closeCallback?.(createCloseMessageData(params));
    } else if (isUsedByIframe) {
      sendMessage(createCloseMessageData(params));
    } else {
      if (redirectUri) {
        const uri = getRedirectUri(redirectUri, params);
        storeRedirectUri.remove();
        (window as Window).location = uri;
      }
    }

    if (navigate) props.router.navigate('/');
  }

  function getRedirectUri(baseUri: string, params: CloseServicesParams): string {
    let uri = new URL(baseUri);

    switch (params.type) {
      case CloseType.BUY:
        uri = adaptUri(uri, params.type);
        break;

      case CloseType.SELL:
        uri = adaptUri(uri, params.type, {
          routeId: params.sell.routeId.toString(),
          amount: params.sell.amount.toString(),
          isComplete: params.isComplete.toString(),
        });
        break;
    }

    return uri.toString();
  }

  function adaptUri(uri: URL, path: string, params?: object): URL {
    params && Object.entries(params).forEach(([key, val]) => uri.searchParams.set(key, val));

    if (uri.origin === 'null') {
      // custom solution for deep link URIs
      const pathname = uri.pathname ? uri.pathname : '//';
      const newUrl = adaptPath(uri.protocol + pathname, path);
      return new URL(url(newUrl, uri.searchParams));
    } else {
      uri.pathname = adaptPath(uri.pathname, path);

      return uri;
    }
  }

  function adaptPath(path: string, newElement: string): string {
    return path + (path.endsWith('/') ? newElement : `/${newElement}`);
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
      isEmbedded: props.isWidget || isUsedByIframe,
      closeServices,
      isInitialized,
      params,
      setParams: setParameters,
      redirectPath,
      setRedirectPath,
      canClose: redirectUri != null,
    }),
    [props.isWidget, isUsedByIframe, redirectUri, isInitialized, params, redirectPath],
  );

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
