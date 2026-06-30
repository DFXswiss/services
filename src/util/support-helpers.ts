import { Department, SupportIssueType, UserRole } from '@dfx.swiss/react';
import { IssueReasonLabels, IssueTypeLabels } from 'src/config/labels';

export function typeLabel(type: string): string {
  return IssueTypeLabels[type as SupportIssueType] ?? type;
}

export function reasonLabel(reason: string): string {
  return IssueReasonLabels[reason as keyof typeof IssueReasonLabels] ?? reason;
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
