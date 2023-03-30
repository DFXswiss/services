import jwtDecode from 'jwt-decode';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { useStore } from '../../hooks/store.hook';
import { Jwt } from '../definitions/jwt';

interface AuthInterface {
  authenticationToken?: string;
  setAuthenticationToken: (authenticationToken?: string) => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthInterface>(undefined as any);

export function useAuthContext(): AuthInterface {
  return useContext(AuthContext);
}

export function AuthContextProvider(props: PropsWithChildren): JSX.Element {
  const [token, setToken] = useState<string>();
  const { authenticationToken } = useStore();

  const tokenWithFallback = token ?? authenticationToken.get();
  const isLoggedIn = tokenWithFallback != undefined && !isExpired();

  useEffect(() => {
    setToken(authenticationToken.get());
  }, []);

  function isExpired(): boolean {
    if (!tokenWithFallback) return true;
    const jwt = jwtDecode<Jwt>(tokenWithFallback);
    return jwt?.exp != null && Date.now() > new Date(jwt?.exp * 1000).getTime();
  }

  function setAuthenticationToken(token?: string) {
    token ? authenticationToken.set(token) : authenticationToken.remove();
    setToken(token);
  }

  const context: AuthInterface = {
    authenticationToken: tokenWithFallback,
    setAuthenticationToken,
    isLoggedIn,
  };

  return <AuthContext.Provider value={context}>{props.children}</AuthContext.Provider>;
}
