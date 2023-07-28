import { DfxContextProvider } from '@dfx.swiss/react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppHandlingContextProvider } from './contexts/app-handling.context';
import { BalanceContextProvider } from './contexts/balance.context';
import { ParamContextProvider } from './contexts/param.context';
import { SettingsContextProvider } from './contexts/settings.context';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyInfoScreen } from './screens/buy-info.screen';
import { BuyScreen } from './screens/buy.screen';
import { ErrorScreen } from './screens/error.screen';
import { HomeScreen } from './screens/home.screen';
import { ProfileScreen } from './screens/profile.screen';
import { SellScreen } from './screens/sell.screen';
import { setupLanguages } from './translations';

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
    path: '/buy/info',
    element: <BuyInfoScreen />,
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
          <SettingsContextProvider>
            <ParamContextProvider>
              <RouterProvider router={router} />
            </ParamContextProvider>
          </SettingsContextProvider>
        </DfxContextProvider>
      </BalanceContextProvider>
    </AppHandlingContextProvider>
  );
}

export default App;
