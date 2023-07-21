import { Buy, Sell } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { IframeMessageType, useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';

export enum AppPage {
  BUY = 'buy',
  SELL = 'sell',
}

export interface IframeMessageData {
  type: IframeMessageType;
  path?: string;
  buy?: Buy;
  sell?: Sell;
}

export interface CloseServicesParams {
  page: AppPage;
  buyPaymentInfo?: Buy;
  buyEnteredAmount?: number;
  sellPaymentInfo?: Sell;
  sellEnteredAmount?: number;
}

interface AppHandlingContextInterface {
  setRedirectUri: (redirectUri: string) => void;
  closeServices: (params: CloseServicesParams) => void;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider(props: PropsWithChildren): JSX.Element {
  const { redirectUri: storeRedirectUri } = useStore();
  const [redirectUri, setRedirectUri] = useState<string>();
  const { isUsedByIframe, sendMessage } = useIframe();

  useEffect(() => {
    if (!redirectUri) setRedirectUri(storeRedirectUri.get());
  }, []);

  function closeServices(params: CloseServicesParams) {
    if (isUsedByIframe) {
      sendMessage(createIframeMessageData(params));
    } else {
      if (params.page === AppPage.BUY) {
        closeBuyService(params);
      } else if (params.page === AppPage.SELL) {
        closeSellService(params);
      }
    }
  }

  function closeBuyService(params: CloseServicesParams) {
    const win: Window = window;
    win.location = `${redirectUri}${params.page}`;
  }

  function closeSellService(params: CloseServicesParams) {
    const urlParams = new URLSearchParams({
      routeId: '' + (params.sellPaymentInfo?.routeId ?? 0),
      amount: params.sellEnteredAmount ? params.sellEnteredAmount.toString() : '0',
    });

    const win: Window = window;
    win.location = `${redirectUri}${params.page}?${urlParams}`;
  }

  function createIframeMessageData(params: CloseServicesParams): IframeMessageData {
    const data: IframeMessageData = {
      type: IframeMessageType.CLOSE,
    };

    if (params.buyPaymentInfo) {
      data.buy = params.buyPaymentInfo;
    }

    if (params.sellPaymentInfo) {
      data.sell = params.sellPaymentInfo;
    }

    return data;
  }

  const context = useMemo(
    () => ({
      setRedirectUri: (redirectUri: string) => {
        setRedirectUri(redirectUri);
        storeRedirectUri.set(redirectUri);
      },
      closeServices,
    }),
    [redirectUri],
  );

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
