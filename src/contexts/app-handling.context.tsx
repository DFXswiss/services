import { Buy, Sell } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';

export enum AppPage {
  BUY = 'buy',
  SELL = 'sell',
}

export enum IframeMessageType {
  BUY = 'buy',
  SELL = 'sell',
  CLOSE = 'close',
}

export interface IframeMessageData {
  type: IframeMessageType;
  buy?: Buy;
  sell?: Sell;
}

export interface CloseServicesParams {
  page?: AppPage;
  buy?: {
    paymentInfo?: Buy;
    amount?: number;
  };
  sell?: {
    paymentInfo?: Sell;
    amount?: number;
  };
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
      routeId: '' + (params.sell?.paymentInfo?.routeId ?? 0),
      amount: params.sell?.amount ? params.sell.amount.toString() : '0',
    });

    const win: Window = window;
    win.location = `${redirectUri}${params.page}?${urlParams}`;
  }

  function createIframeMessageData(params: CloseServicesParams): IframeMessageData {
    if (params.buy?.paymentInfo) {
      return {
        type: IframeMessageType.BUY,
        buy: params.buy.paymentInfo,
      };
    }

    if (params.sell?.paymentInfo) {
      return {
        type: IframeMessageType.SELL,
        sell: params.sell.paymentInfo,
      };
    }

    return { type: IframeMessageType.CLOSE };
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
