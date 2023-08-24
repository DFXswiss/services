import { Buy, Sell } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';
import { url } from '../util/utils';

export enum CloseType {
  BUY = 'buy',
  SELL = 'sell',
  CANCEL = 'cancel',
}

export interface CloseMessageData {
  type: CloseType;
  buy?: Buy;
  sell?: Sell;
}

export interface ICloseServicesParams {
  type: CloseType;
  isComplete?: boolean;
  buy?: Buy;
  sell?: Sell;
}

export interface CancelServicesParams extends ICloseServicesParams {
  type: CloseType.CANCEL;
}

export interface BuyServicesParams extends ICloseServicesParams {
  type: CloseType.BUY;
  isComplete: boolean;
  buy: Buy;
}

export interface SellServicesParams extends ICloseServicesParams {
  type: CloseType.SELL;
  isComplete: boolean;
  sell: Sell;
}

export type CloseServicesParams = CancelServicesParams | BuyServicesParams | SellServicesParams;

interface AppHandlingContextInterface {
  homePath: string;
  isEmbedded: boolean;
  setRedirectUri: (redirectUri: string) => void;
  closeServices: (params: CloseServicesParams) => void;
}

interface AppHandlingContextProps extends PropsWithChildren {
  home: string;
  isWidget: boolean;
  closeCallback?: (data: CloseMessageData) => void;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider({
  home,
  isWidget,
  closeCallback,
  children,
}: AppHandlingContextProps): JSX.Element {
  const { redirectUri: storeRedirectUri } = useStore();
  const [redirectUri, setRedirectUri] = useState<string>();
  const { isUsedByIframe, sendMessage } = useIframe();

  useEffect(() => {
    if (!redirectUri) setRedirectUri(storeRedirectUri.get());
  }, []);

  function closeServices(params: CloseServicesParams) {
    if (isWidget) {
      closeCallback?.(createCloseMessageData(params));
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
        return {
          type: CloseType.BUY,
          buy: params.buy,
        };

      case CloseType.SELL:
        return {
          type: CloseType.SELL,
          sell: params.sell,
        };

      default:
        return { type: CloseType.CANCEL };
    }
  }

  const context = useMemo(
    () => ({
      homePath: home,
      isEmbedded: isWidget || isUsedByIframe,
      setRedirectUri: (redirectUri: string) => {
        setRedirectUri(redirectUri);
        storeRedirectUri.set(redirectUri);
      },
      closeServices,
    }),
    [home, redirectUri],
  );

  return <AppHandlingContext.Provider value={context}>{children}</AppHandlingContext.Provider>;
}
