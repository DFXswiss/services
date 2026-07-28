import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { FinancialLogEntry } from 'src/dto/dashboard.dto';
import { TimeRange } from 'src/util/chart';

interface Props {
  entries: FinancialLogEntry[];
  timeRange?: TimeRange;
  dark?: boolean;
}

function makeBaseOptions(timeRange?: TimeRange, dark?: boolean): ApexOptions {
  return {
    chart: {
      type: 'line',
      toolbar: { show: true, offsetY: -5 },
      zoom: { enabled: true },
      background: '0',
    },
    theme: { mode: dark ? 'dark' : 'light' },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? '#0A355C' : '#e5e7eb' },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, format: 'dd MMM HH:mm' },
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
  };
}

export function ShortTermPlusChart({ entries, timeRange, dark }: Props) {
  const options = useMemo((): ApexOptions => ({ ...makeBaseOptions(timeRange, dark), colors: ['#22c55e'] }), [timeRange, dark]);
  const series = useMemo(() => [
    { name: 'Plus Balance', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.plusBalanceChf)]) },
  ], [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Plus Balance</h3>
      <Chart type="line" height={250} options={options} series={series} />
    </div>
  );
}

export function ShortTermMinusChart({ entries, timeRange, dark }: Props) {
  const options = useMemo((): ApexOptions => ({ ...makeBaseOptions(timeRange, dark), colors: ['#ef4444'] }), [timeRange, dark]);
  const series = useMemo(() => [
    { name: 'Minus Balance', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minusBalanceChf)]) },
  ], [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Minus Balance</h3>
      <Chart type="line" height={250} options={options} series={series} />
    </div>
  );
}

export function ShortTermTotalChart({ entries, timeRange, dark }: Props) {
  const options = useMemo((): ApexOptions => ({ ...makeBaseOptions(timeRange, dark), colors: ['#3b82f6'] }), [timeRange, dark]);
  const series = useMemo(() => [
    { name: 'Total Balance', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.totalBalanceChf)]) },
  ], [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Total Balance</h3>
      <Chart type="line" height={250} options={options} series={series} />
    </div>
  );
}
