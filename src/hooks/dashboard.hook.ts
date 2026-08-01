import { useMemo } from 'react';
import {
  FinancialChangesEntry,
  FinancialChangesResponse,
  FinancialLogChartResponse,
  FinancialLogResponse,
  LatestBalanceResponse,
  RefRewardRecipient,
} from 'src/dto/dashboard.dto';
import { useGuardedApi } from './guarded-api.hook';

export function useDashboard() {
  const { call } = useGuardedApi();

  function financialLogParams(from?: string, dailySample?: boolean): URLSearchParams {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (dailySample !== undefined) params.set('dailySample', String(dailySample));
    return params;
  }

  async function getFinancialLog(from?: string, dailySample?: boolean): Promise<FinancialLogResponse> {
    const query = financialLogParams(from, dailySample).toString();

    return call<FinancialLogResponse>({
      url: `dashboard/financial/log${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  async function getFinancialLogChart(from?: string, dailySample?: boolean): Promise<FinancialLogChartResponse> {
    const params = financialLogParams(from, dailySample);
    params.set('byType', 'false');
    const query = params.toString();

    return call<FinancialLogChartResponse>({
      url: `dashboard/financial/log?${query}`,
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
    () => ({
      getFinancialLog,
      getFinancialLogChart,
      getFinancialChanges,
      getLatestBalance,
      getLatestChanges,
      getRefRecipients,
    }),
    [call],
  );
}
