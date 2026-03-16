import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { BalanceByTypeMinusChart, BalanceByTypePlusChart, BalanceByTypeTotalChart } from 'src/components/dashboard/balance-by-type-area-chart';
import { FinancialChangesMinusChart, FinancialChangesPlusChart, FinancialChangesTotalChart } from 'src/components/dashboard/financial-changes-chart';
import { TotalBalanceLongChart } from 'src/components/dashboard/total-balance-long-chart';
import { ShortTermMinusChart, ShortTermPlusChart, ShortTermTotalChart } from 'src/components/dashboard/total-balance-short-chart';
import { FinancialChangesEntry, FinancialLogEntry } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { getFromDateByTimeframe, Timeframe } from 'src/util/chart';

export interface TimeRange {
  min: number;
  max: number;
}

const TIMEFRAME_OPTIONS = [Timeframe.DAY, Timeframe.THREE_DAYS, Timeframe.WEEK, Timeframe.MONTH] as const;

function useDailySample(timeframe: Timeframe): boolean {
  return timeframe === Timeframe.WEEK || timeframe === Timeframe.MONTH;
}

export default function DashboardFinancialLogScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Log', noMaxWidth: true });

  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();
  const { getFinancialLog, getFinancialChanges } = useDashboard();

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.DAY);
  const [logEntries, setLogEntries] = useState<FinancialLogEntry[]>([]);
  const [changesEntries, setChangesEntries] = useState<FinancialChangesEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    setIsLoading(true);

    const fromTimestamp = getFromDateByTimeframe(timeframe);
    const from = fromTimestamp > 0 ? new Date(fromTimestamp).toISOString() : undefined;
    const dailySample = useDailySample(timeframe);

    Promise.all([getFinancialLog(from, dailySample), getFinancialChanges(from, dailySample)])
      .then(([logData, changesData]) => {
        setLogEntries(logData.entries);
        setChangesEntries(changesData.entries);
      })
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, timeframe]);

  const timeRange = useMemo((): TimeRange | undefined => {
    const allTimestamps = [
      ...logEntries.map((e) => new Date(e.timestamp).getTime()),
      ...changesEntries.map((e) => new Date(e.timestamp).getTime()),
    ];
    if (allTimestamps.length === 0) return undefined;
    return { min: Math.min(...allTimestamps), max: Math.max(...allTimestamps) };
  }, [logEntries, changesEntries]);

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      {/* Timeframe Selector */}
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
          {/* Fee Income */}
          <div className="bg-white rounded-lg shadow p-4">
            <FinancialChangesPlusChart entries={changesEntries} timeRange={timeRange} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <FinancialChangesMinusChart entries={changesEntries} timeRange={timeRange} onDetails={() => navigate('/dashboard/financial/history/expenses')} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <FinancialChangesTotalChart entries={changesEntries} timeRange={timeRange} />
          </div>

          {/* Total Balance vs BTC */}
          <div className="bg-white rounded-lg shadow p-4">
            <TotalBalanceLongChart entries={logEntries} timeRange={timeRange} />
          </div>

          {/* Balance Breakdown */}
          <div className="bg-white rounded-lg shadow p-4">
            <ShortTermPlusChart entries={logEntries} timeRange={timeRange} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <ShortTermMinusChart entries={logEntries} timeRange={timeRange} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <ShortTermTotalChart entries={logEntries} timeRange={timeRange} />
          </div>

          {/* Balance by Financial Type */}
          <div className="bg-white rounded-lg shadow p-4">
            <BalanceByTypePlusChart entries={logEntries} timeRange={timeRange} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <BalanceByTypeMinusChart entries={logEntries} timeRange={timeRange} />
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <BalanceByTypeTotalChart entries={logEntries} timeRange={timeRange} />
          </div>
        </>
      )}
    </div>
  );
}
