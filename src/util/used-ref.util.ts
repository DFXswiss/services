import { UserRole } from '@dfx.swiss/react';

/**
 * Setting a wallet's referral code is a Compliance action. The API enforces the same rule fail-closed
 * (`RoleGuard(UserRole.COMPLIANCE)` on PUT support/user/:id/usedRef); the UI only hides the form for
 * roles that would be refused. SuperAdmin is not a separate session role in this app — Admin covers it.
 */
export function canEditUsedRef(role: UserRole | undefined): boolean {
  return role === UserRole.COMPLIANCE || role === UserRole.ADMIN;
}
