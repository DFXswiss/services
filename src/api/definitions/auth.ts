export const AuthUrl = { signMessage: 'auth/signMessage', signIn: 'auth/signIn', signUp: 'auth/signUp' };

export interface SignMessage {
  message: string;
}

export interface SignIn {
  accessToken: string;
}
