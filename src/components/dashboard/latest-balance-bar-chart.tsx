import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { BalanceByGroup } from 'src/dto/dashboard.dto';

interface BalanceBarChartProps {
  title: string;
  data: BalanceByGroup[];
}

const ASSET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#64748b',
];

export function BalanceBarChart({ title, data }: BalanceBarChartProps) {
  const hasAssets = data.some((d) => d.assets && Object.keys(d.assets).length > 0);

  const sorted = useMemo(() => {
    const others = data.filter((i) => i.name === 'Other');
    const rest = data.filter((i) => i.name !== 'Other').sort((a, b) => b.netBalanceChf - a.netBalanceChf);
    return [...rest, ...others];
  }, [data]);

  if (data.length === 0) return null;

  if (hasAssets) return <StackedBarChart title={title} data={sorted} />;
  return <SimpleBarChart title={title} data={sorted} />;
}

function SimpleBarChart({ title, data }: { title: string; data: BalanceByGroup[] }) {
  const categories = data.map((i) => i.name);
  const values = data.map((i) => Math.round(i.netBalanceChf));
  const colors = data.map((i) => (i.netBalanceChf >= 0 ? '#22c55e' : '#ef4444'));

  const options = useMemo((): ApexOptions => ({
    chart: { type: 'bar', toolbar: { show: false }, background: '0' },
    plotOptions: { bar: { distributed: true, borderRadius: 4 } },
    colors,
    dataLabels: { enabled: false },
    grid: { borderColor: '#e5e7eb' },
    xaxis: { categories },
    yaxis: {
      title: { text: 'Net Balance (CHF)' },
      labels: { formatter: (val: number) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0) },
    },
    tooltip: { y: { formatter: (val: number) => `${val.toLocaleString('de-CH')} CHF` } },
    legend: { show: false },
  }), [categories, colors]);

  const series = useMemo(() => [{ name: 'Net Balance', data: values }], [values]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <Chart type="bar" height={300} options={options} series={series} />
    </div>
  );
}

function StackedBarChart({ title, data }: { title: string; data: BalanceByGroup[] }) {
  const { categories, assetNames, series } = useMemo(() => {
    const cats = data.map((d) => d.name);

    // Collect all asset names across all blockchains
    const assetSet = new Set<string>();
    for (const d of data) {
      if (d.assets) Object.keys(d.assets).forEach((a) => assetSet.add(a));
    }
    const names = Array.from(assetSet).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      // Sort by total across all blockchains
      const totalA = data.reduce((s, d) => s + (d.assets?.[a] ?? 0), 0);
      const totalB = data.reduce((s, d) => s + (d.assets?.[b] ?? 0), 0);
      return totalB - totalA;
    });

    const seriesData = names.map((assetName) => ({
      name: assetName,
      data: cats.map((_, i) => Math.round(data[i].assets?.[assetName] ?? 0)),
    }));

    return { categories: cats, assetNames: names, series: seriesData };
  }, [data]);

  const options = useMemo((): ApexOptions => ({
    chart: { type: 'bar', stacked: true, toolbar: { show: false }, background: '0' },
    plotOptions: { bar: { borderRadius: 4, borderRadiusWhenStacked: 'last' as any } },
    colors: assetNames.map((_, i) => ASSET_COLORS[i % ASSET_COLORS.length]),
    dataLabels: { enabled: false },
    grid: { borderColor: '#e5e7eb' },
    xaxis: { categories },
    yaxis: {
      title: { text: 'Balance (CHF)' },
      labels: { formatter: (val: number) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0) },
    },
    tooltip: { y: { formatter: (val: number) => `${val.toLocaleString('de-CH')} CHF` } },
    legend: { position: 'bottom' },
  }), [categories, assetNames]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <Chart type="bar" height={400} options={options} series={series} />
    </div>
  );
}
