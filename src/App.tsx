import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomeScreen } from './screens/home.screen';
import { DfxContextProvider } from './api/contexts/dfx.context';
import { LanguageContextProvider } from './contexts/language.context';
import { setupLanguages } from './translations';
import { ErrorScreen } from './screens/error.screen';
import { BankAccountsScreen } from './screens/bank-accounts.screen';
import { BuyScreen } from './screens/buy.screen';

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
    path: '/bank-accounts',
    element: <BankAccountsScreen />,
  },
]);

function App() {
  return (
    <DfxContextProvider>
      <LanguageContextProvider>
        <RouterProvider router={router} />
      </LanguageContextProvider>
    </DfxContextProvider>
  );
}

export default App;
