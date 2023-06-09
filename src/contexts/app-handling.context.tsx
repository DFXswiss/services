import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../hooks/store.hook';

export enum AppPage {
  BUY = 'buy',
  SELL = 'sell',
}

interface AppHandlingContextInterface {
  setRedirectUri: (redirectUri: string) => void;
  openAppPage: (page: AppPage, params?: URLSearchParams) => void;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider(props: PropsWithChildren): JSX.Element {
  const { redirectUri: storeRedirectUri } = useStore();
  const [redirectUri, setRedirectUri] = useState<string>();

  useEffect(() => {
    if (!redirectUri) setRedirectUri(storeRedirectUri.get());
  }, []);

  function openAppPage(page: AppPage, params?: URLSearchParams) {
    const win: Window = window;
    win.location = params ? `${redirectUri}${page}?${params}` : `${redirectUri}${page}`;
  }

  const context = {
    setRedirectUri: (redirectUri: string) => {
      setRedirectUri(redirectUri);
      storeRedirectUri.set(redirectUri);
    },
    openAppPage,
  };

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
