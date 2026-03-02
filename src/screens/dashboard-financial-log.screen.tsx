import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { BalanceByTypeAreaChart } from 'src/components/dashboard/balance-by-type-area-chart';
import { FinancialLogTable } from 'src/components/dashboard/financial-log-table';
import { LatestBalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { TotalBalanceLongChart } from 'src/components/dashboard/total-balance-long-chart';
import { TotalBalanceShortChart } from 'src/components/dashboard/total-balance-short-chart';
import { FinancialLogEntry } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

export default function DashboardFinancialLogScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Log', noMaxWidth: true });

  const { getFinancialLog } = useDashboard();

  const [longEntries, setLongEntries] = useState<FinancialLogEntry[]>([]);
  const [shortEntries, setShortEntries] = useState<FinancialLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      getFinancialLog(undefined, true),
      getFinancialLog(sevenDaysAgo, false),
    ])
      .then(([longData, shortData]) => {
        setLongEntries(longData.entries);
        setShortEntries(shortData.entries);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  const latestEntry = longEntries.length > 0 ? longEntries[longEntries.length - 1] : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <TotalBalanceLongChart entries={longEntries} />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <TotalBalanceShortChart entries={shortEntries} />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <BalanceByTypeAreaChart entries={longEntries} />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <LatestBalanceBarChart entry={latestEntry} />
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold mb-2">Financial Log</h3>
          <FinancialLogTable entries={longEntries} />
        </div>
      </div>
    </div>
  );
}
