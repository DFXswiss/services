import { Blockchain, Buy, Sell, Swap, useAuthContext, useSessionContext } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { jwtDecode } from 'jwt-decode';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useChange } from 'src/hooks/change.hook';
import { Service } from '../App';
import { useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';
import { isSafeRedirectUri, relativeUrl, url } from '../util/utils';
import { useBalanceContext } from './balance.context';

// --- INTERFACES --- //
// CAUTION: params need to be added to index-widget.tsx
// Session-hygiene list: strip one-shot auth/session/PII/config values from the address bar after
// init so they do not linger. `personal-iban` is intentionally NOT listed — it is a public,
// non-secret customer intent selector and the durable source of truth for the current purchase
// (visible in the address bar for the whole lifetime of the selection).
const urlParamsToRemove = [
  'headless',
  'borderless',
  'hide-target-selection',
  'flags',
  'lang',
  'address',
  'signature',
  'pubkey',
  'mail',
  'account-type',
  'first-name',
  'last-name',
  'street',
  'house-number',
  'zip',
  'city',
  'country',
  'organization-name',
  'organization-street',
  'organization-house-number',
  'organization-zip',
  'organization-city',
  'organization-country',
  'phone',
  'wallet',
  'wallets',
  'refcode',
  'special-code',
  'recommendation-code',
  'session',
  'redirect',
  'type',
  'redirect-uri',
  'auto-start',
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
  'trezor-connect-src',
];

export interface AppParams {
  headless?: string;
  borderless?: string;
  hideTargetSelection?: string;
  flags?: string;
  lang?: string;
  address?: string;
  signature?: string;
  pubkey?: string;
  mail?: string;
  accountType?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  country?: string;
  organizationName?: string;
  organizationStreet?: string;
  organizationHouseNumber?: string;
  organizationZip?: string;
  organizationCity?: string;
  organizationCountry?: string;
  phone?: string;
  wallet?: string;
  wallets?: string;
  refcode?: string;
  specialCode?: string;
  recommendationCode?: string;
  session?: string;
  redirect?: string;
  type?: string;
  redirectUri?: string;
  autoStart?: string;
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
  /** Explicit personal IBAN selector. Public URL name: `personal-iban`. */
  personalIban?: string;
}

export enum CloseType {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
  PAYMENT = 'payment',
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

export interface PaymentLinkServicesParams extends CloseMessageData {
  type: CloseType.PAYMENT;
}

export type CloseServicesParams =
  | CancelServicesParams
  | BuyServicesParams
  | SellServicesParams
  | SwapServicesParams
  | PaymentLinkServicesParams;

type WidgetCredentials = Pick<AppParams, 'session' | 'address' | 'signature'>;

interface PendingWidgetCredentialIntent {
  credentials: WidgetCredentials;
  personalIban?: string;
  revision?: number;
  sessionIdentity?: number;
}

function widgetCredentials(params?: AppParams): WidgetCredentials {
  return {
    session: params?.session,
    address: params?.address,
    signature: params?.signature,
  };
}

function hasWidgetCredentials(credentials: WidgetCredentials): boolean {
  return Boolean(credentials.session || (credentials.address && credentials.signature));
}

function areWidgetCredentialsEqual(a: WidgetCredentials, b: WidgetCredentials): boolean {
  return a.session === b.session && a.address === b.address && a.signature === b.signature;
}

function sessionCustomerIdentity(token?: string): number | undefined {
  if (!token) return undefined;

  try {
    const account = jwtDecode<{ account?: number }>(token).account;
    return typeof account === 'number' ? account : undefined;
  } catch {
    return undefined;
  }
}

// --- CONTEXT --- //
interface AppHandlingContextInterface {
  isInitialized: boolean;
  hasSession: boolean;
  isEmbedded: boolean;
  isDfxHosted: boolean;
  /** True when running as the embedded web component (not standalone browser). */
  isWidget: boolean;
  /**
   * Live widget `personal-iban` / `personalIban` attribute/property value (widget only).
   * Derived by consumers via usePersonalIban(); not part of params state.
   */
  widgetPersonalIban?: string;
  /** Selector suppression after an observed customer boundary in this mounted app. */
  personalIbanSuppressed: boolean;
  /** Lift standalone suppression when navigation introduces a new explicit selector intent. */
  restorePersonalIban: () => void;
  /** Associate applied widget credentials with the identity they authenticated. */
  establishWidgetCredentials: (credentials: WidgetCredentials, customerIdentity: number) => void;
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
  params?: AppParams & { personalIbanRevision?: number };
  router: Router;
  closeCallback?: (data: CloseMessageData) => void;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

// personalIban is never copied into params state: its source remains the `personal-iban` URL
// parameter (standalone) or live widget property (embedded). See src/hooks/personal-iban.hook.ts
// for source derivation plus customer-boundary suppression.
export function removeNonStorageParams(params: AppParams): AppParams {
  const copy = { ...params };

  delete copy.address;
  delete copy.signature;
  delete copy.pubkey;
  delete copy.session;
  delete copy.autoStart;

  return copy;
}

export function AppHandlingContextProvider(props: AppHandlingContextProps): JSX.Element {
  const { redirectUri: storeRedirectUri, queryParams: storeQueryParams } = useStore();
  const { isUsedByIframe, sendMessage } = useIframe();
  const { readBalances } = useBalanceContext();
  const { isInitialized: isSessionInitialized, isLoggedIn, availableBlockchains } = useSessionContext();
  const { session } = useAuthContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string>();
  const [params, setParams] = useState<AppParams>({});
  const [redirectPath, setRedirectPath] = useState<string>();
  // A genuine customer boundary suppresses the selector for the rest of this mounted app.
  // Standalone navigation or a widget write can explicitly restore it.
  const [personalIbanSuppressed, setPersonalIbanSuppressed] = useState(false);
  const [establishedWidgetCredentials, setEstablishedWidgetCredentials] = useState<{
    credentials: WidgetCredentials;
    customerIdentity: number;
  }>();
  const lastWidgetPersonalIban = useRef(props.params?.personalIban);
  const lastWidgetPersonalIbanRevision = useRef(props.params?.personalIbanRevision);
  const lastWidgetCredentials = useRef(widgetCredentials(props.params));
  const observedCustomerIdentity = useRef(isLoggedIn ? session?.account : undefined);
  // Only credentials copied into params during initialization can become pending. Later widget
  // credential prop changes are not consumed by the mounted app and therefore must never create a
  // state that waits for those credentials to authenticate.
  const lastInitializationWidgetCredentials = useRef<WidgetCredentials>({});
  const pendingWidgetCredentialIntent = useRef<PendingWidgetCredentialIntent>();
  const currentWidgetCredentials = widgetCredentials(props.params);
  if (
    props.isWidget &&
    !isInitialized &&
    !areWidgetCredentialsEqual(
      currentWidgetCredentials,
      lastInitializationWidgetCredentials.current,
    )
  ) {
    lastInitializationWidgetCredentials.current = currentWidgetCredentials;
    pendingWidgetCredentialIntent.current =
      hasWidgetCredentials(currentWidgetCredentials)
        ? {
            credentials: currentWidgetCredentials,
            personalIban: props.params?.personalIban,
            revision: props.params?.personalIbanRevision,
            sessionIdentity: sessionCustomerIdentity(currentWidgetCredentials.session),
          }
        : undefined;
  } else if (
    pendingWidgetCredentialIntent.current &&
    areWidgetCredentialsEqual(
      currentWidgetCredentials,
      pendingWidgetCredentialIntent.current.credentials,
    ) &&
    (props.params?.personalIban !== pendingWidgetCredentialIntent.current.personalIban ||
      props.params?.personalIbanRevision !== pendingWidgetCredentialIntent.current.revision)
  ) {
    // Attribute/property writes can arrive separately from credentials. Keep the still-unconsumed
    // pair current without assigning it to the transient authenticated customer.
    pendingWidgetCredentialIntent.current = {
      ...pendingWidgetCredentialIntent.current,
      personalIban: props.params?.personalIban,
      revision: props.params?.personalIbanRevision,
    };
  }

  const authenticatedCustomerIdentity = isLoggedIn ? session?.account : undefined;
  const pendingWidgetIntent = pendingWidgetCredentialIntent.current;
  const pendingWidgetIntentIsCurrent =
    pendingWidgetIntent != null &&
    areWidgetCredentialsEqual(currentWidgetCredentials, pendingWidgetIntent.credentials);
  const establishedCredentialIdentity =
    establishedWidgetCredentials &&
    pendingWidgetIntentIsCurrent &&
    areWidgetCredentialsEqual(
      establishedWidgetCredentials.credentials,
      pendingWidgetIntent!.credentials,
    )
      ? establishedWidgetCredentials.customerIdentity
      : undefined;
  const establishedPendingIdentity =
    pendingWidgetIntent?.sessionIdentity ?? establishedCredentialIdentity;
  const widgetCredentialsBelongToAuthenticatedCustomer =
    pendingWidgetIntentIsCurrent &&
    establishedPendingIdentity != null &&
    establishedPendingIdentity === authenticatedCustomerIdentity;
  const widgetIntentBelongsToIncomingCustomer =
    widgetCredentialsBelongToAuthenticatedCustomer &&
    pendingWidgetIntent?.personalIban !== undefined;
  const widgetIntentIsPending =
    pendingWidgetIntentIsCurrent &&
    pendingWidgetIntent?.personalIban !== undefined &&
    !widgetCredentialsBelongToAuthenticatedCustomer;
  // Hide the selector on the very render that exposes a different authenticated account, before
  // quote effects in descendants can run. A credential-bound intent wins only when those exact
  // credentials have established the rendered identity.
  const authenticatedCustomerChanged =
    authenticatedCustomerIdentity != null &&
    observedCustomerIdentity.current != null &&
    authenticatedCustomerIdentity !== observedCustomerIdentity.current &&
    !widgetIntentBelongsToIncomingCustomer;

  const search = (window as Window).location.search;
  const query = new URLSearchParams(search);

  useChange((newVal, oldVal) => {
    if (!newVal && oldVal) {
      observedCustomerIdentity.current = undefined;
      clearCustomerSessionState();
    }
  }, isLoggedIn);

  // Only an authenticated identity that this mounted app has already observed can establish an
  // identity-change boundary. An expired persisted token or tokenless mount never reaches here.
  useEffect(() => {
    if (authenticatedCustomerIdentity == null) return;

    const previousIdentity = observedCustomerIdentity.current;
    if (previousIdentity === authenticatedCustomerIdentity) {
      if (widgetCredentialsBelongToAuthenticatedCustomer) {
        pendingWidgetCredentialIntent.current = undefined;
        setEstablishedWidgetCredentials(undefined);
        if (widgetIntentBelongsToIncomingCustomer) setPersonalIbanSuppressed(false);
      }
      return;
    }

    observedCustomerIdentity.current = authenticatedCustomerIdentity;
    if (widgetCredentialsBelongToAuthenticatedCustomer) {
      // Consume the credential and selector together only after their authenticated identity is
      // present. This is intentionally atomic: neither is baselined against a transient customer.
      pendingWidgetCredentialIntent.current = undefined;
      setEstablishedWidgetCredentials(undefined);
      if (widgetIntentBelongsToIncomingCustomer) setPersonalIbanSuppressed(false);
    }

    if (previousIdentity != null && previousIdentity !== authenticatedCustomerIdentity) {
      clearCustomerSessionState(!widgetIntentBelongsToIncomingCustomer);
    }
  }, [
    authenticatedCustomerIdentity,
    widgetCredentialsBelongToAuthenticatedCustomer,
    widgetIntentBelongsToIncomingCustomer,
  ]);

  const establishWidgetCredentials = useCallback(
    (credentials: WidgetCredentials, customerIdentity: number) => {
      setEstablishedWidgetCredentials({ credentials, customerIdentity });
    },
    [],
  );

  // A live selector write is explicit intent. Changed post-mount credentials are initialization-
  // only, but a selector supplied alongside them is still fresh intent for the mounted customer;
  // never wait for unsupported reauthentication.
  useEffect(() => {
    const credentialsChanged = !areWidgetCredentialsEqual(
      currentWidgetCredentials,
      lastWidgetCredentials.current,
    );
    if (credentialsChanged) lastWidgetCredentials.current = currentWidgetCredentials;

    const selectorChanged =
      props.params?.personalIban !== lastWidgetPersonalIban.current ||
      props.params?.personalIbanRevision !== lastWidgetPersonalIbanRevision.current;
    if (selectorChanged) {
      lastWidgetPersonalIban.current = props.params?.personalIban;
      lastWidgetPersonalIbanRevision.current = props.params?.personalIbanRevision;
    }

    if (
      selectorChanged ||
      (credentialsChanged && props.params?.personalIban !== undefined)
    ) {
      setPersonalIbanSuppressed(false);
    }
  }, [
    props.params?.address,
    props.params?.personalIban,
    props.params?.personalIbanRevision,
    props.params?.session,
    props.params?.signature,
  ]);

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

  function clearCustomerSessionState(suppressSelector = true) {
    storeQueryParams.remove();
    storeRedirectUri.remove();
    setParams({});
    setRedirectUri(undefined);
    setPersonalIbanSuppressed(suppressSelector);

    if (props.isWidget || !suppressSelector) return;

    const currentQuery = new URLSearchParams((window as Window).location.search);
    if (!currentQuery.has('personal-iban')) return;

    currentQuery.delete('personal-iban');
    const path = props.router.state.location.pathname;
    props.router.navigate(relativeUrl({ path, params: currentQuery }), { replace: true });
    const { location, history } = window;
    history.replaceState(
      undefined,
      '',
      url({ base: location.origin, path: location.pathname, params: currentQuery }),
    );
  }

  function setParameters(params: Partial<AppParams>) {
    setParams((p) => {
      const updatedParams = { ...p, ...params };
      storeQueryParams.set(removeNonStorageParams(updatedParams));
      return updatedParams;
    });
  }

  function paramsIsNotEmpty(paramSet: AppParams): boolean {
    return Object.values(paramSet).some((value) => value !== undefined);
  }

  function paramsHasSession(params?: AppParams): boolean {
    return Boolean(params?.session || (params?.address && params.signature));
  }

  function loadQueryParams(): AppParams {
    const queryParams = extractUrlParams(props.params);
    const storeParams = removeNonStorageParams(queryParams);

    const storedParams = storeQueryParams.get();
    if (paramsIsNotEmpty(storeParams)) {
      storeQueryParams.set(storeParams);
    } else {
      Object.assign(queryParams, storedParams ?? {});
    }

    setParams(queryParams);
    return queryParams;
  }

  async function init() {
    const params = loadQueryParams();

    if (params.redirectUri && isSafeRedirectUri(params.redirectUri)) {
      setRedirectUri(params.redirectUri);
      storeRedirectUri.set(params.redirectUri);
    }

    const hasSession = paramsHasSession(params);
    setHasSession(hasSession);
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
          ...Object.entries(params)
            // personalIban is never copied into params state — consumers use usePersonalIban().
            .filter(([key, val]) => typeof val === 'string' && key !== 'personalIban')
            .reduce(
              (prev, [key, val]) => {
                prev[key] = val;
                return prev;
              },
              {} as { [key: string]: string },
            ),
        }
      : {
          headless: getParameter(query, 'headless'),
          borderless: getParameter(query, 'borderless'),
          hideTargetSelection: getParameter(query, 'hide-target-selection'),
          flags: getParameter(query, 'flags'),
          lang: getParameter(query, 'lang'),
          address: getParameter(query, 'address'),
          signature: getParameter(query, 'signature'),
          pubkey: getParameter(query, 'pubkey'),
          mail: getParameter(query, 'mail'),
          accountType: getParameter(query, 'account-type'),
          firstName: getParameter(query, 'first-name'),
          lastName: getParameter(query, 'last-name'),
          street: getParameter(query, 'street'),
          houseNumber: getParameter(query, 'house-number'),
          zip: getParameter(query, 'zip'),
          city: getParameter(query, 'city'),
          country: getParameter(query, 'country'),
          organizationName: getParameter(query, 'organization-name'),
          organizationStreet: getParameter(query, 'organization-street'),
          organizationHouseNumber: getParameter(query, 'organization-house-number'),
          organizationZip: getParameter(query, 'organization-zip'),
          organizationCity: getParameter(query, 'organization-city'),
          organizationCountry: getParameter(query, 'organization-country'),
          phone: getParameter(query, 'phone'),
          wallet: getParameter(query, 'wallet'),
          wallets: getParameter(query, 'wallets'),
          refcode: getParameter(query, 'refcode'),
          specialCode: getParameter(query, 'special-code'),
          recommendationCode: getParameter(query, 'recommendation-code'),
          session: getParameter(query, 'session'),
          redirect: getParameter(query, 'redirect'),
          type: getParameter(query, 'type'),
          redirectUri: getParameter(query, 'redirect-uri'),
          autoStart: getParameter(query, 'auto-start'),
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
    props.router.navigate(relativeUrl({ path, params: query }), { replace: true });

    const { location, history } = window;
    history.replaceState(undefined, '', url({ base: location.origin, path: location.pathname, params: query }));
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
        storeRedirectUri.remove();
        setRedirectUri(undefined);

        // discard unsafe URIs (e.g. javascript:) to prevent script execution and phishing redirects
        if (isSafeRedirectUri(redirectUri)) {
          const uri = getRedirectUri(redirectUri, params);
          setTimeout(() => ((window as Window).location = uri), 2000);
        }
      }
    }

    if (navigate) props.router.navigate('/account');
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

      default:
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
      return new URL(url({ base: newUrl, params: uri.searchParams }));
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
      case CloseType.PAYMENT:
        return params;

      default:
        return { type: CloseType.CANCEL };
    }
  }

  const widgetPersonalIban = !props.isWidget
    ? undefined
    : widgetIntentBelongsToIncomingCustomer
    ? pendingWidgetIntent?.personalIban
    : personalIbanSuppressed || authenticatedCustomerChanged || widgetIntentIsPending
    ? undefined
    : props.params?.personalIban;
  const isPersonalIbanSuppressed =
    (personalIbanSuppressed && !widgetIntentBelongsToIncomingCustomer) ||
    authenticatedCustomerChanged ||
    widgetIntentIsPending;

  const context = useMemo(
    () => ({
      isEmbedded: props.isWidget || isUsedByIframe,
      isWidget: props.isWidget,
      widgetPersonalIban,
      personalIbanSuppressed: isPersonalIbanSuppressed,
      restorePersonalIban: () => setPersonalIbanSuppressed(false),
      establishWidgetCredentials,
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
      widgetPersonalIban,
      isPersonalIbanSuppressed,
      establishWidgetCredentials,
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
