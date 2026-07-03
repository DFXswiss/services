import { useMemo } from 'react';
import { useGuardedApi } from './guarded-api.hook';
import {
  SupportIssueInternalData,
  SupportIssueListItem,
  SupportMessageInfo,
  SupportStatisticsDto,
} from './support-dashboard.hook';

// RealUnit tenant support dashboard hook. Thin wrapper over the strictly customer-scoped `/v1/realunit/support/*`
// endpoints (the DFX RoleGuard is never widened; scoping is enforced server-side and by useRealunitGuard on the
// screens). Response shapes are identical to the DFX support dashboard, so the DFX support DTO interfaces are
// reused. `call` MUST come from useGuardedApi so the staff 2FA (TFA_REQUIRED) redirect works.
export function useRealunitSupport() {
  const { call } = useGuardedApi();

  async function getIssueList(params?: {
    states?: string;
    type?: string;
    take?: number;
    skip?: number;
    query?: string;
  }): Promise<{ data: SupportIssueListItem[]; total: number }> {
    const queryParts = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';

    return call<{ data: SupportIssueListItem[]; total: number }>({
      url: `realunit/support/list${queryString}`,
      method: 'GET',
    });
  }

  async function getIssueCounts(): Promise<Record<string, number>> {
    return call<Record<string, number>>({
      url: 'realunit/support/counts',
      method: 'GET',
    });
  }

  async function getIssueStatistics(periodDays: number): Promise<SupportStatisticsDto> {
    return call<SupportStatisticsDto>({
      url: `realunit/support/statistics?days=${periodDays}`,
      method: 'GET',
    });
  }

  async function getIssueActivity(since?: Date): Promise<{ count: number; latestAt?: string }> {
    const query = since ? `?since=${encodeURIComponent(since.toISOString())}` : '';
    return call<{ count: number; latestAt?: string }>({
      url: `realunit/support/activity${query}`,
      method: 'GET',
    });
  }

  async function getClerks(): Promise<string[]> {
    return call<string[]>({
      url: 'realunit/support/clerks',
      method: 'GET',
    });
  }

  async function getIssueData(issueId: number): Promise<SupportIssueInternalData> {
    return call<SupportIssueInternalData>({
      url: `realunit/support/${issueId}/data`,
      method: 'GET',
    });
  }

  async function updateIssue(
    issueId: number,
    data: { state?: string; clerk?: string; department?: string },
  ): Promise<void> {
    return call<void>({
      url: `realunit/support/${issueId}`,
      method: 'PUT',
      data,
    });
  }

  async function createMessage(
    issueId: number,
    data: { author: string; message?: string; file?: string; fileName?: string },
  ): Promise<SupportMessageInfo> {
    return call<SupportMessageInfo>({
      url: `realunit/support/${issueId}/message`,
      method: 'POST',
      data,
    });
  }

  async function getFile(
    issueId: number,
    messageId: number,
  ): Promise<{ data: { type: string; data: number[] }; contentType: string }> {
    return call<{ data: { type: string; data: number[] }; contentType: string }>({
      url: `realunit/support/${issueId}/message/${messageId}/file`,
      method: 'GET',
    });
  }

  // The message thread. The scoped RealUnit support controller exposes no messages-list route, so the thread is
  // read via the shared, non-role-scoped `support/issue/:uid` endpoint (login-only, keyed by the issue UID) — the
  // exact endpoint the DFX support dashboard already uses. Staff only ever hold UIDs of their own scoped issues.
  async function getIssueMessages(issueUid: string): Promise<SupportMessageInfo[]> {
    const result = await call<{ messages: SupportMessageInfo[] }>({
      url: `support/issue/${issueUid}`,
      method: 'GET',
    });
    return result.messages;
  }

  return useMemo(
    () => ({
      getIssueList,
      getIssueCounts,
      getIssueStatistics,
      getIssueActivity,
      getClerks,
      getIssueData,
      updateIssue,
      createMessage,
      getFile,
      getIssueMessages,
    }),
    [call],
  );
}
