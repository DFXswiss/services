import { PropsWithChildren, createContext, useContext, useState } from 'react';

interface AppHandlingContextInterface {
  setAppIdentifier: (appIdentifier: string) => void;
  backToApp: () => Promise<void>;
}

const AppHandlingContext = createContext<AppHandlingContextInterface>(undefined as any);

export function useAppHandlingContext(): AppHandlingContextInterface {
  return useContext(AppHandlingContext);
}

export function AppHandlingContextProvider(props: PropsWithChildren): JSX.Element {
  const [appIdentifier, setAppIdentifier] = useState<string>();

  async function backToApp(): Promise<void> {
    openAppPage('home');
  }

  async function openAppPage(page: string): Promise<void> {
    const win: Window = window;
    win.location = `${appIdentifier}://${page}`;
  }

  const context = { setAppIdentifier, backToApp };

  return <AppHandlingContext.Provider value={context}>{props.children}</AppHandlingContext.Provider>;
}
