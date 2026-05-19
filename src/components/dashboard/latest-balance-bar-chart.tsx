import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { BalanceByGroup } from 'src/dto/dashboard.dto';

interface BalanceBarChartProps {
  title: string;
  data: BalanceByGroup[];
  dark?: boolean;
}

const FALLBACK_ASSET_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#64748b',
];

const ASSET_COLOR_RULES: Array<{ test: (upper: string) => boolean; color: string }> = [
  { test: (u) => u.includes('BTC'), color: '#f97316' }, // orange — BTC family
  { test: (u) => u.includes('USD'), color: '#22c55e' }, // green — USD family
  { test: (u) => u.includes('EUR'), color: '#3b82f6' }, // blue — EUR family
  { test: (u) => u.includes('CHF'), color: '#ef4444' }, // red — CHF family
];

function assetColor(name: string, fallbackIndex: number): string {
  const upper = name.toUpperCase();
  for (const rule of ASSET_COLOR_RULES) {
    if (rule.test(upper)) return rule.color;
  }
  return FALLBACK_ASSET_COLORS[fallbackIndex % FALLBACK_ASSET_COLORS.length];
}

export function BalanceBarChart({ title, data, dark }: BalanceBarChartProps) {
  const hasAssets = data.some((d) => d.assets && Object.keys(d.assets).length > 0);

  const sorted = useMemo(() => {
    const others = data.filter((i) => i.name === 'Other');
    const rest = data.filter((i) => i.name !== 'Other').sort((a, b) => b.netBalanceChf - a.netBalanceChf);
    return [...rest, ...others];
  }, [data]);

  if (data.length === 0) return null;

  if (hasAssets) return <StackedBarChart title={title} data={sorted} dark={dark} />;
  return <SimpleBarChart title={title} data={sorted} dark={dark} />;
}

function SimpleBarChart({ title, data, dark }: { title: string; data: BalanceByGroup[]; dark?: boolean }) {
  const categories = data.map((i) => i.name);
  const values = data.map((i) => Math.round(i.netBalanceChf));
  const colors = data.map((i) => (i.netBalanceChf >= 0 ? '#22c55e' : '#ef4444'));

  const options = useMemo((): ApexOptions => ({
    chart: { type: 'bar', toolbar: { show: false }, background: '0' },
    theme: { mode: dark ? 'dark' : 'light' },
    plotOptions: { bar: { distributed: true, borderRadius: 4 } },
    colors,
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? '#1f3a5c' : '#e5e7eb' },
    xaxis: { categories },
    yaxis: {
      title: { text: 'Net Balance (CHF)' },
      labels: { formatter: (val: number) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0) },
    },
    tooltip: { y: { formatter: (val: number) => `${val.toLocaleString('de-CH')} CHF` } },
    legend: { show: false },
  }), [categories, colors, dark]);

  const series = useMemo(() => [{ name: 'Net Balance', data: values }], [values]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <Chart type="bar" height={300} options={options} series={series} />
    </div>
  );
}

function StackedBarChart({ title, data, dark }: { title: string; data: BalanceByGroup[]; dark?: boolean }) {
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
    theme: { mode: dark ? 'dark' : 'light' },
    plotOptions: { bar: { borderRadius: 4, borderRadiusWhenStacked: 'last' as any } },
    colors: assetNames.map((name, i) => assetColor(name, i)),
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? '#1f3a5c' : '#e5e7eb' },
    xaxis: { categories },
    yaxis: {
      title: { text: 'Balance (CHF)' },
      labels: { formatter: (val: number) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0) },
    },
    tooltip: { y: { formatter: (val: number) => `${val.toLocaleString('de-CH')} CHF` } },
    legend: { position: 'bottom' },
  }), [categories, assetNames, dark]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <Chart type="bar" height={400} options={options} series={series} />
    </div>
  );
}
