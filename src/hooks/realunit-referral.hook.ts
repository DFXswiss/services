import { useMemo } from 'react';
import {
  CreateRealUnitPromoBatch,
  CreateRealUnitPromoCode,
  RealUnitPrizeWallet,
  RealUnitPromoCode,
  RealUnitReferralRelation,
} from 'src/dto/realunit-referral.dto';
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

  async function getPrizeWallet(): Promise<RealUnitPrizeWallet> {
    return call<RealUnitPrizeWallet>({
      url: 'realunit/referral/admin/prize-wallet',
      method: 'GET',
    });
  }

  async function getPromoCodes(): Promise<RealUnitPromoCode[]> {
    return call<RealUnitPromoCode[]>({
      url: 'realunit/referral/promo',
      method: 'GET',
    });
  }

  async function createPromoCode(dto: CreateRealUnitPromoCode): Promise<RealUnitPromoCode> {
    return call<RealUnitPromoCode>({
      url: 'realunit/referral/promo',
      method: 'POST',
      data: dto,
    });
  }

  async function createPromoCodes(dto: CreateRealUnitPromoBatch): Promise<RealUnitPromoCode[]> {
    return call<RealUnitPromoCode[]>({
      url: 'realunit/referral/promo/batch',
      method: 'POST',
      data: dto,
    });
  }

  async function deactivatePromoCode(id: number): Promise<void> {
    return call<void>({
      url: `realunit/referral/promo/${id}/deactivate`,
      method: 'PUT',
    });
  }

  return useMemo(
    () => ({
      getRelations,
      approveRelation,
      rejectRelation,
      createManualPrize,
      getPrizeWallet,
      getPromoCodes,
      createPromoCode,
      createPromoCodes,
      deactivatePromoCode,
    }),
    [call],
  );
}
