import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

function formatChf(value: number): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DashboardFinancialLiquidityScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Liquidity', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getLatestBalance } = useDashboard();

  const [latestBalance, setLatestBalance] = useState<LatestBalanceResponse>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    getLatestBalance()
      .then(setLatestBalance)
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
      <div className="bg-white rounded-lg shadow p-4 inline-block">
        <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
          Total Balance
        </div>
        <div className="text-xl font-bold mt-1">{`${formatChf(totalPlus - totalMinus)} CHF`}</div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <BalanceBarChart title="Liquidity by Provider" data={latestBalance?.byBlockchain ?? []} />
      </div>
    </div>
  );
}
