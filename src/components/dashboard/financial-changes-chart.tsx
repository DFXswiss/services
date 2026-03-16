import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { FinancialChangesEntry } from 'src/dto/dashboard.dto';
import { TimeRange } from 'src/screens/dashboard-financial-history.screen';

interface FinancialChangesChartProps {
  entries: FinancialChangesEntry[];
  timeRange?: TimeRange;
}

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function makeBaseOptions(timeRange?: TimeRange): ApexOptions {
  const isShortRange = timeRange && (timeRange.max - timeRange.min) < FOUR_DAYS_MS;

  return {
    chart: {
      type: 'area',
      toolbar: { show: true, offsetY: -5 },
      zoom: { enabled: true },
      background: '0',
    },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    grid: { borderColor: '#e5e7eb' },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, format: isShortRange ? 'dd MMM HH:mm' : 'dd MMM yy' },
      ...(timeRange && { min: timeRange.min, max: timeRange.max }),
    },
    yaxis: {
      title: { text: 'CHF (cumulative)' },
      labels: {
        formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0),
      },
    },
    tooltip: {
      x: { format: 'dd MMM yyyy HH:mm' },
      y: { formatter: (val: number) => `${val.toLocaleString('de-CH', { maximumFractionDigits: 0 })} CHF` },
    },
    legend: { position: 'bottom' },
  };
}

export function FinancialChangesTotalChart({ entries, timeRange }: FinancialChangesChartProps) {
  const options = useMemo((): ApexOptions => ({ ...makeBaseOptions(timeRange), colors: ['#22c55e'] }), [timeRange]);

  const series = useMemo(() => [
    { name: 'Net Total', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.total)]) },
  ], [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Net Total (cumulative)</h3>
      <Chart type="area" height={250} options={options} series={series} />
    </div>
  );
}

export function FinancialChangesPlusChart({ entries, timeRange }: FinancialChangesChartProps) {
  const options = useMemo((): ApexOptions => ({ ...makeBaseOptions(timeRange), colors: ['#3b82f6', '#f97316', '#8b5cf6', '#64748b'] }), [timeRange]);

  const series = useMemo(() => [
    { name: 'BuyCrypto', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.plus.buyCrypto)]) },
    { name: 'BuyFiat', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.plus.buyFiat)]) },
    { name: 'PaymentLink', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.plus.paymentLink)]) },
    { name: 'Trading', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.plus.trading)]) },
  ], [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Income / Plus (cumulative)</h3>
      <Chart type="area" height={250} options={options} series={series} />
    </div>
  );
}

interface FinancialChangesMinusChartProps extends FinancialChangesChartProps {
  onDetails?: () => void;
}

export function FinancialChangesMinusChart({ entries, timeRange, onDetails }: FinancialChangesMinusChartProps) {
  const options = useMemo((): ApexOptions => ({ ...makeBaseOptions(timeRange), colors: ['#ef4444', '#f97316', '#64748b', '#6366f1', '#14b8a6'] }), [timeRange]);

  const series = useMemo(() => [
    { name: 'Referral', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minus.ref.total)]) },
    { name: 'Binance', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minus.binance.total)]) },
    { name: 'Blockchain', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minus.blockchain.total)]) },
    { name: 'Bank', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minus.bank ?? 0)]) },
    { name: 'Kraken', data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minus.kraken?.total ?? 0)]) },
  ], [entries]);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Expenses / Minus (cumulative)</h3>
        {onDetails && (
          <button onClick={onDetails} className="text-xs font-medium px-3 py-1 rounded" style={{ color: '#3b82f6', background: '#eff6ff' }}>
            Details
          </button>
        )}
      </div>
      <Chart type="area" height={250} options={options} series={series} />
    </div>
  );
}
