import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomeScreen } from './screens/home.screen';
import { LanguageContextProvider } from './contexts/language.context';
import { setupLanguages } from './translations';
import { ErrorScreen } from './screens/error.screen';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyScreen } from './screens/buy.screen';
import { BuyPaymentScreen } from './screens/buy/payment.screen';
import { AppHandlingContextProvider } from './contexts/app-handling.context';
import { ProfileScreen } from './screens/profile.screen';
import { SellScreen } from './screens/sell.screen';
import { BalanceContextProvider } from './contexts/balance.context';
import { DfxContextProvider } from '@dfx.swiss/react';

setupLanguages();

const router = createBrowserRouter([
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
    path: '/buy/payment',
    element: <BuyPaymentScreen />,
  },
  {
    path: '/sell',
    element: <SellScreen />,
  },
  {
    path: '/bank-accounts',
    element: <BankAccountsScreen />,
  },
  {
    path: '/profile',
    element: <ProfileScreen />,
  },
]);

function App() {
  return (
    <AppHandlingContextProvider>
      <BalanceContextProvider>
        <DfxContextProvider api={{}} data={{}}>
          <LanguageContextProvider>
            <RouterProvider router={router} />
          </LanguageContextProvider>
        </DfxContextProvider>
      </BalanceContextProvider>
    </AppHandlingContextProvider>
  );
}

export default App;
