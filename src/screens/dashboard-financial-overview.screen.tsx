import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { AgeBadge } from 'src/components/dashboard/age-badge';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { TotalBalanceLongChart } from 'src/components/dashboard/total-balance-long-chart';
import { FinancialLogEntry, LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { getFromDateByTimeframe, Timeframe, TimeRange } from 'src/util/chart';
import { formatChfOrDash } from 'src/util/utils';

const TIMEFRAME_OPTIONS = [
  Timeframe.WEEK,
  Timeframe.MONTH,
  Timeframe.QUARTER,
  Timeframe.YEAR,
  Timeframe.ALL,
] as const;

const REFRESH_INTERVAL_MS = 60_000;

export default function DashboardFinancialOverviewScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Overview', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getLatestBalance, getFinancialLog } = useDashboard();

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.WEEK);
  const [latestBalance, setLatestBalance] = useState<LatestBalanceResponse>();
  const [logEntries, setLogEntries] = useState<FinancialLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fromTimestamp = getFromDateByTimeframe(timeframe);
    const from = fromTimestamp > 0 ? new Date(fromTimestamp).toISOString() : undefined;

    function load(initial: boolean) {
      if (initial) setIsLoading(true);
      getLatestBalance()
        .then(setLatestBalance)
        .catch(() => undefined);
      getFinancialLog(from, true)
        .then((logData) => setLogEntries(logData.entries))
        .catch(() => undefined)
        .finally(() => {
          if (initial) setIsLoading(false);
        });
    }

    load(true);
    const interval = setInterval(() => load(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLoggedIn, timeframe]);

  const timeRange = useMemo((): TimeRange | undefined => {
    if (logEntries.length === 0) return undefined;
    let min = Infinity;
    let max = -Infinity;
    for (const e of logEntries) {
      const t = new Date(e.timestamp).getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return { min, max };
  }, [logEntries]);

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

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Balance" value={formatChfOrDash(totalBalance)} />
        <SummaryCard label="Plus Balance" value={formatChfOrDash(totalPlus)} color="#22c55e" />
        <SummaryCard label="Minus Balance" value={formatChfOrDash(totalMinus)} color="#ef4444" />
        <SummaryCard label="Timestamp" value={<AgeBadge timestamp={latestBalance?.timestamp} />} />
      </div>

      <div className="flex gap-2">
        {TIMEFRAME_OPTIONS.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              background: tf === timeframe ? '#3b82f6' : '#f3f4f6',
              color: tf === timeframe ? '#ffffff' : '#374151',
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center w-full h-96">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <TotalBalanceLongChart entries={logEntries} timeRange={timeRange} />
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <BalanceBarChart title="Liquidity by Provider" data={latestBalance?.byBlockchain ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
