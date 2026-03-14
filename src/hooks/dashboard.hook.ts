import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { FinancialLogResponse } from 'src/dto/dashboard.dto';

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

  return useMemo(() => ({ getFinancialLog }), [call]);
}
