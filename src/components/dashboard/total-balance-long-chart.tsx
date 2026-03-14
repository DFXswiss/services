import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { FinancialLogEntry } from 'src/dto/dashboard.dto';

interface TotalBalanceLongChartProps {
  entries: FinancialLogEntry[];
}

export function TotalBalanceLongChart({ entries }: TotalBalanceLongChartProps) {
  const chartOptions = useMemo((): ApexOptions => {
    return {
      chart: {
        type: 'line',
        toolbar: { show: true },
        zoom: { enabled: true },
        background: '0',
      },
      stroke: { width: [3, 3], curve: 'smooth' },
      colors: ['#22c55e', '#f97316'],
      dataLabels: { enabled: false },
      grid: { borderColor: '#e5e7eb' },
      xaxis: {
        type: 'datetime',
        labels: { datetimeUTC: false, format: 'dd MMM yy' },
      },
      yaxis: [
        {
          title: { text: 'Total Balance (CHF)' },
          labels: {
            formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0),
          },
        },
        {
          opposite: true,
          title: { text: 'BTC Price (CHF)' },
          labels: {
            formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0),
          },
        },
      ],
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
        name: 'Total Balance (CHF)',
        data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.totalBalanceChf)]),
      },
      {
        name: 'BTC Price (CHF)',
        data: entries.map((e) => [new Date(e.timestamp).getTime(), Math.round(e.btcPriceChf)]),
      },
    ];
  }, [entries]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Total Balance vs BTC Price (Long-term)</h3>
      <Chart type="line" height={300} options={chartOptions} series={chartSeries} />
    </div>
  );
}
