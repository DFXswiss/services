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
import { setupLanguages } from './translations';

const SellScreen = lazy(() => import('./screens/sell.screen'));
const SwapScreen = lazy(() => import('./screens/swap.screen'));
const AccountScreen = lazy(() => import('./screens/account.screen'));
const BankAccountsScreen = lazy(() => import('./screens/bank-accounts.screen'));
const BuyFailureScreen = lazy(() => import('./screens/buy-failure.screen'));
const BuyInfoScreen = lazy(() => import('./screens/buy-info.screen'));
const BuySuccessScreen = lazy(() => import('./screens/buy-success.screen'));
const BuyScreen = lazy(() => import('./screens/buy.screen'));
const ErrorScreen = lazy(() => import('./screens/error.screen'));
const HomeScreen = lazy(() => import('./screens/home.screen'));
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
    element: <AccountScreen />,
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
    path: '/buy/failure',
    element: <BuyFailureScreen />,
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
    path: '/swap',
    element: withSuspense(<SwapScreen />),
  },
  {
    path: '/routes',
    element: <PaymentRoutes />,
  },
  {
    path: '/kyc',
    element: <KycScreen />,
    isKycScreen: true,
  },
  {
    path: '/kyc/redirect',
    element: <KycRedirectScreen />,
    isKycScreen: true,
  },
  {
    path: '/profile',
    element: <KycScreen />,
    isKycScreen: true,
  },
  {
    path: '/contact',
    element: <KycScreen />,
    isKycScreen: true,
  },
  {
    path: '/link',
    element: <LinkScreen />,
    isKycScreen: true,
  },
  {
    path: '/2fa',
    element: <TfaScreen />,
    isKycScreen: true,
  },
  {
    path: '/limit',
    element: <LimitScreen />,
    isKycScreen: true,
  },
  {
    path: '/tx',
    element: <TransactionScreen />,
  },
  {
    path: '/tx/:id',
    element: <TransactionScreen />,
  },
  {
    path: '/tx/:id/assign',
    element: <TransactionScreen />,
  },
  {
    path: '/support',
    element: <SupportScreen />,
  },
  {
    path: '/support/issue',
    element: <SupportIssueScreen />,
  },
  {
    path: '/support/issue/tx',
    element: <TransactionScreen />,
  },
  {
    path: '/support/issue/tx-missing',
    element: <TransactionMissingScreen />,
  },
  {
    path: '/support/issue/tx/:id',
    element: <SupportIssueScreen />,
  },
  {
    path: '/bank-accounts',
    element: <BankAccountsScreen />,
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
