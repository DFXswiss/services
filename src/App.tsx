import { Main } from './components/main';
import { AssetContextProvider } from './api/contexts/asset.context';
import { WalletContextProvider } from './contexts/wallet.context';
import { AuthContextProvider } from './api/contexts/auth.context';
import { UserContextProvider } from './api/contexts/user.context';
import { SessionContextProvider } from './contexts/session.context';
import { BuyContextProvider } from './api/contexts/buy.context';

function App() {
  return (
    <AuthContextProvider>
      <UserContextProvider>
        <WalletContextProvider>
          <SessionContextProvider>
            <AssetContextProvider>
              <BuyContextProvider>
                <Main />
              </BuyContextProvider>
            </AssetContextProvider>
          </SessionContextProvider>
        </WalletContextProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}

export default App;
