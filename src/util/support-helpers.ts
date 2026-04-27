import { SupportIssueType } from '@dfx.swiss/react';
import { IssueReasonLabels, IssueTypeLabels } from 'src/config/labels';

export function typeLabel(type: string): string {
  return IssueTypeLabels[type as SupportIssueType] ?? type;
}

export function reasonLabel(reason: string): string {
  return IssueReasonLabels[reason as keyof typeof IssueReasonLabels] ?? reason;
}
