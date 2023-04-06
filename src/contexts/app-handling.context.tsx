import { PropsWithChildren, createContext, useContext, useState } from 'react';

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
  const [redirectUri, setRedirectUri] = useState<string>();

  function openAppPage(page: AppPage) {
    const win: Window = window;
    win.location = `${redirectUri}${page}`;
  }

  const context = { setRedirectUri, openAppPage };

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
