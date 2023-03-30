import { Home } from './pages/home';
import { AssetContextProvider } from './api/contexts/asset.context';
import { AuthContextProvider } from './api/contexts/auth.context';
import { UserContextProvider } from './api/contexts/user.context';
import { SessionContextProvider } from './contexts/session.context';
import { BuyContextProvider } from './api/contexts/buy.context';
import { LanguageContextProvider } from './contexts/language.context';
import { setupLanguages } from './translations';

setupLanguages();

function App() {
  return (
    <AuthContextProvider>
      <UserContextProvider>
        <SessionContextProvider>
          <AssetContextProvider>
            <BuyContextProvider>
              <LanguageContextProvider>
                <Home />
              </LanguageContextProvider>
            </BuyContextProvider>
          </AssetContextProvider>
        </SessionContextProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}

export default App;
