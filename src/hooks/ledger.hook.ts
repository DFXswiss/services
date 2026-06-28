import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import {
  EquityComparisonDto,
  LedgerAccountsResponseDto,
  LedgerLegsResponseDto,
  MarginResponseDto,
  ReconStatusResponseDto,
  SuspenseResponseDto,
} from 'src/dto/ledger.dto';

export function useLedger() {
  const { call } = useApi();

  async function getAccounts(from?: string, to?: string): Promise<LedgerAccountsResponseDto> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();

    // 'dashboard/' prefix is intentional: services base URL (.../v1) has no rewrite;
    // controller is /v1/dashboard/accounting/ledger/* (§1.14)
    return call<LedgerAccountsResponseDto>({
      url: `dashboard/accounting/ledger/accounts${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  async function getAccountDetail(
    accountId: number,
    from?: string,
    to?: string,
    page?: number,
  ): Promise<LedgerLegsResponseDto> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (page !== undefined) params.set('page', String(page));
    const query = params.toString();

    // 'dashboard/' prefix is intentional (see getAccounts, §1.14)
    return call<LedgerLegsResponseDto>({
      url: `dashboard/accounting/ledger/accounts/${accountId}/legs${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  async function getReconStatus(): Promise<ReconStatusResponseDto> {
    // 'dashboard/' prefix is intentional (see getAccounts, §1.14)
    return call<ReconStatusResponseDto>({
      url: 'dashboard/accounting/ledger/reconciliation',
      method: 'GET',
    });
  }

  async function getSuspense(): Promise<SuspenseResponseDto> {
    // 'dashboard/' prefix is intentional (see getAccounts, §1.14)
    return call<SuspenseResponseDto>({
      url: 'dashboard/accounting/ledger/suspense',
      method: 'GET',
    });
  }

  async function getMargin(from?: string, to?: string, dailySample?: boolean): Promise<MarginResponseDto> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (dailySample !== undefined) params.set('dailySample', String(dailySample));
    const query = params.toString();

    // 'dashboard/' prefix is intentional (see getAccounts, §1.14)
    return call<MarginResponseDto>({
      url: `dashboard/accounting/ledger/margin${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  async function getEquityComparison(from?: string, dailySample?: boolean): Promise<EquityComparisonDto> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (dailySample !== undefined) params.set('dailySample', String(dailySample));
    const query = params.toString();

    // 'dashboard/' prefix is intentional (see getAccounts, §1.14)
    return call<EquityComparisonDto>({
      url: `dashboard/accounting/ledger/equity-comparison${query ? `?${query}` : ''}`,
      method: 'GET',
    });
  }

  return useMemo(
    () => ({ getAccounts, getAccountDetail, getReconStatus, getSuspense, getMargin, getEquityComparison }),
    [call],
  );
}
