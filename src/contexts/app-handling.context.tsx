import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../hooks/store.hook';

export enum AppPage {
  BUY = 'buy',
}

interface AppHandlingContextInterface {
  setRedirectUri: (redirectUri: string) => void;
  openAppPage: (page: AppPage) => void;
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

  function openAppPage(page: AppPage) {
    const win: Window = window;
    win.location = `${redirectUri}${page}`;
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
