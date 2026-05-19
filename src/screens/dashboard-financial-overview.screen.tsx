import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { AgeBadge } from 'src/components/dashboard/age-badge';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { TotalBalanceLongChart } from 'src/components/dashboard/total-balance-long-chart';
import { FinancialLogEntry, LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { getFromDateByTimeframe, isDailySample, Timeframe, TimeRange } from 'src/util/chart';
import { formatChfOrDash } from 'src/util/utils';

const TIMEFRAME_OPTIONS = [
  Timeframe.DAY,
  Timeframe.THREE_DAYS,
  Timeframe.WEEK,
  Timeframe.MONTH,
  Timeframe.QUARTER,
  Timeframe.YEAR,
  Timeframe.ALL,
] as const;

const REFRESH_INTERVAL_MS = 60_000;

export function sameLatestBalance(a: LatestBalanceResponse | undefined, b: LatestBalanceResponse | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.timestamp !== b.timestamp) return false;
  if (a.byType?.length !== b.byType?.length) return false;
  return true;
}

export function sameLogEntries(a: FinancialLogEntry[], b: FinancialLogEntry[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  return a[a.length - 1]?.timestamp === b[b.length - 1]?.timestamp;
}

export default function DashboardFinancialOverviewScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Overview', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getLatestBalance, getFinancialLog } = useDashboard();

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.THREE_DAYS);
  const [latestBalance, setLatestBalance] = useState<LatestBalanceResponse>();
  const [logEntries, setLogEntries] = useState<FinancialLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Prefetch the lazy ApexCharts chunk while the page is mounting so the
  // first chart paint does not wait on a separate network round-trip.
  useEffect(() => {
    import('react-apexcharts').catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fromTimestamp = getFromDateByTimeframe(timeframe);
    const from = fromTimestamp > 0 ? new Date(fromTimestamp).toISOString() : undefined;
    const dailySample = isDailySample(timeframe);

    function load(initial: boolean) {
      if (initial) setIsLoading(true);
      getLatestBalance()
        .then((data) => setLatestBalance((prev) => (sameLatestBalance(prev, data) ? prev : data)))
        .catch(() => undefined);
      getFinancialLog(from, dailySample)
        .then((logData) => setLogEntries((prev) => (sameLogEntries(prev, logData.entries) ? prev : logData.entries)))
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

  // Memoize the array so BalanceBarChart's internal useMemo cache stays stable across renders.
  const byBlockchain = useMemo(() => latestBalance?.byBlockchain ?? [], [latestBalance]);

  return (
    <div className="space-y-4 p-4 w-full self-stretch bg-dfxBlue-800 min-h-screen" style={{ color: '#ffffff' }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Balance" value={formatChfOrDash(totalBalance)} dark />
        <SummaryCard label="Plus Balance" value={formatChfOrDash(totalPlus)} color="#22c55e" dark />
        <SummaryCard label="Minus Balance" value={formatChfOrDash(totalMinus)} color="#ef4444" dark />
        <SummaryCard label="Timestamp" value={<AgeBadge timestamp={latestBalance?.timestamp} />} dark />
      </div>

      <div className="flex gap-2">
        {TIMEFRAME_OPTIONS.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              background: tf === timeframe ? '#3b82f6' : '#082948',
              color: tf === timeframe ? '#ffffff' : '#D6DBE2',
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
          <div className="bg-dfxBlue-700 rounded-lg shadow p-4">
            <TotalBalanceLongChart entries={logEntries} timeRange={timeRange} dark />
          </div>

          <div className="bg-dfxBlue-700 rounded-lg shadow p-4">
            <BalanceBarChart title="Liquidity by Provider" data={byBlockchain} dark />
          </div>
        </>
      )}
    </div>
  );
}
