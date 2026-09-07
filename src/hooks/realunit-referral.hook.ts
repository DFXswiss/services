import { useMemo } from 'react';
import { RealUnitReferralRelation } from 'src/dto/realunit-referral.dto';
import { useGuardedApi } from './guarded-api.hook';

// RealUnit tenant referral-admin hook. Operator-scoped `/v1/realunit/referral/admin/*` endpoints
// (RoleGuard REALUNIT). The actor is derived server-side from the JWT, so the client sends only a
// `reason`. `call` MUST come from useGuardedApi so the staff 2FA (TFA_REQUIRED) redirect works.
export function useRealunitReferral() {
  const { call } = useGuardedApi();

  async function getRelations(): Promise<RealUnitReferralRelation[]> {
    return call<RealUnitReferralRelation[]>({
      url: 'realunit/referral/admin/relations',
      method: 'GET',
    });
  }

  async function approveRelation(id: number, reason: string): Promise<RealUnitReferralRelation> {
    return call<RealUnitReferralRelation>({
      url: `realunit/referral/admin/relations/${id}/approve`,
      method: 'PUT',
      data: { reason },
    });
  }

  async function rejectRelation(id: number, reason: string): Promise<RealUnitReferralRelation> {
    return call<RealUnitReferralRelation>({
      url: `realunit/referral/admin/relations/${id}/reject`,
      method: 'PUT',
      data: { reason },
    });
  }

  async function createManualPrize(id: number, reason: string): Promise<RealUnitReferralRelation> {
    return call<RealUnitReferralRelation>({
      url: `realunit/referral/admin/relations/${id}/manual-prize`,
      method: 'POST',
      data: { reason },
    });
  }

  return useMemo(
    () => ({
      getRelations,
      approveRelation,
      rejectRelation,
      createManualPrize,
    }),
    [call],
  );
}
