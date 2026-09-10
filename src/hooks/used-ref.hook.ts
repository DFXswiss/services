import { useMemo } from 'react';
import type { UserInfo } from './compliance.hook';
import { useGuardedApi } from './guarded-api.hook';

export interface UpdateUsedRefDto {
  usedRef: string;
  reason: string;
}

// Mirrors Config.formats.ref in DFXswiss/backend (config.ts): one to three word characters, a dash,
// one to three word characters. The API validates again; this only keeps an obviously malformed
// code from leaving the form.
export const USED_REF_PATTERN = /^\w{1,3}-\w{1,3}$/;

// Sets the referral code an account trades under (PUT support/:id/usedRef, Compliance role). The API
// writes the code to every wallet of the account, logs clerk, previous and new code, and answers with
// the updated wallet rows.
export function useUsedRef(): {
  updateUsedRef: (userDataId: string, dto: UpdateUsedRefDto) => Promise<UserInfo[]>;
} {
  const { call } = useGuardedApi();

  async function updateUsedRef(userDataId: string, dto: UpdateUsedRefDto): Promise<UserInfo[]> {
    return call<UserInfo[]>({
      url: `support/${userDataId}/usedRef`,
      method: 'PUT',
      data: dto,
    });
  }

  return useMemo(() => ({ updateUsedRef }), [call]);
}
