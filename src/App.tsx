import { DfxContextProvider } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Router } from '@remix-run/router';
import { Suspense, lazy, useState } from 'react';
import { RouteObject, RouterProvider } from 'react-router-dom';
import { Layout } from './components/layout';
import { AppHandlingContextProvider, AppParams, CloseMessageData } from './contexts/app-handling.context';
import { BalanceContextProvider } from './contexts/balance.context';
import { SettingsContextProvider } from './contexts/settings.context';
import { WalletContextProvider } from './contexts/wallet.context';
import { useResizeObserver } from './hooks/resize-observer.hook';
import { AccountScreen } from './screens/account.screen';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyFailureScreen } from './screens/buy-failure.screen';
import { BuyInfoScreen } from './screens/buy-info.screen';
import { BuySuccessScreen } from './screens/buy-success.screen';
import { BuyScreen } from './screens/buy.screen';
import { ErrorScreen } from './screens/error.screen';
import { HomeScreen } from './screens/home.screen';
import { KycRedirectScreen } from './screens/kyc-redirect.screen';
import { KycScreen } from './screens/kyc.screen';
import { LimitScreen } from './screens/limit.screen';
import { LinkScreen } from './screens/link.screen';
import { SellInfoScreen } from './screens/sell-info.screen';
import { SettingsScreen } from './screens/settings.screen';
import { SupportIssueScreen } from './screens/support-issue.screen';
import { SupportScreen } from './screens/support.screen';
import { TfaScreen } from './screens/tfa.screen';
import { TransactionMissingScreen } from './screens/transaction-missing.screen';
import { TransactionScreen } from './screens/transaction.screen';
import { setupLanguages } from './translations';

const SellScreen = lazy(() => import('./screens/sell.screen'));
const SwapScreen = lazy(() => import('./screens/swap.screen'));

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
    path: 'settings',
    element: <SettingsScreen />,
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
  const [width, setWidth] = useState<number>();

  const rootRef = useResizeObserver<HTMLDivElement>((el) => setWidth(el.offsetWidth));

  const home = params?.service && `/${params.service}`;
  if (home) router.navigate(home);

  return (
    <div ref={rootRef} className="h-full w-full">
      <DfxContextProvider api={{}} data={{}} includePrivateAssets={true}>
        <BalanceContextProvider>
          <AppHandlingContextProvider
            isWidget={params != null}
            service={params?.service}
            closeCallback={params?.onClose}
            params={params}
            router={router}
            width={width}
          >
            <SettingsContextProvider>
              <WalletContextProvider router={router}>
                <RouterProvider router={router} />
              </WalletContextProvider>
            </SettingsContextProvider>
          </AppHandlingContextProvider>
        </BalanceContextProvider>
      </DfxContextProvider>
    </div>
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
