import { Department, UserRole } from '@dfx.swiss/react';

const DEPT_BADGE: Record<Department, string> = {
  [Department.SUPPORT]: 'bg-dfxGray-300 text-dfxBlue-800',
  [Department.COMPLIANCE]: 'bg-dfxBlue-300/20 text-dfxBlue-400',
  [Department.MARKETING]: 'bg-dfxGreen-100/20 text-dfxGreen-300',
  [Department.COOPERATION]: 'bg-dfxGray-400 text-dfxBlue-800',
};

export function deptBadge(dept: Department): JSX.Element {
  const classes = DEPT_BADGE[dept] ?? 'bg-dfxGray-300 text-dfxBlue-800';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${classes}`}>{dept}</span>;
}

export function adminDeptOptions(role: UserRole | undefined): Department[] {
  return role === UserRole.ADMIN ? [Department.SUPPORT, Department.COMPLIANCE, Department.MARKETING] : [];
}
