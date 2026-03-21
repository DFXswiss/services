import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import {
  FinancialChangesEntry,
  FinancialChangesResponse,
  FinancialLogResponse,
  LatestBalanceResponse,
  RefRewardRecipient,
} from 'src/dto/dashboard.dto';

export function useDashboard() {
  const { call } = useApi();

  async function getFinancialLog(from?: string, dailySample?: boolean): Promise<FinancialLogResponse> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (dailySample !== undefined) params.set('dailySample', String(dailySample));
    const query = params.toString();

    return call<FinancialLogResponse>({
      url: `dashboard/financial/log${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  async function getFinancialChanges(from?: string, dailySample?: boolean): Promise<FinancialChangesResponse> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (dailySample !== undefined) params.set('dailySample', String(dailySample));
    const query = params.toString();

    return call<FinancialChangesResponse>({
      url: `dashboard/financial/changes${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  async function getLatestBalance(): Promise<LatestBalanceResponse> {
    return call<LatestBalanceResponse>({
      url: 'dashboard/financial/latest',
      method: 'GET',
    });
  }

  async function getLatestChanges(): Promise<FinancialChangesEntry> {
    return call<FinancialChangesEntry>({
      url: 'dashboard/financial/changes/latest',
      method: 'GET',
    });
  }

  async function getRefRecipients(from?: string): Promise<RefRewardRecipient[]> {
    const query = from ? `?from=${from}` : '';
    return call<RefRewardRecipient[]>({
      url: `dashboard/financial/ref-recipients${query}`,
      method: 'GET',
    });
  }

  return useMemo(
    () => ({ getFinancialLog, getFinancialChanges, getLatestBalance, getLatestChanges, getRefRecipients }),
    [call],
  );
}
