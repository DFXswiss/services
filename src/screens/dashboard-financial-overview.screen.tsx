import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { BalanceBarChart } from 'src/components/dashboard/latest-balance-bar-chart';
import { TotalBalanceLongChart } from 'src/components/dashboard/total-balance-long-chart';
import { FinancialLogEntry, LatestBalanceResponse } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { getFromDateByTimeframe, Timeframe } from 'src/util/chart';
import { TimeRange } from './dashboard-financial-history.screen';

const TIMEFRAME_OPTIONS = [
  Timeframe.WEEK,
  Timeframe.MONTH,
  Timeframe.QUARTER,
  Timeframe.YEAR,
  Timeframe.ALL,
] as const;

function formatChf(value: number): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatAge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function AgeBadge({ timestamp }: { timestamp?: string }): JSX.Element {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{timestamp ? formatAge(now - new Date(timestamp).getTime()) : '-'}</>;
}

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
    const interval = setInterval(() => load(false), 60_000);
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

  const chfOrDash = (v?: number) => (v !== undefined ? `${formatChf(v)} CHF` : '-');

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
            Total Balance
          </div>
          <div className="text-xl font-bold mt-1">{chfOrDash(totalBalance)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
            Plus Balance
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: '#22c55e' }}>{chfOrDash(totalPlus)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
            Minus Balance
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: '#ef4444' }}>{chfOrDash(totalMinus)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
            Timestamp
          </div>
          <div className="text-xl font-bold mt-1">
            <AgeBadge timestamp={latestBalance?.timestamp} />
          </div>
        </div>
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
