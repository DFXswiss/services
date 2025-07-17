import { DfxContextProvider, PaymentRoutesContextProvider, SupportChatContextProvider } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Router } from '@remix-run/router';
import { Suspense, lazy } from 'react';
import { Navigate, Outlet, RouteObject, RouterProvider } from 'react-router-dom';
import { LayoutWrapper } from './components/layout-wrapper';
import { AppHandlingContextProvider, AppParams, CloseMessageData } from './contexts/app-handling.context';
import { BalanceContextProvider } from './contexts/balance.context';
import { OrderUIContextProvider } from './contexts/order-ui.context';
import PaymentLinkPosContext from './contexts/payment-link-pos.context';
import { PaymentLinkProvider } from './contexts/payment-link.context';
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
const BuyFailureScreen = lazy(() => import('./screens/buy-failure.screen'));
const BuyInfoScreen = lazy(() => import('./screens/buy-info.screen'));
const BuySuccessScreen = lazy(() => import('./screens/buy-success.screen'));
const BuyScreen = lazy(() => import('./screens/buy.screen'));
const KycRedirectScreen = lazy(() => import('./screens/kyc-redirect.screen'));
const KycFileScreen = lazy(() => import('./screens/kyc-file.screen'));
const DownloadScreen = lazy(() => import('./screens/download.screen'));
const KycScreen = lazy(() => import('./screens/kyc.screen'));
const KycLogScreen = lazy(() => import('./screens/kyc-log.screen'));
const LinkScreen = lazy(() => import('./screens/link.screen'));
const PaymentRoutesScreen = lazy(() => import('./screens/payment-routes.screen'));
const PaymentLinkScreen = lazy(() => import('./screens/payment-link.screen'));
const PaymentLinkPosScreen = lazy(() => import('./screens/payment-link-pos.screen'));
const InvoiceScreen = lazy(() => import('./screens/invoice.screen'));
const SellInfoScreen = lazy(() => import('./screens/sell-info.screen'));
const SupportIssueScreen = lazy(() => import('./screens/support-issue.screen'));
const SupportTicketsScreen = lazy(() => import('./screens/support-tickets.screen'));
const SupportScreen = lazy(() => import('./screens/support.screen'));
const ChatScreen = lazy(() => import('./screens/chat.screen'));
const TfaScreen = lazy(() => import('./screens/tfa.screen'));
const TransactionScreen = lazy(() => import('./screens/transaction.screen'));
const AccountMerge = lazy(() => import('./screens/account-merge.screen'));
const MailLoginScreen = lazy(() => import('./screens/mail-login.screen'));
const SepaScreen = lazy(() => import('./screens/sepa.screen'));
const StickersScreen = lazy(() => import('./screens/stickers.screen'));
const BlockchainTransactionScreen = lazy(() => import('./screens/blockchain-tx.screen'));
const EditMailScreen = lazy(() => import('./screens/edit-mail.screen'));
const SafeScreen = lazy(() => import('./screens/safe.screen'));

setupLanguages();

export const Routes = [
  {
    path: '/',
    element: (
      <LayoutWrapper>
        <Outlet />
      </LayoutWrapper>
    ),
    errorElement: (
      <LayoutWrapper>
        <ErrorScreen />
      </LayoutWrapper>
    ),
    children: [
      {
        index: true,
        element: <HomeScreen />,
      },
      {
        path: 'account',
        element: withSuspense(<AccountScreen />),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsScreen />),
      },
      {
        path: 'settings/mail',
        element: withSuspense(<EditMailScreen />),
      },
      {
        path: 'login',
        element: <HomeScreen />,
      },
      {
        path: 'mail-login',
        element: withSuspense(<MailLoginScreen />),
      },
      {
        path: 'connect',
        element: <HomeScreen />,
      },
      {
        path: 'my-dfx',
        element: <HomeScreen />,
      },
      {
        path: 'buy',
        element: withSuspense(<BuyScreen />),
      },
      {
        path: 'buy/info',
        element: withSuspense(<BuyInfoScreen />),
      },
      {
        path: 'buy/success',
        element: withSuspense(<BuySuccessScreen />),
      },
      {
        path: 'buy/failure',
        element: withSuspense(<BuyFailureScreen />),
      },
      {
        path: 'sell',
        element: withSuspense(<SellScreen />),
      },
      {
        path: 'sell/info',
        element: withSuspense(<SellInfoScreen />),
      },
      {
        path: 'swap',
        element: withSuspense(<SwapScreen />),
      },
      {
        path: 'routes',
        element: withSuspense(
          <PaymentRoutesContextProvider>
            <PaymentRoutesScreen />
          </PaymentRoutesContextProvider>,
        ),
      },
      {
        path: 'pl',
        children: [
          {
            index: true,
            element: withSuspense(
              <PaymentLinkProvider>
                <PaymentLinkScreen />
              </PaymentLinkProvider>,
            ),
          },
          {
            path: 'pos',
            element: withSuspense(
              <PaymentLinkPosContext>
                <PaymentLinkPosScreen />
              </PaymentLinkPosContext>,
            ),
          },
        ],
      },
      {
        path: 'payment-link',
        element: <Navigate to={`/pl${window.location.search}`} />,
      },
      {
        path: 'invoice',
        element: withSuspense(<InvoiceScreen />),
      },
      {
        path: 'kyc',
        element: withSuspense(<KycScreen />),
        isKycScreen: true,
      },
      {
        path: 'kyc/redirect',
        element: withSuspense(<KycRedirectScreen />),
        isKycScreen: true,
      },
      {
        path: 'profile',
        element: withSuspense(<KycScreen />),
        isKycScreen: true,
      },
      {
        path: 'contact',
        element: withSuspense(<KycScreen />),
        isKycScreen: true,
      },
      {
        path: 'link',
        element: withSuspense(<LinkScreen />),
        isKycScreen: true,
      },
      {
        path: '2fa',
        element: withSuspense(<TfaScreen />),
        isKycScreen: true,
      },
      {
        path: 'file/download',
        element: withSuspense(<DownloadScreen />),
      },
      {
        path: 'file/:id',
        element: withSuspense(<KycFileScreen />),
      },
      {
        path: 'kyc/log',
        element: withSuspense(<KycLogScreen />),
      },
      {
        path: 'tx',
        element: withSuspense(<TransactionScreen />),
      },
      {
        path: 'tx/:id',
        element: withSuspense(<TransactionScreen />),
      },
      {
        path: 'tx/:id/assign',
        element: withSuspense(<TransactionScreen />),
      },
      {
        path: 'tx/:id/refund',
        element: withSuspense(<TransactionScreen />),
      },
      {
        path: 'support',
        element: withSuspense(<SupportScreen />),
      },
      {
        path: 'support',
        element: (
          <SupportChatContextProvider>
            <Outlet />
          </SupportChatContextProvider>
        ),
        children: [
          {
            path: 'tickets',
            element: withSuspense(<SupportTicketsScreen />),
          },
          {
            path: 'issue',
            element: withSuspense(<SupportIssueScreen />),
          },
          {
            path: 'chat',
            element: withSuspense(<ChatScreen />),
          },
          {
            path: 'chat/:id',
            element: withSuspense(<ChatScreen />),
          },
        ],
      },
      {
        path: 'account-merge',
        element: withSuspense(<AccountMerge />),
      },
      {
        path: 'sepa',
        element: withSuspense(<SepaScreen />),
      },
      {
        path: 'stickers',
        element: withSuspense(<StickersScreen />),
      },
      {
        path: 'blockchain/tx',
        element: withSuspense(<BlockchainTransactionScreen />),
      },
      {
        path: 'safe',
        element: withSuspense(<SafeScreen />),
      },
    ],
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
          <OrderUIContextProvider>
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
          </OrderUIContextProvider>
        </BalanceContextProvider>
      </DfxContextProvider>
    </WindowContextProvider>
  );
}

function withSuspense(WrappedComponent: JSX.Element): JSX.Element {
  return <Suspense fallback={<SuspenseFallback />}>{WrappedComponent}</Suspense>;
}

function SuspenseFallback(): JSX.Element {
  return <StyledLoadingSpinner size={SpinnerSize.LG} />;
}

export default App;
