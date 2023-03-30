import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { Blockchain } from '../api/definitions/blockchain';
import { ApiError } from '../api/definitions/error';
import { useApiSession } from '../api/hooks/api-session.hook';
import { useWalletContext } from './wallet.context';

export interface SessionInterface {
  isMetaMaskInstalled: boolean;
  address?: string;
  blockchain?: Blockchain;
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

export function SessionContextProvider(props: PropsWithChildren): JSX.Element {
  const { isLoggedIn, getSignMessage, createSession, deleteSession } = useApiSession();
  const { isInstalled, isConnected, address, blockchain, connect, signMessage } = useWalletContext();
  const [needsSignUp, setNeedsSignUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signature, setSignature] = useState<string>();

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (address) {
      createApiSession(address);
    } else {
      deleteSession();
    }
  }, [address]);

  async function login(): Promise<void> {
    if (!isConnected) {
      await connect();
    }
    if (!address) return; // TODO (Krysh) add real error handling
    createApiSession(address);
  }

  async function createApiSession(address: string): Promise<void> {
    if (isLoggedIn) return;
    const message = await getSignMessage(address);
    const signature = await signMessage(message, address);
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
    if (!address || !signature) return; // TODO (Krysh) add real error handling
    setIsProcessing(true);
    return createSession(address, signature, true).finally(() => {
      setSignature(undefined);
      setNeedsSignUp(false);
      setIsProcessing(false);
    });
  }

  async function logout(): Promise<void> {
    await deleteSession();
  }

  const context = {
    isMetaMaskInstalled: isInstalled,
    address,
    blockchain,
    isLoggedIn,
    needsSignUp,
    isProcessing,
    login,
    signUp,
    logout,
  };

  return <SessionContext.Provider value={context}>{props.children}</SessionContext.Provider>;
}
