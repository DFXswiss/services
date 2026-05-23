import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { LogQueryResult, ParsedTrace, parseTrace, useRealunitTracing } from 'src/hooks/realunit-tracing.hook';

// KQL granularity is hours; we tighten client-side for the 15 min window.
const TIME_RANGES: { label: string; hours: number }[] = [
  { label: '1 h', hours: 1 },
  { label: '15 min', hours: 1 },
  { label: '6 h', hours: 6 },
  { label: '24 h', hours: 24 },
];
const REFRESH_MS = 5000;
const SLOW_MS = 2000;
const VERY_SLOW_MS = 5000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = ((p / 100) * (sorted.length - 1));
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo));
}

function statusColor(status: number): string {
  if (status >= 500) return '#ef4444';
  if (status >= 400) return '#f59e0b';
  if (status >= 300) return '#3b82f6';
  return '#22c55e';
}

function durationColor(ms: number): string {
  if (ms >= VERY_SLOW_MS) return '#ef4444';
  if (ms >= SLOW_MS) return '#f59e0b';
  return '#111827';
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function colIdx(result: LogQueryResult, name: string): number {
  return result.columns.findIndex((c) => c.name === name);
}

function rowsToTraces(result: LogQueryResult): ParsedTrace[] {
  const tsIdx = colIdx(result, 'timestamp');
  const msgIdx = colIdx(result, 'message');
  if (tsIdx === -1 || msgIdx === -1) return [];
  return result.rows
    .map((row) => parseTrace(String(row[tsIdx]), String(row[msgIdx])))
    .filter((t): t is ParsedTrace => t !== null);
}

interface SummaryCardProps {
  label: string;
  value: string;
  color?: string;
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
        {label}
      </div>
      <div className="text-2xl font-bold mt-1" style={{ color: color ?? '#111827' }}>
        {value}
      </div>
    </div>
  );
}

interface EndpointStat {
  key: string;
  method: string;
  pathPattern: string;
  count: number;
  median: number;
  p95: number;
  errors: number;
}

function aggregateEndpoints(traces: ParsedTrace[]): EndpointStat[] {
  const buckets = new Map<string, ParsedTrace[]>();
  for (const t of traces) {
    const key = `${t.method} ${t.pathPattern}`;
    const arr = buckets.get(key) ?? [];
    arr.push(t);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries())
    .map(([key, arr]) => {
      const durations = arr.map((t) => t.durationMs);
      return {
        key,
        method: arr[0].method,
        pathPattern: arr[0].pathPattern,
        count: arr.length,
        median: median(durations),
        p95: percentile(durations, 95),
        errors: arr.filter((t) => t.status >= 400).length,
      };
    })
    .sort((a, b) => b.count - a.count);
}

interface IpStat {
  ip: string;
  count: number;
  lastSeen: string;
}

function aggregateIps(traces: ParsedTrace[]): IpStat[] {
  const buckets = new Map<string, ParsedTrace[]>();
  for (const t of traces) {
    const arr = buckets.get(t.ip) ?? [];
    arr.push(t);
    buckets.set(t.ip, arr);
  }
  return Array.from(buckets.entries())
    .map(([ip, arr]) => ({
      ip,
      count: arr.length,
      lastSeen: arr.reduce((max, t) => (t.timestamp > max ? t.timestamp : max), arr[0].timestamp),
    }))
    .sort((a, b) => b.count - a.count);
}

export default function DashboardRealunitTracingScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'RealUnit Tracing', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getRealunitTraces } = useRealunitTracing();

  const [rangeIdx, setRangeIdx] = useState(0); // default: 1h (first option)
  const [traces, setTraces] = useState<ParsedTrace[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    const run = async () => {
      setIsRefreshing(true);
      try {
        const range = TIME_RANGES[rangeIdx];
        const result = await getRealunitTraces(range.hours);
        if (cancelled) return;
        const parsed = rowsToTraces(result);
        // '15 min' shares the 1h API window with '1 h'; tighten client-side.
        const cutoff = range.label === '15 min' ? Date.now() - 15 * 60 * 1000 : 0;
        setTraces(cutoff ? parsed.filter((t) => new Date(t.timestamp).getTime() >= cutoff) : parsed);
        setLastFetched(new Date());
        setFetchError(null);
      } catch (e) {
        if (cancelled) return;
        setFetchError(e instanceof Error ? e.message : 'unknown error');
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    run();
    const interval = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoggedIn, rangeIdx, getRealunitTraces]);

  const stats = useMemo(() => {
    const total = traces.length;
    const errors5xx = traces.filter((t) => t.status >= 500).length;
    const errors4xx = traces.filter((t) => t.status >= 400 && t.status < 500).length;
    const slow = traces.filter((t) => t.durationMs >= SLOW_MS).length;
    return { total, errors5xx, errors4xx, slow };
  }, [traces]);

  const endpoints = useMemo(() => aggregateEndpoints(traces).slice(0, 12), [traces]);
  const ips = useMemo(() => aggregateIps(traces).slice(0, 10), [traces]);
  const recent = useMemo(
    () =>
      [...traces]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 30),
    [traces],
  );

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-3 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                i === rangeIdx ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-xs ml-auto flex items-center gap-3" style={{ color: '#6b7280' }}>
          {fetchError ? (
            <span style={{ color: '#ef4444' }}>Fetch failed: {fetchError}</span>
          ) : (
            <span>
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: '#22c55e' }} />
              live · refresh {REFRESH_MS / 1000}s
            </span>
          )}
          <span>last update {lastFetched ? lastFetched.toLocaleTimeString('de-CH') : '-'}</span>
          {isRefreshing && <span>loading…</span>}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Calls" value={String(stats.total)} />
        <SummaryCard label="5xx Errors" value={String(stats.errors5xx)} color={stats.errors5xx > 0 ? '#ef4444' : undefined} />
        <SummaryCard label="4xx Responses" value={String(stats.errors4xx)} color={stats.errors4xx > 0 ? '#f59e0b' : undefined} />
        <SummaryCard label={`Slow (≥${SLOW_MS}ms)`} value={String(stats.slow)} color={stats.slow > 0 ? '#f59e0b' : undefined} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top Endpoints */}
        <div className="bg-white rounded-lg shadow p-4 xl:col-span-2">
          <div className="text-lg font-semibold mb-3">Top Endpoints</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: '#6b7280' }} className="text-left">
                  <th className="py-1 pr-3 font-medium">Endpoint</th>
                  <th className="py-1 pr-3 font-medium text-right">Count</th>
                  <th className="py-1 pr-3 font-medium text-right">Errors</th>
                  <th className="py-1 pr-3 font-medium text-right">Median</th>
                  <th className="py-1 pr-3 font-medium text-right">p95</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e) => (
                  <tr key={e.key} className="border-t" style={{ borderColor: '#f3f4f6' }}>
                    <td className="py-1 pr-3 font-mono text-xs">
                      <span className="font-semibold mr-2">{e.method}</span>
                      {e.pathPattern}
                    </td>
                    <td className="py-1 pr-3 text-right">{e.count}</td>
                    <td className="py-1 pr-3 text-right" style={{ color: e.errors > 0 ? '#f59e0b' : '#6b7280' }}>
                      {e.errors}
                    </td>
                    <td className="py-1 pr-3 text-right" style={{ color: durationColor(e.median) }}>
                      {formatMs(e.median)}
                    </td>
                    <td className="py-1 pr-3 text-right" style={{ color: durationColor(e.p95) }}>
                      {formatMs(e.p95)}
                    </td>
                  </tr>
                ))}
                {endpoints.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center" style={{ color: '#6b7280' }}>
                      No traces in window
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top IPs */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-lg font-semibold mb-3">Top IPs</div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6b7280' }} className="text-left">
                <th className="py-1 pr-3 font-medium">IP</th>
                <th className="py-1 pr-3 font-medium text-right">Calls</th>
                <th className="py-1 pr-3 font-medium text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((ip) => (
                <tr key={ip.ip} className="border-t" style={{ borderColor: '#f3f4f6' }}>
                  <td className="py-1 pr-3 font-mono text-xs">{ip.ip}</td>
                  <td className="py-1 pr-3 text-right">{ip.count}</td>
                  <td className="py-1 pr-3 text-right text-xs" style={{ color: '#6b7280' }}>
                    {formatTime(ip.lastSeen)}
                  </td>
                </tr>
              ))}
              {ips.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center" style={{ color: '#6b7280' }}>
                    -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-lg font-semibold mb-3">Recent Activity (last {recent.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6b7280' }} className="text-left">
                <th className="py-1 pr-3 font-medium">Time</th>
                <th className="py-1 pr-3 font-medium">Method</th>
                <th className="py-1 pr-3 font-medium">URL</th>
                <th className="py-1 pr-3 font-medium text-right">Status</th>
                <th className="py-1 pr-3 font-medium text-right">Duration</th>
                <th className="py-1 pr-3 font-medium">Client</th>
                <th className="py-1 pr-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr
                  key={`${t.timestamp}-${t.method}-${t.url}-${t.status}`}
                  className="border-t"
                  style={{ borderColor: '#f3f4f6' }}
                >
                  <td className="py-1 pr-3 font-mono text-xs whitespace-nowrap">{formatTime(t.timestamp)}</td>
                  <td className="py-1 pr-3 font-mono text-xs font-semibold">{t.method}</td>
                  <td className="py-1 pr-3 font-mono text-xs break-all">{t.url}</td>
                  <td
                    className="py-1 pr-3 text-right font-mono text-xs font-semibold"
                    style={{ color: statusColor(t.status) }}
                  >
                    {t.status}
                  </td>
                  <td
                    className="py-1 pr-3 text-right font-mono text-xs"
                    style={{ color: durationColor(t.durationMs) }}
                  >
                    {formatMs(t.durationMs)}
                  </td>
                  <td className="py-1 pr-3 text-xs">{t.client}</td>
                  <td className="py-1 pr-3 font-mono text-xs" style={{ color: '#6b7280' }}>
                    {t.ip}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center" style={{ color: '#6b7280' }}>
                    No traces yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
