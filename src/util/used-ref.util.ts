import { UserRole } from '@dfx.swiss/react';
import type { UserInfo } from 'src/hooks/compliance.hook';
import { DEFAULT_REF } from 'src/util/compliance-helpers';

/**
 * Setting an account's referral code is a Compliance action. The API enforces the same rule fail-closed
 * (`RoleGuard(UserRole.COMPLIANCE)` on PUT support/:id/usedRef); the UI only hides the form for roles
 * that would be refused. SuperAdmin is not a separate session role in this app — Admin covers it.
 */
export function canEditUsedRef(role: UserRole | undefined): boolean {
  return role === UserRole.COMPLIANCE || role === UserRole.ADMIN;
}

export interface UsedRefGroup {
  // undefined when the wallets carry no referral code (empty or the default code)
  usedRef?: string;
  refUserName?: string;
  refUserDataId?: number;
  walletCount: number;
}

/**
 * An account has one referrer, but the code is stored per wallet, so the wallets are folded by code:
 * normally one group, more only when an account's wallets carry different codes (older accounts, merges).
 * Groups with a code come first in order of first appearance; the wallets without a code close the list.
 */
export function usedRefGroups(users: UserInfo[] | undefined): UsedRefGroup[] {
  const groups = new Map<string, UsedRefGroup>();
  let noRef: UsedRefGroup | undefined;

  for (const u of users ?? []) {
    if (!u.usedRef || u.usedRef === DEFAULT_REF) {
      noRef = { walletCount: (noRef?.walletCount ?? 0) + 1 };
      continue;
    }

    const group = groups.get(u.usedRef);
    if (group) {
      group.walletCount++;
    } else {
      groups.set(u.usedRef, {
        usedRef: u.usedRef,
        refUserName: u.refUserName,
        refUserDataId: u.refUserDataId,
        walletCount: 1,
      });
    }
  }

  return noRef ? [...groups.values(), noRef] : [...groups.values()];
}
