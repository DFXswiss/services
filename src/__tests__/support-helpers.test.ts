// Mock the label config so support-helpers does not pull in the real @dfx.swiss/react label tables.
jest.mock('src/config/labels', () => ({
  IssueReasonLabels: { Other: 'Other', TransactionMissing: 'Transaction missing' },
  IssueTypeLabels: { KycIssue: 'KYC issue' },
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
  SupportIssueReason: {
    OTHER: 'Other',
    TRANSACTION_MISSING: 'TransactionMissing',
  },
}));

import { Department, UserRole } from '@dfx.swiss/react';
import {
  listReasonLabel,
  reasonLabel,
  typeLabel,
  visibleDepartmentsForRole,
  waitTierBadgeClasses,
} from 'src/util/support-helpers';

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

describe('listReasonLabel', () => {
  it('leaves the catch-all "Other" reason blank in list views', () => {
    expect(listReasonLabel('Other')).toBe('');
  });

  it('keeps specific reasons', () => {
    expect(listReasonLabel('TransactionMissing')).toBe('Transaction missing');
  });
});

describe('waitTierBadgeClasses', () => {
  it('escalates to red at tier 3 and yellow at tier 2, neutral below', () => {
    expect(waitTierBadgeClasses(3)).toContain('bg-dfxRed-100');
    expect(waitTierBadgeClasses(2)).toContain('dfxYellow');
    expect(waitTierBadgeClasses(1)).toContain('bg-dfxGray-300');
    expect(waitTierBadgeClasses(0)).toContain('bg-dfxGray-300');
  });
});

describe('typeLabel / reasonLabel', () => {
  it('maps known keys and falls back to the raw value for unknown ones', () => {
    expect(typeLabel('KycIssue')).toBe('KYC issue');
    expect(typeLabel('SomethingNew')).toBe('SomethingNew');
    expect(reasonLabel('TransactionMissing')).toBe('Transaction missing');
    expect(reasonLabel('SomethingNew')).toBe('SomethingNew');
  });
});
