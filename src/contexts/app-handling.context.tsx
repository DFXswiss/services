import { PropsWithChildren, createContext, useContext, useState } from 'react';

interface AppHandlingContextInterface {
  setRedirectUri: (redirectUri: string) => void;
  backToApp: () => Promise<void>;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider(props: PropsWithChildren): JSX.Element {
  const [redirectUri, setRedirectUri] = useState<string>();

  async function backToApp(): Promise<void> {
    openAppPage('home');
  }

  async function openAppPage(page: string): Promise<void> {
    const win: Window = window;
    win.location = `${redirectUri}://${page}`;
  }

  const context = { setRedirectUri, backToApp };

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
