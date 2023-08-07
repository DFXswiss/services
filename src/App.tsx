import { DfxContextProvider } from '@dfx.swiss/react';
import { Router } from '@remix-run/router';
import { RouteObject, RouterProvider } from 'react-router-dom';
import { AppHandlingContextProvider, CloseMessageData } from './contexts/app-handling.context';
import { BalanceContextProvider } from './contexts/balance.context';
import { AppParams, ParamContextProvider } from './contexts/param.context';
import { SettingsContextProvider } from './contexts/settings.context';
import { WalletContextProvider } from './contexts/wallet.context';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyInfoScreen } from './screens/buy-info.screen';
import { BuyScreen } from './screens/buy.screen';
import { ErrorScreen } from './screens/error.screen';
import { HomeScreen } from './screens/home.screen';
import { ProfileScreen } from './screens/profile.screen';
import { SellInfoScreen } from './screens/sell-info.screen';
import { SellScreen } from './screens/sell.screen';
import { setupLanguages } from './translations';

setupLanguages();

const routes = [
  {
    path: '/',
    element: <HomeScreen />,
    errorElement: <ErrorScreen />,
  },
  {
    path: '/buy',
    element: <BuyScreen />,
  },
  {
    path: '/buy/info',
    element: <BuyInfoScreen />,
  },
  {
    path: '/sell',
    element: <SellScreen />,
  },
  {
    path: '/sell/info',
    element: <SellInfoScreen />,
  },
  {
    path: '/bank-accounts',
    element: <BankAccountsScreen />,
  },
  {
    path: '/profile',
    element: <ProfileScreen />,
  },
];

export enum Service {
  BUY = 'buy',
  SELL = 'sell',
}

export interface WidgetParams extends AppParams {
  service?: Service;
  onClose?: (data: CloseMessageData) => void;
}

interface AppProps {
  routerFactory: (routes: RouteObject[]) => Router;
  params?: WidgetParams;
}

function App({ routerFactory, params }: AppProps) {
  const router = routerFactory(routes);

  const home = params?.service && `/${params.service}`;
  if (home) router.navigate(home);

  return (
    <AppHandlingContextProvider home={home} isWidget={params != null} closeCallback={params?.onClose}>
      <DfxContextProvider api={{}} data={{}}>
        <BalanceContextProvider>
          <SettingsContextProvider>
            <ParamContextProvider params={params}>
              <WalletContextProvider>
                <RouterProvider router={router} />
              </WalletContextProvider>
            </ParamContextProvider>
          </SettingsContextProvider>
        </BalanceContextProvider>
      </DfxContextProvider>
    </AppHandlingContextProvider>
  );
}

export default App;
