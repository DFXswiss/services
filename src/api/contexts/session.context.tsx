import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Blockchain } from '../definitions/blockchain';
import { ApiError } from '../definitions/error';
import { useApiSession } from '../hooks/api-session.hook';
import { useAuthContext } from './auth.context';

export interface SessionInterface {
  address?: string;
  blockchain?: Blockchain;
  availableBlockchains?: Blockchain[];
  isLoggedIn: boolean;
  needsSignUp: boolean;
  isProcessing: boolean;
  login: () => Promise<void>;
  signUp: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionInterface>(undefined as any);

export function useSessionContext(): SessionInterface {
  return useContext(SessionContext);
}

export interface SessionContextProviderProps extends PropsWithChildren {
  api: {
    signMessage?: (message: string, address: string) => Promise<string>;
  };
  data: {
    address?: string;
    blockchain?: Blockchain;
  };
}

export function SessionContextProvider({ api, data, children }: SessionContextProviderProps): JSX.Element {
  const { session } = useAuthContext();
  const { isLoggedIn, getSignMessage, createSession, deleteSession } = useApiSession();
  const [needsSignUp, setNeedsSignUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signature, setSignature] = useState<string>();

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (data.address) {
      createApiSession(data.address);
    } else {
      deleteSession();
    }
  }, [data.address]);

  async function login(): Promise<void> {
    // if (!isConnected) {
    //   await connect();
    // }
    if (!data.address) return; // TODO: (Krysh) add real error handling
    createApiSession(data.address);
  }

  async function createApiSession(address: string): Promise<void> {
    if (isLoggedIn || !api.signMessage) return;
    const message = await getSignMessage(address);
    const signature = await api.signMessage(message, address);
    setIsProcessing(true);
    return createSession(address, signature, false)
      .catch((error: ApiError) => {
        if (error.statusCode === 404) {
          setSignature(signature);
          setNeedsSignUp(true);
        }
      })
      .finally(() => setIsProcessing(false));
  }

  async function signUp(): Promise<void> {
    if (!data.address || !signature) return; // TODO: (Krysh) add real error handling
    setIsProcessing(true);
    return createSession(data.address, signature, true).finally(() => {
      setSignature(undefined);
      setNeedsSignUp(false);
      setIsProcessing(false);
    });
  }

  async function logout(): Promise<void> {
    await deleteSession();
  }

  const context = useMemo(
    () => ({
      address: data.address,
      blockchain: data.blockchain,
      availableBlockchains: session?.blockchains,
      isLoggedIn,
      needsSignUp,
      isProcessing,
      login,
      signUp,
      logout,
    }),
    [data.address, data.blockchain, session, isLoggedIn, needsSignUp, isProcessing, login, signUp, logout],
  );

  return <SessionContext.Provider value={context}>{children}</SessionContext.Provider>;
}
