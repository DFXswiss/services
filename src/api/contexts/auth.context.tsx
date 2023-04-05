import jwtDecode from 'jwt-decode';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../../hooks/store.hook';
import { Jwt } from '../definitions/jwt';
import { Utils } from '../../utils';

interface AuthInterface {
  authenticationToken?: string;
  jwt?: Jwt;
  setAuthenticationToken: (authenticationToken?: string) => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthInterface>(undefined as any);

export function useAuthContext(): AuthInterface {
  return useContext(AuthContext);
}

export function AuthContextProvider(props: PropsWithChildren): JSX.Element {
  const [token, setToken] = useState<string>();
  const [jwt, setJwt] = useState<Jwt>();
  const { authenticationToken } = useStore();

  const tokenWithFallback = token ?? authenticationToken.get();
  const isLoggedIn = tokenWithFallback != undefined && !isExpired();

  useEffect(() => {
    if (!token) setAuthenticationToken(authenticationToken.get());
  }, []);

  function isExpired(): boolean {
    if (!tokenWithFallback) return true;
    try {
      const decoded = jwt ?? jwtDecode<Jwt>(tokenWithFallback);
      return decoded?.exp != null && Date.now() > new Date(decoded?.exp * 1000).getTime();
    } catch {
      authenticationToken.remove();
      setToken(undefined);
      setJwt(undefined);
      return true;
    }
  }

  function setAuthenticationToken(token?: string) {
    token ? authenticationToken.set(token) : authenticationToken.remove();
    setToken(token);
    if (token && Utils.isJwt(token)) {
      setJwt(jwtDecode<Jwt>(token));
    } else {
      setJwt(undefined);
    }
  }

  const context: AuthInterface = useMemo(
    () => ({
      authenticationToken: tokenWithFallback,
      jwt,
      setAuthenticationToken,
      isLoggedIn,
    }),
    [tokenWithFallback, token, jwt, setAuthenticationToken, authenticationToken, isLoggedIn],
  );

  return <AuthContext.Provider value={context}>{props.children}</AuthContext.Provider>;
}
