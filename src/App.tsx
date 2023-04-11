import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomeScreen } from './screens/home.screen';
import { DfxContextProvider } from './api/contexts/dfx.context';
import { LanguageContextProvider } from './contexts/language.context';
import { setupLanguages } from './translations';
import { ErrorScreen } from './screens/error.screen';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyScreen } from './screens/buy.screen';
import { BuyPaymentScreen } from './screens/buy/payment.screen';
import { AppHandlingContextProvider } from './contexts/app-handling.context';

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
    path: '/bank-accounts',
    element: <BankAccountsScreen />,
  },
]);

function App() {
  return (
    <AppHandlingContextProvider>
      <DfxContextProvider api={{ signMessage: undefined }} data={{ address: undefined, blockchain: undefined }}>
        <LanguageContextProvider>
          <RouterProvider router={router} />
        </LanguageContextProvider>
      </DfxContextProvider>
    </AppHandlingContextProvider>
  );
}

export default App;
