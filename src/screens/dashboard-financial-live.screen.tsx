import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { useThemeContext } from 'src/contexts/theme.context';
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
  const { isDark, tokens } = useThemeContext();

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: tokens.textPrimary }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Balance" value={formatChfOrDash(totalBalance)} dark={isDark} />
        <SummaryCard label="Plus Balance" value={formatChfOrDash(totalPlus)} color="#22c55e" dark={isDark} />
        <SummaryCard label="Minus Balance" value={formatChfOrDash(totalMinus)} color="#ef4444" dark={isDark} />
        <SummaryCard
          label="Timestamp"
          value={latestBalance ? new Date(latestBalance.timestamp).toLocaleString('de-CH') : '-'}
          dark={isDark}
        />
      </div>

      <div className="bg-white dark:bg-dfxBlue-700 rounded-lg shadow p-4">
        <BalanceBarChart title="Balance by Type" data={latestBalance?.byType ?? []} dark={isDark} />
      </div>
    </div>
  );
}
