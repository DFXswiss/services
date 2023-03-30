import { AuthUrl, SignIn, SignMessage } from '../definitions/auth';
import { useApi } from './api.hook';

export interface AuthInterface {
  getSignMessage: (address: string) => Promise<string>;
  signIn: (address: string, signature: string) => Promise<SignIn>;
  signUp: (address: string, signature: string) => Promise<SignIn>;
}

export function useAuth(): AuthInterface {
  const { call } = useApi();

  async function getSignMessage(address: string): Promise<string> {
    return call<SignMessage>({ url: `${AuthUrl.signMessage}?address=${address}`, method: 'GET' }).then(
      (result) => result.message,
    );
  }

  async function signIn(address: string, signature: string): Promise<SignIn> {
    return call({ url: AuthUrl.signIn, method: 'POST', data: { address, signature } });
  }

  async function signUp(address: string, signature: string): Promise<SignIn> {
    return call({ url: AuthUrl.signUp, method: 'POST', data: { address, signature, walletId: 9 } });
  }

  return { getSignMessage, signIn, signUp };
}
