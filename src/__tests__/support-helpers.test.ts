// Mock the label config so support-helpers does not pull in the real @dfx.swiss/react label tables.
jest.mock('src/config/labels', () => ({
  IssueReasonLabels: {},
  IssueTypeLabels: {},
}));

// Mock @dfx.swiss/react to avoid ES module issues in jest.
jest.mock('@dfx.swiss/react', () => ({
  Department: {
    SUPPORT: 'Support',
    COMPLIANCE: 'Compliance',
    MARKETING: 'Marketing',
    COOPERATION: 'Cooperation',
  },
  UserRole: {
    ADMIN: 'Admin',
    SUPPORT: 'Support',
    COMPLIANCE: 'Compliance',
    MARKETING: 'Marketing',
    CUSTODY: 'Custody',
  },
}));

import { Department, UserRole } from '@dfx.swiss/react';
import { visibleDepartmentsForRole } from 'src/util/support-helpers';

describe('visibleDepartmentsForRole', () => {
  it('limits support to the support department', () => {
    expect(visibleDepartmentsForRole(UserRole.SUPPORT)).toEqual([Department.SUPPORT]);
  });

  it('lets compliance see support and compliance tickets (superset of support)', () => {
    expect(visibleDepartmentsForRole(UserRole.COMPLIANCE)).toEqual([Department.SUPPORT, Department.COMPLIANCE]);
  });

  it('limits marketing to the marketing department', () => {
    expect(visibleDepartmentsForRole(UserRole.MARKETING)).toEqual([Department.MARKETING]);
  });

  it('gives admin every department (unrestricted)', () => {
    expect(visibleDepartmentsForRole(UserRole.ADMIN)).toEqual(Object.values(Department));
  });

  it('returns no departments when the role is undefined', () => {
    expect(visibleDepartmentsForRole(undefined)).toEqual([]);
  });

  it('fails closed for an unmapped role (no department access by default)', () => {
    expect(visibleDepartmentsForRole(UserRole.CUSTODY)).toEqual([]);
  });
});
