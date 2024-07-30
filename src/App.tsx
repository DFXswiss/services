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
import { WindowContextProvider } from './contexts/window.context';
import ErrorScreen from './screens/error.screen';
import HomeScreen from './screens/home.screen';
import { setupLanguages } from './translations';

const SellScreen = lazy(() => import('./screens/sell.screen'));
const SwapScreen = lazy(() => import('./screens/swap.screen'));
const AccountScreen = lazy(() => import('./screens/account.screen'));
const SettingsScreen = lazy(() => import('./screens/settings.screen'));
const BankAccountsScreen = lazy(() => import('./screens/bank-accounts.screen'));
const BuyFailureScreen = lazy(() => import('./screens/buy-failure.screen'));
const BuyInfoScreen = lazy(() => import('./screens/buy-info.screen'));
const BuySuccessScreen = lazy(() => import('./screens/buy-success.screen'));
const BuyScreen = lazy(() => import('./screens/buy.screen'));
const KycRedirectScreen = lazy(() => import('./screens/kyc-redirect.screen'));
const KycScreen = lazy(() => import('./screens/kyc.screen'));
const LimitScreen = lazy(() => import('./screens/limit.screen'));
const LinkScreen = lazy(() => import('./screens/link.screen'));
const PaymentRoutes = lazy(() => import('./screens/payment-routes.screen'));
const SellInfoScreen = lazy(() => import('./screens/sell-info.screen'));
const SupportIssueScreen = lazy(() => import('./screens/support-issue.screen'));
const SupportScreen = lazy(() => import('./screens/support.screen'));
const TfaScreen = lazy(() => import('./screens/tfa.screen'));
const TransactionMissingScreen = lazy(() => import('./screens/transaction-missing.screen'));
const TransactionScreen = lazy(() => import('./screens/transaction.screen'));

setupLanguages();

export const Routes = [
  {
    path: '/',
    element: <HomeScreen />,
    errorElement: <ErrorScreen />,
  },
  {
    path: '/account',
    element: withSuspense(<AccountScreen />),
  },
  {
    path: 'settings',
    element: withSuspense(<SettingsScreen />),
  },
  {
    path: '/login',
    element: <HomeScreen />,
  },
  {
    path: '/connect',
    element: <HomeScreen />,
  },
  {
    path: '/my-dfx',
    element: <HomeScreen />,
  },
  {
    path: '/buy',
    element: withSuspense(<BuyScreen />),
  },
  {
    path: '/buy/info',
    element: withSuspense(<BuyInfoScreen />),
  },
  {
    path: '/buy/success',
    element: withSuspense(<BuySuccessScreen />),
  },
  {
    path: '/buy/failure',
    element: withSuspense(<BuyFailureScreen />),
  },
  {
    path: '/sell',
    element: withSuspense(<SellScreen />),
  },
  {
    path: '/sell/info',
    element: withSuspense(<SellInfoScreen />),
  },
  {
    path: '/swap',
    element: withSuspense(<SwapScreen />),
  },
  {
    path: '/routes',
    element: withSuspense(<PaymentRoutes />),
  },
  {
    path: '/kyc',
    element: withSuspense(<KycScreen />),
    isKycScreen: true,
  },
  {
    path: '/kyc/redirect',
    element: withSuspense(<KycRedirectScreen />),
    isKycScreen: true,
  },
  {
    path: '/profile',
    element: withSuspense(<KycScreen />),
    isKycScreen: true,
  },
  {
    path: '/contact',
    element: withSuspense(<KycScreen />),
    isKycScreen: true,
  },
  {
    path: '/link',
    element: withSuspense(<LinkScreen />),
    isKycScreen: true,
  },
  {
    path: '/2fa',
    element: withSuspense(<TfaScreen />),
    isKycScreen: true,
  },
  {
    path: '/limit',
    element: withSuspense(<LimitScreen />),
    isKycScreen: true,
  },
  {
    path: '/tx',
    element: withSuspense(<TransactionScreen />),
  },
  {
    path: '/tx/:id',
    element: withSuspense(<TransactionScreen />),
  },
  {
    path: '/tx/:id/assign',
    element: withSuspense(<TransactionScreen />),
  },
  {
    path: '/support',
    element: withSuspense(<SupportScreen />),
  },
  {
    path: '/support/issue',
    element: withSuspense(<SupportIssueScreen />),
  },
  {
    path: '/support/issue/tx',
    element: withSuspense(<TransactionScreen />),
  },
  {
    path: '/support/issue/tx-missing',
    element: withSuspense(<TransactionMissingScreen />),
  },
  {
    path: '/support/issue/tx/:id',
    element: withSuspense(<SupportIssueScreen />),
  },
  {
    path: '/bank-accounts',
    element: withSuspense(<BankAccountsScreen />),
  },
];

export enum Service {
  BUY = 'buy',
  SELL = 'sell',
  SWAP = 'swap',
  CONNECT = 'connect',
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
  const router = routerFactory(Routes);

  const home = params?.service && `/${params.service}`;
  if (home) router.navigate(home);

  return (
    <WindowContextProvider>
      <DfxContextProvider api={{}} data={{}} includePrivateAssets={true}>
        <BalanceContextProvider>
          <AppHandlingContextProvider
            isWidget={params != null}
            service={params?.service}
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
    </WindowContextProvider>
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
