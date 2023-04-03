import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './screens/home';
import { DfxContextProvider } from './api/contexts/dfx.context';
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
    <DfxContextProvider>
      <LanguageContextProvider>
        <RouterProvider router={router} />
      </LanguageContextProvider>
    </DfxContextProvider>
  );
}

export default App;
