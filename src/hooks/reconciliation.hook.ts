import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { ReconciliationResult } from 'src/dto/reconciliation.dto';

export function useReconciliation() {
  const { call } = useApi();

  async function getReconciliation(assetId: number, from: string, to: string): Promise<ReconciliationResult> {
    const params = new URLSearchParams({ assetId: String(assetId), from, to });
    return call<ReconciliationResult>({
      url: `balance/reconciliation?${params}`,
      method: 'GET',
    });
  }

  return useMemo(() => ({ getReconciliation }), [call]);
}
