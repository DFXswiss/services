import { Sell } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PaymentInformation } from '../components/buy/payment-information';
import { IframeMessageData, IframeMessageType, useIframe } from '../hooks/iframe.hook';
import { useStore } from '../hooks/store.hook';

export enum AppPage {
  BUY = 'buy',
  SELL = 'sell',
}

export interface OpenAppPageParams {
  page: AppPage;
  urlParams?: URLSearchParams;
  buyPaymentInfo?: PaymentInformation;
  sellPaymentInfo?: Sell;
}

interface AppHandlingContextInterface {
  setRedirectUri: (redirectUri: string) => void;
  openAppPage: (params: OpenAppPageParams) => void;
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

  function openAppPage(params: OpenAppPageParams) {
    if (isUsedByIframe) {
      sendMessage(createIframeMessageData(params));
    } else {
      const win: Window = window;
      win.location = params.urlParams
        ? `${redirectUri}${params.page}?${params.urlParams}`
        : `${redirectUri}${params.page}`;
    }
  }

  function createIframeMessageData(params: OpenAppPageParams): IframeMessageData {
    const data: IframeMessageData = {
      type: IframeMessageType.CLOSE,
    };

    if (params.buyPaymentInfo) {
      data.buy = {
        iban: params.buyPaymentInfo.iban,
        bic: params.buyPaymentInfo.bic,
        purpose: params.buyPaymentInfo.purpose,
        estimatedAmount: params.buyPaymentInfo.estimatedAmount,
      };
    }

    if (params.sellPaymentInfo) {
      data.sell = {
        depositAddress: params.sellPaymentInfo.depositAddress,
        blockchain: params.sellPaymentInfo.blockchain,
        estimatedAmount: params.sellPaymentInfo.estimatedAmount,
        paymentRequest: params.sellPaymentInfo.paymentRequest,
      };
    }

    return data;
  }

  const context = useMemo(
    () => ({
      setRedirectUri: (redirectUri: string) => {
        setRedirectUri(redirectUri);
        storeRedirectUri.set(redirectUri);
      },
      openAppPage,
    }),
    [redirectUri],
  );

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
