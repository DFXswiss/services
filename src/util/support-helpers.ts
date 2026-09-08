import { Department, SupportIssueReason, SupportIssueType, UserRole } from '@dfx.swiss/react';
import { IssueReasonLabels, IssueTypeLabels } from 'src/config/labels';

// Pure aging/escalation/statistics logic lives in a dependency-free module; re-exported
// here so existing imports from 'support-helpers' keep working.
export * from './support-stats';

export function typeLabel(type: string): string {
  return IssueTypeLabels[type as SupportIssueType] ?? type;
}

export function reasonLabel(reason: string): string {
  return IssueReasonLabels[reason as keyof typeof IssueReasonLabels] ?? reason;
}

// Reason label for list views: the catch-all "Other" is left blank so only specific reasons stand out.
export function listReasonLabel(reason: string): string {
  return reason === SupportIssueReason.OTHER ? '' : reasonLabel(reason);
}

// Badge classes for a customer-waiting tier (see waitTier): red once escalated, yellow from 12h,
// neutral below that.
export function waitTierBadgeClasses(tier: 0 | 1 | 2 | 3): string {
  if (tier === 3) return 'bg-dfxRed-100 text-white';
  if (tier === 2) return 'bg-dfxYellow-500/20 text-dfxYellow-700';
  return 'bg-dfxGray-300 text-dfxGray-800';
}

// Departments a staff role may view and handle in the support dashboard. Mirrors the
// server-side visibility added in api PR #3983 (getVisibleDepartments): admin sees every
// department, compliance is a superset of support (it additionally sees support tickets),
// and a single-department role only sees its own.
const ROLE_DEPARTMENTS: Partial<Record<UserRole, Department[]>> = {
  [UserRole.ADMIN]: Object.values(Department),
  [UserRole.SUPPORT]: [Department.SUPPORT],
  [UserRole.COMPLIANCE]: [Department.SUPPORT, Department.COMPLIANCE],
  [UserRole.MARKETING]: [Department.MARKETING],
};

// Scopes the department filter and column to what the role may actually handle. An unmapped or
// department-less role returns [] (fail closed: no filter/column) rather than defaulting to every
// department — a new role must be granted visibility explicitly, never by omission.
export function visibleDepartmentsForRole(role?: UserRole): Department[] {
  if (!role) return [];
  const departments = ROLE_DEPARTMENTS[role];
  if (!departments) return [];
  return departments;
}
