import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { FinancialLogEntry } from 'src/dto/dashboard.dto';
import { TimeRange } from 'src/screens/dashboard-financial-history.screen';

interface Props {
  entries: FinancialLogEntry[];
  timeRange?: TimeRange;
}

const TYPE_COLORS: Record<string, string> = {
  DEPS: '#3b82f6',
  CHF: '#22c55e',
  EUR: '#f59e0b',
  USD: '#8b5cf6',
  BTC: '#f97316',
};

const DEFAULT_COLOR = '#6b7280';

function useFinancialTypes(entries: FinancialLogEntry[]) {
  return useMemo(() => {
    const types = new Set<string>();
    for (const entry of entries) {
      for (const type of Object.keys(entry.balancesByType)) {
        types.add(type);
      }
    }
    return Array.from(types).sort();
  }, [entries]);
}

function makeOptions(financialTypes: string[], timeRange?: TimeRange): ApexOptions {
  return {
    chart: {
      type: 'area',
      stacked: true,
      toolbar: { show: true, offsetY: -5 },
      zoom: { enabled: true },
      background: '0',
    },
    stroke: { width: 1, curve: 'smooth' },
    colors: financialTypes.map((t) => TYPE_COLORS[t] ?? DEFAULT_COLOR),
    dataLabels: { enabled: false },
    grid: { borderColor: '#e5e7eb' },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, format: 'dd MMM yy' },
      ...(timeRange && { min: timeRange.min, max: timeRange.max }),
    },
    yaxis: {
      title: { text: 'CHF' },
      labels: {
        formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0),
      },
    },
    tooltip: {
      x: { format: 'dd MMM yyyy HH:mm' },
      y: { formatter: (val: number) => `${val.toLocaleString('de-CH')} CHF` },
    },
    legend: { position: 'bottom' },
    fill: { type: 'solid', opacity: 0.6 },
  };
}

export function BalanceByTypePlusChart({ entries, timeRange }: Props) {
  const financialTypes = useFinancialTypes(entries);
  const options = useMemo(() => makeOptions(financialTypes, timeRange), [financialTypes, timeRange]);

  const series = useMemo(() => financialTypes.map((type) => ({
    name: type,
    data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.balancesByType[type]?.plusBalanceChf ?? 0)]),
  })), [entries, financialTypes]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Plus Balance by Type</h3>
      <Chart type="area" height={300} options={options} series={series} />
    </div>
  );
}

export function BalanceByTypeMinusChart({ entries, timeRange }: Props) {
  const financialTypes = useFinancialTypes(entries);
  const options = useMemo(() => makeOptions(financialTypes, timeRange), [financialTypes, timeRange]);

  const series = useMemo(() => financialTypes.map((type) => ({
    name: type,
    data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.balancesByType[type]?.minusBalanceChf ?? 0)]),
  })), [entries, financialTypes]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Minus Balance by Type</h3>
      <Chart type="area" height={300} options={options} series={series} />
    </div>
  );
}

export function BalanceByTypeTotalChart({ entries, timeRange }: Props) {
  const financialTypes = useFinancialTypes(entries);
  const options = useMemo(() => makeOptions(financialTypes, timeRange), [financialTypes, timeRange]);

  const series = useMemo(() => financialTypes.map((type) => ({
    name: type,
    data: entries.map((e) => {
      const b = e.balancesByType[type];
      const net = b ? b.plusBalanceChf - b.minusBalanceChf : 0;
      return [new Date(e.timestamp).getTime(), Math.round(net)];
    }),
  })), [entries, financialTypes]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Net Balance by Type</h3>
      <Chart type="area" height={300} options={options} series={series} />
    </div>
  );
}
