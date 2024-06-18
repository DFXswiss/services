import { Blockchain, Buy, Sell, Swap, useSessionContext } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Service } from '../App';
import { useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';
import { url } from '../util/utils';
import { useBalanceContext } from './balance.context';

// --- INTERFACES --- //
// CAUTION: params need to be added to index-widget.tsx
const urlParamsToRemove = [
  'headless',
  'headless-menu',
  'borderless',
  'hide-target-selection',
  'title-in',
  'title-out',
  'title-iban',
  'hide-exchange-rate',
  'deposit-address-hint',
  'hide-deposit-address',
  'account-not-verified-hint',
  'flags',
  'lang',
  'address',
  'signature',
  'mail',
  'wallet',
  'wallets',
  'refcode',
  'special-code',
  'session',
  'redirect',
  'type',
  'redirect-uri',
  'mode',
  'blockchain',
  'blockchains',
  'balances',
  'amount-in',
  'amount-out',
  'assets',
  'asset-in',
  'asset-out',
  'payment-method',
  'bank-account',
  'external-transaction-id',
];

export interface AppParams {
  headless?: string;
  headlessMenu?: string;
  borderless?: string;
  hideTargetSelection?: string;
  titleIn?: string;
  titleOut?: string;
  titleIban?: string;
  hideExchangeRate?: string;
  depositAddressHint?: string;
  hideDepositAddress?: string;
  accountNotVerifiedHint?: string;
  flags?: string;
  lang?: string;
  address?: string;
  signature?: string;
  mail?: string;
  wallet?: string;
  wallets?: string;
  refcode?: string;
  specialCode?: string;
  session?: string;
  redirect?: string;
  type?: string;
  redirectUri?: string;
  mode?: string;
  blockchain?: string;
  blockchains?: string;
  balances?: string;
  amountIn?: string;
  amountOut?: string;
  assets?: string;
  assetIn?: string;
  assetOut?: string;
  paymentMethod?: string;
  bankAccount?: string;
  externalTransactionId?: string;
}

export enum CloseType {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
  CANCEL = 'cancel',
}

export interface CloseMessageData {
  type: CloseType;
  isComplete?: boolean;
  buy?: Buy;
  sell?: Sell;
  swap?: Swap;
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

export interface SwapServicesParams extends CloseMessageData {
  type: CloseType.SWAP;
  isComplete: boolean;
  swap: Swap;
}

export type CloseServicesParams = CancelServicesParams | BuyServicesParams | SellServicesParams | SwapServicesParams;

// --- CONTEXT --- //
interface AppHandlingContextInterface {
  isInitialized: boolean;
  hasSession: boolean;
  isEmbedded: boolean;
  isDfxHosted: boolean;
  availableBlockchains?: Blockchain[];
  params: AppParams;
  setParams: (params: Partial<AppParams>) => void;
  closeServices: (params: CloseServicesParams, navigate: boolean) => void;
  redirectPath?: string;
  setRedirectPath: (path?: string) => void;
  canClose: boolean;
  service?: Service;
}

interface AppHandlingContextProps extends PropsWithChildren {
  isWidget: boolean;
  service?: Service;
  params?: AppParams;
  router: Router;
  closeCallback?: (data: CloseMessageData) => void;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider(props: AppHandlingContextProps): JSX.Element {
  const { redirectUri: storeRedirectUri, queryParams: storeQueryParams } = useStore();
  const { isUsedByIframe, sendMessage } = useIframe();
  const { readBalances } = useBalanceContext();
  const { isInitialized: isSessionInitialized, isLoggedIn, availableBlockchains } = useSessionContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string>();
  const [params, setParams] = useState<AppParams>({});
  const [redirectPath, setRedirectPath] = useState<string>();

  const search = (window as Window).location.search;
  const query = new URLSearchParams(search);

  useEffect(() => {
    if (isSessionInitialized && !isLoggedIn) {
      storeQueryParams.remove();
      setParams({});
    }
  }, [isSessionInitialized, isLoggedIn]);

  useEffect(() => {
    isSessionInitialized && init();
  }, [isSessionInitialized]);

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

  function paramsIsNotEmpty(paramSet: AppParams): boolean {
    return Object.values(paramSet).some((value) => value !== undefined);
  }

  function loadQueryParams(): AppParams {
    let queryParams = extractUrlParams(props.params);

    const storedParams = storeQueryParams.get();
    if ((paramsIsNotEmpty(queryParams) && !storedParams?.session) || queryParams.session) {
      storeQueryParams.set(queryParams);
    } else {
      queryParams = storedParams ?? {};
    }

    setParams(queryParams);
    return queryParams;
  }

  async function init() {
    const params = loadQueryParams();

    if (params.redirectUri) {
      setRedirectUri(params.redirectUri);
      storeRedirectUri.set(params.redirectUri);
    }

    const hasSession = Boolean(params.session || (params.address && params.signature));
    setHasSession(hasSession);
    if (params.balances || hasSession) {
      readBalances(params.balances);
    }

    setIsInitialized(true);

    // removeUrlParams(query);
  }

  function extractUrlParams(params?: AppParams): AppParams {
    return params
      ? {
          session: getParameter(query, 'session'),
          redirect: getParameter(query, 'redirect'),
          type: getParameter(query, 'type'),
          ...Object.keys(params)
            .filter(([key, _]) => urlParamsToRemove.includes(key))
            .reduce((prev, [key, val]) => {
              prev[key] = val;
              return prev;
            }, {} as { [key: string]: string }),
        }
      : {
          headless: getParameter(query, 'headless'),
          headlessMenu: getParameter(query, 'headless-menu'),
          borderless: getParameter(query, 'borderless'),
          hideTargetSelection: getParameter(query, 'hide-target-selection'),
          titleIn: getParameter(query, 'title-in'),
          titleOut: getParameter(query, 'title-out'),
          titleIban: getParameter(query, 'title-iban'),
          hideExchangeRate: getParameter(query, 'hide-exchange-rate'),
          depositAddressHint: getParameter(query, 'deposit-address-hint'),
          hideDepositAddress: getParameter(query, 'hide-deposit-address'),
          accountNotVerifiedHint: getParameter(query, 'account-not-verified-hint'),
          flags: getParameter(query, 'flags'),
          lang: getParameter(query, 'lang'),
          address: getParameter(query, 'address'),
          signature: getParameter(query, 'signature'),
          mail: getParameter(query, 'mail'),
          wallet: getParameter(query, 'wallet'),
          wallets: getParameter(query, 'wallets'),
          refcode: getParameter(query, 'refcode'),
          specialCode: getParameter(query, 'special-code'),
          session: getParameter(query, 'session'),
          redirect: getParameter(query, 'redirect'),
          type: getParameter(query, 'type'),
          redirectUri: getParameter(query, 'redirect-uri'),
          mode: getParameter(query, 'mode'),
          blockchain: Object.values(Blockchain).find(
            (b) => b.toLowerCase() === getParameter(query, 'blockchain')?.toLowerCase(),
          ),
          blockchains: getParameter(query, 'blockchains'),
          balances: getParameter(query, 'balances'),
          amountIn: getParameter(query, 'amount-in'),
          amountOut: getParameter(query, 'amount-out'),
          assets: getParameter(query, 'assets'),
          assetIn: getParameter(query, 'asset-in'),
          assetOut: getParameter(query, 'asset-out'),
          paymentMethod: getParameter(query, 'payment-method'),
          bankAccount: getParameter(query, 'bank-account'),
          externalTransactionId: getParameter(query, 'external-transaction-id'),
        };
  }

  function removeUrlParams(query: URLSearchParams) {
    if (urlParamsToRemove.map((param) => query.has(param)).every((b) => !b)) return;
    urlParamsToRemove.forEach((param) => query.delete(param));

    const path = props.router.state.location.pathname;
    props.router.navigate(url(path, query), { replace: true });

    const { location, history } = window;
    history.replaceState(undefined, '', url(`${location.origin}${location.pathname}`, query));
  }

  // closing
  function closeServices(params: CloseServicesParams, navigate: boolean) {
    if (props.isWidget) {
      props.closeCallback?.(createCloseMessageData(params));
    } else {
      if (isUsedByIframe) {
        sendMessage(createCloseMessageData(params));
      }

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
          asset: params.sell.asset.name,
          blockchain: params.sell.asset.blockchain,
          isComplete: params.isComplete.toString(),
        });
        break;

      case CloseType.SWAP:
        uri = adaptUri(uri, params.type, {
          routeId: params.swap.routeId.toString(),
          amount: params.swap.amount.toString(),
          asset: params.swap.sourceAsset.name,
          blockchain: params.swap.sourceAsset.blockchain,
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
      case CloseType.SWAP:
        return params;

      default:
        return { type: CloseType.CANCEL };
    }
  }

  const context = useMemo(
    () => ({
      isEmbedded: props.isWidget || isUsedByIframe,
      hasSession,
      isDfxHosted: window.location.hostname?.split('.').slice(-2).join('.') === 'dfx.swiss',
      closeServices,
      isInitialized,
      params,
      setParams: setParameters,
      availableBlockchains: availableBlockchains?.filter(
        (b) =>
          !params.blockchains ||
          params.blockchains
            .split(',')
            .map((b1) => b1.toLowerCase())
            .includes(b.toLowerCase()),
      ),
      redirectPath,
      setRedirectPath,
      canClose: redirectUri != null,
      service: props.service,
    }),
    [
      props.isWidget,
      props.service,
      isUsedByIframe,
      redirectUri,
      isInitialized,
      params,
      redirectPath,
      availableBlockchains,
    ],
  );

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
