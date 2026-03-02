import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { FinancialLogEntry } from 'src/dto/dashboard.dto';

interface LatestBalanceBarChartProps {
  entry: FinancialLogEntry | undefined;
}

export function LatestBalanceBarChart({ entry }: LatestBalanceBarChartProps) {
  const { categories, values, colors } = useMemo(() => {
    if (!entry) return { categories: [], values: [], colors: [] };

    const items = Object.entries(entry.balancesByType)
      .map(([type, b]) => ({
        type,
        net: b.plusBalanceChf - b.minusBalanceChf,
      }))
      .sort((a, b) => b.net - a.net);

    return {
      categories: items.map((i) => i.type),
      values: items.map((i) => Math.round(i.net)),
      colors: items.map((i) => (i.net >= 0 ? '#22c55e' : '#ef4444')),
    };
  }, [entry]);

  const chartOptions = useMemo((): ApexOptions => {
    return {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        background: '0',
      },
      plotOptions: {
        bar: { distributed: true, borderRadius: 4 },
      },
      colors,
      dataLabels: { enabled: false },
      grid: { borderColor: '#e5e7eb' },
      xaxis: { categories },
      yaxis: {
        title: { text: 'Net Balance (CHF)' },
        labels: {
          formatter: (val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0),
        },
      },
      tooltip: {
        y: { formatter: (val: number) => `${val.toLocaleString('de-CH')} CHF` },
      },
      legend: { show: false },
    };
  }, [categories, colors]);

  const chartSeries = useMemo(() => {
    return [{ name: 'Net Balance', data: values }];
  }, [values]);

  if (!entry) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Latest Balance by Type</h3>
      <Chart type="bar" height={300} options={chartOptions} series={chartSeries} />
    </div>
  );
}
