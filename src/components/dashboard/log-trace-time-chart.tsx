import { ApexOptions } from 'apexcharts';
import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ParsedTrace } from 'src/hooks/log-tracing.hook';

interface Props {
  traces: ParsedTrace[];
  windowMs: number;
  binMs: number;
  endTime: number;
  dark?: boolean;
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

export function LogTraceTimeChart({ traces, windowMs, binMs, endTime, dark }: Props): JSX.Element {
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
        // Re-enabled: pulses are rare enough at the every-60s refresh cadence
        // that a smooth transition is preferable to an instant snap.
        animations: { enabled: true },
        background: '0',
      },
      theme: { mode: dark ? 'dark' : 'light' },
      stroke: { width: 1.5, curve: 'smooth' },
      colors: ['#22c55e', '#ef4444'],
      dataLabels: { enabled: false },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
      grid: { borderColor: dark ? '#0A355C' : '#e5e7eb' },
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
    [endTime, windowMs, dark],
  );

  return (
    <div>
      <div className="text-sm font-semibold mb-2">Calls over time</div>
      <Chart type="area" height={260} options={options} series={series} />
    </div>
  );
}
