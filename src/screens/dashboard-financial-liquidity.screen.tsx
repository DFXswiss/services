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

export default function DashboardFinancialLiquidityScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Liquidity', noMaxWidth: true });

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

  const totalBalance = useMemo(() => {
    if (!latestBalance) return undefined;
    let net = 0;
    for (const t of latestBalance.byType) net += t.plusBalanceChf - t.minusBalanceChf;
    return net;
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
      <div className="max-w-xs">
        <SummaryCard label="Total Balance" value={formatChfOrDash(totalBalance)} dark={isDark} />
      </div>

      <div className="bg-white dark:bg-dfxBlue-700 rounded-lg shadow p-4">
        <BalanceBarChart title="Liquidity by Provider" data={latestBalance?.byBlockchain ?? []} dark={isDark} />
      </div>
    </div>
  );
}
