import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { FinancialLogEntry } from 'src/dto/dashboard.dto';

interface TotalBalanceShortChartProps {
  entries: FinancialLogEntry[];
}

export function TotalBalanceShortChart({ entries }: TotalBalanceShortChartProps) {
  const chartOptions = useMemo((): ApexOptions => {
    return {
      chart: {
        type: 'line',
        toolbar: { show: true },
        zoom: { enabled: true },
        background: '0',
      },
      stroke: { width: [3, 2, 2], curve: 'smooth' },
      colors: ['#3b82f6', '#22c55e', '#ef4444'],
      dataLabels: { enabled: false },
      grid: { borderColor: '#e5e7eb' },
      xaxis: {
        type: 'datetime',
        labels: { datetimeUTC: false, format: 'dd MMM HH:mm' },
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
      legend: { position: 'top' },
    };
  }, []);

  const chartSeries = useMemo(() => {
    return [
      {
        name: 'Total Balance',
        data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.totalBalanceChf)]),
      },
      {
        name: 'Plus Balance',
        data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.plusBalanceChf)]),
      },
      {
        name: 'Minus Balance',
        data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.minusBalanceChf)]),
      },
    ];
  }, [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Balance Breakdown (Short-term)</h3>
      <Chart type="line" height={300} options={chartOptions} series={chartSeries} />
    </div>
  );
}
