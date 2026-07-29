import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { formatChfOrDash } from 'src/util/utils';

export default function DashboardFinancialLiveScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Live', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getLatestBalance } = useDashboard();

  const [latestBalance, setLatestBalance] = useState<LatestBalanceResponse>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    getLatestBalance()
      .then(setLatestBalance)
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  const { totalPlus, totalMinus, totalBalance } = useMemo(() => {
    if (!latestBalance) return { totalPlus: undefined, totalMinus: undefined, totalBalance: undefined };
    let plus = 0;
    let minus = 0;
    for (const t of latestBalance.byType) {
      plus += t.plusBalanceChf;
      minus += t.minusBalanceChf;
    }
    return { totalPlus: plus, totalMinus: minus, totalBalance: plus - minus };
  }, [latestBalance]);

  // Memoize the array so BalanceBarChart's internal useMemo cache stays stable across renders.
  const byType = useMemo(() => latestBalance?.byType ?? [], [latestBalance]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Balance" value={formatChfOrDash(totalBalance)} />
        <SummaryCard label="Plus Balance" value={formatChfOrDash(totalPlus)} color="#22c55e" />
        <SummaryCard label="Minus Balance" value={formatChfOrDash(totalMinus)} color="#ef4444" />
        <SummaryCard
          label="Timestamp"
          value={latestBalance ? new Date(latestBalance.timestamp).toLocaleString('de-CH') : '-'}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <BalanceBarChart title="Balance by Type" data={byType} />
      </div>
    </div>
  );
}
