jest.mock('@dfx.swiss/react', () => ({
  UserRole: { USER: 'User', SUPPORT: 'Support', MARKETING: 'Marketing', COMPLIANCE: 'Compliance', ADMIN: 'Admin' },
}));

import { UserRole } from '@dfx.swiss/react';
import { canEditUsedRef } from 'src/util/used-ref.util';

describe('canEditUsedRef', () => {
  it.each([UserRole.COMPLIANCE, UserRole.ADMIN])('allows %s', (role) => {
    expect(canEditUsedRef(role)).toBe(true);
  });

  it.each([UserRole.SUPPORT, UserRole.MARKETING, UserRole.USER, undefined])('refuses %s', (role) => {
    expect(canEditUsedRef(role)).toBe(false);
  });
});
