import { ApiError, CallConfig, TfaLevel, useApi } from '@dfx.swiss/react';
import { useCallback } from 'react';
import { useNavigation } from './navigation.hook';

// Drop-in replacement for useApi() on staff hooks: staff endpoints answer HTTP 403 { code: 'TFA_REQUIRED' }
// when a mail-origin session still needs 2FA. Instead of surfacing a raw error, route into the bearer-based
// (session-mode) 2FA flow. Every staff dashboard hook must obtain its `call` from here, not from useApi(),
// so the 2FA redirect works everywhere — not only on the support dashboard.
export function useGuardedApi(): { call: <T>(config: CallConfig) => Promise<T> } {
  const { call } = useApi();
  const { navigate } = useNavigation();

  const call2fa = useCallback(
    <T>(config: CallConfig): Promise<T> =>
      call<T>(config).catch((error: ApiError) => {
        // staff 2FA is always STRICT/TOTP; route into the bearer-based (session-mode) 2FA flow
        if (error.code === 'TFA_REQUIRED') {
          navigate('/2fa', { state: { level: TfaLevel.STRICT, sessionMode: true }, setRedirect: true });
        }
        throw error;
      }),
    [call, navigate],
  );

  return { call: call2fa };
}
