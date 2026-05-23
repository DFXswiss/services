import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ParsedTrace } from 'src/hooks/realunit-tracing.hook';

interface Props {
  traces: ParsedTrace[];
  windowMs: number;
  binMs: number;
  endTime: number;
}

interface Bucket {
  normal: number;
  errors: number;
}

function bucketize(traces: ParsedTrace[], startTime: number, endTime: number, binMs: number): Bucket[] {
  const numBins = Math.max(1, Math.ceil((endTime - startTime) / binMs));
  const buckets: Bucket[] = Array.from({ length: numBins }, () => ({ normal: 0, errors: 0 }));
  for (const t of traces) {
    const ts = new Date(t.timestamp).getTime();
    if (ts < startTime || ts > endTime) continue;
    const idx = Math.min(numBins - 1, Math.floor((ts - startTime) / binMs));
    if (t.status >= 400) {
      buckets[idx].errors += 1;
    } else {
      buckets[idx].normal += 1;
    }
  }
  return buckets;
}

export function RealUnitTraceTimeChart({ traces, windowMs, binMs, endTime }: Props): JSX.Element {
  const series = useMemo(() => {
    const startTime = endTime - windowMs;
    const buckets = bucketize(traces, startTime, endTime, binMs);
    const normalData = buckets.map((b, i) => [startTime + i * binMs, b.normal] as [number, number]);
    const errorData = buckets.map((b, i) => [startTime + i * binMs, b.errors] as [number, number]);
    return [
      { name: '2xx / 3xx', data: normalData },
      { name: '4xx / 5xx', data: errorData },
    ];
  }, [traces, endTime, windowMs, binMs]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'area',
        stacked: true,
        toolbar: { show: false },
        // Disable animations: this chart re-renders every 5s; animations make
        // the refresh feel jittery.
        animations: { enabled: false },
        background: '0',
      },
      stroke: { width: 1.5, curve: 'smooth' },
      colors: ['#22c55e', '#ef4444'],
      dataLabels: { enabled: false },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
      grid: { borderColor: '#e5e7eb' },
      xaxis: {
        type: 'datetime',
        labels: { datetimeUTC: false, format: 'HH:mm' },
        min: endTime - windowMs,
        max: endTime,
      },
      yaxis: {
        title: { text: 'Calls / bin' },
        labels: { formatter: (val: number) => String(Math.round(val)) },
        forceNiceScale: true,
      },
      tooltip: {
        x: { format: 'dd MMM HH:mm' },
        y: { formatter: (val: number) => String(Math.round(val)) },
      },
      legend: { position: 'bottom' },
    }),
    [endTime, windowMs],
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-lg font-semibold mb-2">Calls over time</div>
      <Chart type="area" height={260} options={options} series={series} />
    </div>
  );
}
