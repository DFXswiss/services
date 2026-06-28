import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { ApexOptions } from 'apexcharts';
import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { useSettingsContext } from 'src/contexts/settings.context';
import { MarginResponseDto } from 'src/dto/ledger.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useLedger } from 'src/hooks/ledger.hook';
import { getFromDateByTimeframe, isDailySample, Timeframe } from 'src/util/chart';
import { formatChf2OrDash } from 'src/util/ledger';

const TIMEFRAME_OPTIONS = [Timeframe.WEEK, Timeframe.MONTH, Timeframe.QUARTER, Timeframe.YEAR, Timeframe.ALL] as const;

function makeOptions(): ApexOptions {
  return {
    chart: { type: 'area', toolbar: { show: true, offsetY: -5 }, zoom: { enabled: true }, background: '0' },
    colors: ['#22c55e', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6'],
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    grid: { borderColor: '#e5e7eb' },
    xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'dd MMM yy' } },
    yaxis: {
      title: { text: 'CHF' },
      labels: { formatter: (val: number) => (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)) },
    },
    tooltip: {
      x: { format: 'dd MMM yyyy' },
      y: { formatter: (val: number) => `${val.toLocaleString('de-CH', { maximumFractionDigits: 2 })} CHF` },
    },
    legend: { position: 'bottom' },
  };
}

export default function LedgerMarginScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { getMargin } = useLedger();

  useLayoutOptions({ title: translate('screens/ledger', 'Realized Margin'), backButton: true, noMaxWidth: true });

  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.MONTH);
  const [data, setData] = useState<MarginResponseDto>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!isLoggedIn) return;

    const fromTimestamp = getFromDateByTimeframe(timeframe);
    const from = fromTimestamp > 0 ? new Date(fromTimestamp).toISOString() : undefined;
    const dailySample = isDailySample(timeframe);

    setIsLoading(true);
    setError(undefined);
    getMargin(from, undefined, dailySample)
      .then(setData)
      .catch(() => setError(translate('screens/ledger', 'Failed to load data')))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, timeframe]);

  const options = useMemo(() => makeOptions(), []);

  const series = useMemo(() => {
    const periods = data?.periods ?? [];
    const point = (key: 'feeIncome' | 'executionCosts' | 'otherOpex' | 'realizedMargin' | 'fxPnl') =>
      periods.map((p) => [new Date(p.date).getTime(), Math.round(p[key] * 100) / 100]);
    return [
      { name: translate('screens/ledger', 'Fee Income'), data: point('feeIncome') },
      { name: translate('screens/ledger', 'Execution Costs'), data: point('executionCosts') },
      { name: translate('screens/ledger', 'Other Opex'), data: point('otherOpex') },
      { name: translate('screens/ledger', 'Realized Margin'), data: point('realizedMargin') },
      { name: translate('screens/ledger', 'FX P&L'), data: point('fxPnl') },
    ];
  }, [data, translate]);

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={translate('screens/ledger', 'Total Fee Income')}
          value={formatChf2OrDash(data?.totalFeeIncome)}
          color="#22c55e"
        />
        <SummaryCard
          label={translate('screens/ledger', 'Total Execution Costs')}
          value={formatChf2OrDash(data?.totalExecutionCosts)}
          color="#ef4444"
        />
        <SummaryCard
          label={translate('screens/ledger', 'Total Other Opex')}
          value={formatChf2OrDash(data?.totalOtherOpex)}
          color="#f97316"
        />
        <SummaryCard
          label={translate('screens/ledger', 'Total Realized Margin')}
          value={formatChf2OrDash(data?.totalRealizedMargin)}
          color="#3b82f6"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TIMEFRAME_OPTIONS.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className="rounded px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: tf === timeframe ? '#3b82f6' : '#EAECF0',
              color: tf === timeframe ? '#ffffff' : '#65728A',
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
      ) : error ? (
        <div className="text-dfxRed-150">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          <Chart type="area" height={350} options={options} series={series} />
        </div>
      )}
    </div>
  );
}
