import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './screens/home';
import { AssetContextProvider } from './api/contexts/asset.context';
import { AuthContextProvider } from './api/contexts/auth.context';
import { UserContextProvider } from './api/contexts/user.context';
import { SessionContextProvider } from './contexts/session.context';
import { BuyContextProvider } from './api/contexts/buy.context';
import { LanguageContextProvider } from './contexts/language.context';
import { setupLanguages } from './translations';
import { ErrorScreen } from './screens/error-screen';
import { BankAccounts } from './screens/bank-accounts';

setupLanguages();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <ErrorScreen />,
  },
  {
    path: '/bank-accounts',
    element: <BankAccounts />,
  },
]);

function App() {
  return (
    <AuthContextProvider>
      <UserContextProvider>
        <SessionContextProvider>
          <AssetContextProvider>
            <BuyContextProvider>
              <LanguageContextProvider>
                <RouterProvider router={router} />
              </LanguageContextProvider>
            </BuyContextProvider>
          </AssetContextProvider>
        </SessionContextProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}

export default App;
