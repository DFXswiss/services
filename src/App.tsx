import { DfxContextProvider } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Router } from '@remix-run/router';
import { Suspense, lazy } from 'react';
import { RouteObject, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout';
import { AppHandlingContextProvider, AppParams, CloseMessageData } from './contexts/app-handling.context';
import { BalanceContextProvider } from './contexts/balance.context';
import { SettingsContextProvider } from './contexts/settings.context';
import { WalletContextProvider } from './contexts/wallet.context';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyInfoScreen } from './screens/buy-info.screen';
import { BuySuccessScreen } from './screens/buy-success.screen';
import { BuyScreen } from './screens/buy.screen';
import { ErrorScreen } from './screens/error.screen';
import { HomeScreen } from './screens/home.screen';
import { KycRedirectScreen } from './screens/kyc-redirect.screen';
import { KycScreen } from './screens/kyc.screen';
import { SellInfoScreen } from './screens/sell-info.screen';
import { TfaScreen } from './screens/tfa.screen';
import { setupLanguages } from './translations';

const SellScreen = lazy(() => import('./screens/sell.screen'));

setupLanguages();

const routes = [
  {
    path: '/',
    element: <HomeScreen />,
    errorElement: <ErrorScreen />,
  },
  {
    path: '/login',
    element: <HomeScreen />,
    errorElement: <ErrorScreen />,
  },
  {
    path: '/my-dfx',
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
    path: '/buy/success',
    element: <BuySuccessScreen />,
  },
  {
    path: '/sell',
    element: withSuspense(<SellScreen />),
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
    path: '/kyc',
    element: <KycScreen />,
  },
  {
    path: '/kyc/redirect',
    element: <KycRedirectScreen />,
  },
  {
    path: '/profile',
    element: <KycScreen />,
  },
  {
    path: '/2fa',
    element: <TfaScreen />,
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
    <DfxContextProvider api={{}} data={{}}>
      <BalanceContextProvider>
        <AppHandlingContextProvider
          isWidget={params != null}
          closeCallback={params?.onClose}
          params={params}
          router={router}
        >
          <SettingsContextProvider>
            <WalletContextProvider router={router}>
              <RouterProvider router={router} />
            </WalletContextProvider>
          </SettingsContextProvider>
        </AppHandlingContextProvider>
      </BalanceContextProvider>
    </DfxContextProvider>
  );
}

function withSuspense(WrappedComponent: JSX.Element): JSX.Element {
  return <Suspense fallback={<SuspenseFallback />}>{WrappedComponent}</Suspense>;
}

function SuspenseFallback(): JSX.Element {
  return (
    <Layout>
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </Layout>
  );
}

export default App;
