import { PropsWithChildren } from 'react';
import { AssetContextProvider } from './asset.context';
import { AuthContextProvider } from './auth.context';
import { BuyContextProvider } from './buy.context';
import { SessionContextProvider } from './session.context';
import { UserContextProvider } from './user.context';

export function DfxContextProvider(props: PropsWithChildren): JSX.Element {
  return (
    <AuthContextProvider>
      <UserContextProvider>
        <SessionContextProvider>
          <AssetContextProvider>
            <BuyContextProvider>{props.children}</BuyContextProvider>
          </AssetContextProvider>
        </SessionContextProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}
