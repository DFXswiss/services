import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { LogTraceTimeChart } from 'src/components/dashboard/log-trace-time-chart';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { LogQueryResult, ParsedTrace, parseTrace, useLogTracing } from 'src/hooks/log-tracing.hook';

// Dark-theme palette — matches dashboard-financial-overview.screen.tsx
const LABEL_COLOR = '#9AA5B8';
const TEXT_COLOR = '#ffffff';
const BORDER_COLOR = '#0A355C';
const BUTTON_BG = '#082948';
const BUTTON_BG_ACTIVE = '#3b82f6';
const SUBTLE_TEXT = '#D6DBE2';

// KQL granularity is hours; entries with `tightenToMs` are filtered client-side to a tighter window.
// `binMs` is the time-chart bucket width, chosen for ~30-100 buckets per range.
const TIME_RANGES: { label: string; hours: number; tightenToMs?: number; binMs: number }[] = [
  { label: '1 h', hours: 1, binMs: 60 * 1000 },
  { label: '15 min', hours: 1, tightenToMs: 15 * 60 * 1000, binMs: 30 * 1000 },
  { label: '6 h', hours: 6, binMs: 5 * 60 * 1000 },
  { label: '24 h', hours: 24, binMs: 15 * 60 * 1000 },
];
// 60s rather than tighter: at this rate, the /gs/debug/logs audit log (one entry
// per poll, ~60/h) is small enough vs real RealUnitTrace volume that audit
// entries don't crowd real traces out of the 200-row TRACES_BY_MESSAGE response.
const REFRESH_MS = 60_000;
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
  const rank = (p / 100) * (sorted.length - 1);
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
  return SUBTLE_TEXT;
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
      lastSeen: arr.reduce(
        (max, t) => (new Date(t.timestamp).getTime() > new Date(max).getTime() ? t.timestamp : max),
        arr[0].timestamp,
      ),
    }))
    .sort((a, b) => b.count - a.count);
}

export default function DashboardLogTracingRealunitScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'RealUnit Tracing', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getRealunitTraces } = useLogTracing();

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
        // Ranges with `tightenToMs` reuse a coarser KQL window and are filtered client-side.
        const cutoff = range.tightenToMs ? Date.now() - range.tightenToMs : 0;
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
      <div className="flex justify-center items-center w-full self-stretch bg-dfxBlue-800 min-h-screen">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  return (
    <div
      className="space-y-4 p-4 w-full self-stretch bg-dfxBlue-800 min-h-screen"
      style={{ color: TEXT_COLOR }}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Calls" value={String(stats.total)} dark />
        <SummaryCard label="5xx Errors" value={String(stats.errors5xx)} color={stats.errors5xx > 0 ? '#ef4444' : undefined} dark />
        <SummaryCard label="4xx Responses" value={String(stats.errors4xx)} color={stats.errors4xx > 0 ? '#f59e0b' : undefined} dark />
        <SummaryCard label={`Slow (≥${SLOW_MS}ms)`} value={String(stats.slow)} color={stats.slow > 0 ? '#f59e0b' : undefined} dark />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background: i === rangeIdx ? BUTTON_BG_ACTIVE : BUTTON_BG,
                color: i === rangeIdx ? TEXT_COLOR : SUBTLE_TEXT,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-xs ml-auto flex items-center gap-3" style={{ color: LABEL_COLOR }}>
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

      {/* Calls over time — gated on lastFetched so we don't paint with a Date.now() fallback */}
      {lastFetched && (
        <div className="bg-dfxBlue-700 rounded-lg shadow p-4">
          <LogTraceTimeChart
            traces={traces}
            windowMs={TIME_RANGES[rangeIdx].tightenToMs ?? TIME_RANGES[rangeIdx].hours * 60 * 60 * 1000}
            binMs={TIME_RANGES[rangeIdx].binMs}
            endTime={lastFetched.getTime()}
            dark
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top Endpoints */}
        <div className="bg-dfxBlue-700 rounded-lg shadow p-4 xl:col-span-2">
          <div className="text-lg font-semibold mb-3">Top Endpoints</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: LABEL_COLOR }} className="text-left">
                  <th className="py-1 pr-3 font-medium">Endpoint</th>
                  <th className="py-1 pr-3 font-medium text-right">Count</th>
                  <th className="py-1 pr-3 font-medium text-right">Errors</th>
                  <th className="py-1 pr-3 font-medium text-right">Median</th>
                  <th className="py-1 pr-3 font-medium text-right">p95</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e) => (
                  <tr key={e.key} className="border-t" style={{ borderColor: BORDER_COLOR }}>
                    <td className="py-1 pr-3 font-mono text-xs">
                      <span className="font-semibold mr-2">{e.method}</span>
                      {e.pathPattern}
                    </td>
                    <td className="py-1 pr-3 text-right">{e.count}</td>
                    <td className="py-1 pr-3 text-right" style={{ color: e.errors > 0 ? '#f59e0b' : LABEL_COLOR }}>
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
                    <td colSpan={5} className="py-4 text-center" style={{ color: LABEL_COLOR }}>
                      No traces in window
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top IPs */}
        <div className="bg-dfxBlue-700 rounded-lg shadow p-4">
          <div className="text-lg font-semibold mb-3">Top IPs</div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: LABEL_COLOR }} className="text-left">
                <th className="py-1 pr-3 font-medium">IP</th>
                <th className="py-1 pr-3 font-medium text-right">Calls</th>
                <th className="py-1 pr-3 font-medium text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {ips.map((ip) => (
                <tr key={ip.ip} className="border-t" style={{ borderColor: BORDER_COLOR }}>
                  <td className="py-1 pr-3 font-mono text-xs">{ip.ip}</td>
                  <td className="py-1 pr-3 text-right">{ip.count}</td>
                  <td className="py-1 pr-3 text-right text-xs" style={{ color: LABEL_COLOR }}>
                    {formatTime(ip.lastSeen)}
                  </td>
                </tr>
              ))}
              {ips.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center" style={{ color: LABEL_COLOR }}>
                    -
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dfxBlue-700 rounded-lg shadow p-4">
        <div className="text-lg font-semibold mb-3">Recent Activity (last {recent.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: LABEL_COLOR }} className="text-left">
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
                  style={{ borderColor: BORDER_COLOR }}
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
                  <td className="py-1 pr-3 font-mono text-xs" style={{ color: LABEL_COLOR }}>
                    {t.ip}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center" style={{ color: LABEL_COLOR }}>
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
