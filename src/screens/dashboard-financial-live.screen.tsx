import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { FinancialChangesEntry, LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

function formatChf(value: number): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface SummaryCardProps {
  label: string;
  value: string;
  color?: string;
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs font-medium" style={{ color: '#6b7280' }}>{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color: color ?? '#111827' }}>{value}</div>
    </div>
  );
}

export default function DashboardFinancialLiveScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Live', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getLatestChanges, getLatestBalance } = useDashboard();

  const [latestBalance, setLatestBalance] = useState<LatestBalanceResponse>();
  const [latestChanges, setLatestChanges] = useState<FinancialChangesEntry>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    Promise.all([
      getLatestBalance(),
      getLatestChanges(),
    ])
      .then(([balanceData, changesData]) => {
        setLatestBalance(balanceData);
        setLatestChanges(changesData);
      })
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  const totalPlus = latestBalance?.byType.reduce((s, t) => s + t.plusBalanceChf, 0) ?? 0;
  const totalMinus = latestBalance?.byType.reduce((s, t) => s + t.minusBalanceChf, 0) ?? 0;

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Balance" value={`${formatChf(totalPlus - totalMinus)} CHF`} />
        <SummaryCard label="Plus Balance" value={`${formatChf(totalPlus)} CHF`} color="#22c55e" />
        <SummaryCard label="Minus Balance" value={`${formatChf(totalMinus)} CHF`} color="#ef4444" />
        <SummaryCard label="Timestamp" value={latestBalance ? new Date(latestBalance.timestamp).toLocaleString('de-CH') : '-'} />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <BalanceBarChart title="Balance by Type" data={latestBalance?.byType ?? []} />
      </div>
    </div>
  );
}
