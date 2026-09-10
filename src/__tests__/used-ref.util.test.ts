jest.mock('@dfx.swiss/react', () => ({
  UserRole: { USER: 'User', SUPPORT: 'Support', MARKETING: 'Marketing', COMPLIANCE: 'Compliance', ADMIN: 'Admin' },
}));

// The helper module pulls in @dfx.swiss/react (ESM this Jest setup cannot parse); the one value the
// util reads is the sentinel the backend stores for "no referrer".
jest.mock('src/util/compliance-helpers', () => ({ DEFAULT_REF: '000-000' }));

import { UserRole } from '@dfx.swiss/react';
import type { UserInfo } from 'src/hooks/compliance.hook';
import { canEditUsedRef, usedRefGroups } from 'src/util/used-ref.util';

function wallet(overrides: Partial<UserInfo> = {}): UserInfo {
  return { id: 1, address: '0xabc', role: 'User', status: 'Active', created: '2026-01-01', ...overrides };
}

describe('canEditUsedRef', () => {
  it.each([UserRole.COMPLIANCE, UserRole.ADMIN])('allows %s', (role) => {
    expect(canEditUsedRef(role)).toBe(true);
  });

  it.each([UserRole.SUPPORT, UserRole.MARKETING, UserRole.USER, undefined])('refuses %s', (role) => {
    expect(canEditUsedRef(role)).toBe(false);
  });
});

describe('usedRefGroups', () => {
  it('returns nothing for no wallets', () => {
    expect(usedRefGroups(undefined)).toEqual([]);
    expect(usedRefGroups([])).toEqual([]);
  });

  it('folds wallets with the same code into one group with the referrer of the first', () => {
    expect(
      usedRefGroups([
        wallet({ id: 1, usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304 }),
        wallet({ id: 2, usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304 }),
      ]),
    ).toEqual([{ usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304, walletCount: 2 }]);
  });

  it('treats the default code and a missing code as no referrer and lists that group last', () => {
    expect(
      usedRefGroups([
        wallet({ id: 1, usedRef: '000-000' }),
        wallet({ id: 2, usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304 }),
        wallet({ id: 3 }),
        wallet({ id: 4, usedRef: '555-555' }),
      ]),
    ).toEqual([
      { usedRef: '172-134', refUserName: 'Samuel Kullmann', refUserDataId: 328304, walletCount: 1 },
      { usedRef: '555-555', refUserName: undefined, refUserDataId: undefined, walletCount: 1 },
      { walletCount: 2 },
    ]);
  });
});
