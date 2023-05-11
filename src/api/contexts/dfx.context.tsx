import { PropsWithChildren } from 'react';
import { AssetContextProvider } from './asset.context';
import { AuthContextProvider } from './auth.context';
import { BuyContextProvider } from './buy.context';
import { SessionContextProvider, SessionContextProviderProps } from './session.context';
import { UserContextProvider } from './user.context';

type DfxContextProviderProps = SessionContextProviderProps & PropsWithChildren;

export function DfxContextProvider(props: DfxContextProviderProps): JSX.Element {
  return (
    <AuthContextProvider>
      <SessionContextProvider api={props.api} data={props.data}>
        <UserContextProvider>
          <AssetContextProvider>
            <BuyContextProvider>{props.children}</BuyContextProvider>
          </AssetContextProvider>
        </UserContextProvider>
      </SessionContextProvider>
    </AuthContextProvider>
  );
}
