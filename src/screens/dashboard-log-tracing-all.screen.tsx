import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { GenericTrace, LogQueryResult, parseGenericTrace, useLogTracing } from 'src/hooks/log-tracing.hook';

// Dark-theme palette — matches dashboard-financial-overview.screen.tsx
const LABEL_COLOR = '#9AA5B8';
const TEXT_COLOR = '#ffffff';
const BORDER_COLOR = '#0A355C';
const BUTTON_BG = '#082948';
const BUTTON_BG_ACTIVE = '#3b82f6';
const SUBTLE_TEXT = '#D6DBE2';

const TIME_RANGES: { label: string; hours: number }[] = [
  { label: '1 h', hours: 1 },
  { label: '6 h', hours: 6 },
  { label: '24 h', hours: 24 },
];

// 60s rather than tighter: matches the RealUnit screen so /gs/debug/logs
// audit volume from this dashboard stays comparable.
const REFRESH_MS = 60_000;
const MAX_MESSAGE_LEN = 240;

interface SeverityStyle {
  label: string;
  color: string;
}

const SEVERITY_STYLES: Record<number, SeverityStyle> = {
  0: { label: 'verbose', color: '#6b7280' },
  1: { label: 'info', color: '#9AA5B8' },
  2: { label: 'warn', color: '#f59e0b' },
  3: { label: 'error', color: '#ef4444' },
  4: { label: 'critical', color: '#ef4444' },
};

function severityStyle(level: number): SeverityStyle {
  return SEVERITY_STYLES[level] ?? { label: String(level), color: LABEL_COLOR };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function colIdx(result: LogQueryResult, name: string): number {
  return result.columns.findIndex((c) => c.name === name);
}

function rowsToGenericTraces(result: LogQueryResult): GenericTrace[] {
  const tsIdx = colIdx(result, 'timestamp');
  const sevIdx = colIdx(result, 'severityLevel');
  const msgIdx = colIdx(result, 'message');
  const opIdx = colIdx(result, 'operation_Id');
  if (tsIdx === -1 || sevIdx === -1 || msgIdx === -1) return [];
  return result.rows.map((row) => {
    const sevRaw = row[sevIdx];
    const severity = typeof sevRaw === 'number' ? sevRaw : parseInt(String(sevRaw), 10);
    const operationId = opIdx === -1 ? '' : String(row[opIdx] ?? '');
    return parseGenericTrace(String(row[tsIdx]), severity, String(row[msgIdx]), operationId);
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export default function DashboardLogTracingAllScreen(): JSX.Element {
  // Backend /gs/debug/logs is RoleGuard(DEBUG); additionalRoles allows
  // ADMIN+SUPER_ADMIN, but not REALUNIT — so admin-only is the right gate.
  useAdminGuard();
  useLayoutOptions({ title: 'All Logs', noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getAllTraces } = useLogTracing();

  const [rangeIdx, setRangeIdx] = useState(0); // default: 1h
  const [traces, setTraces] = useState<GenericTrace[]>([]);
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
        const result = await getAllTraces(range.hours);
        if (cancelled) return;
        setTraces(rowsToGenericTraces(result));
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
  }, [isLoggedIn, rangeIdx, getAllTraces]);

  const stats = useMemo(() => {
    const total = traces.length;
    const errors = traces.filter((t) => t.severityLevel >= 3).length;
    const warnings = traces.filter((t) => t.severityLevel === 2).length;
    const info = traces.filter((t) => t.severityLevel === 1).length;
    return { total, errors, warnings, info };
  }, [traces]);

  const recent = useMemo(
    () =>
      [...traces]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50),
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
    <div className="space-y-4 p-4 w-full self-stretch bg-dfxBlue-800 min-h-screen" style={{ color: TEXT_COLOR }}>
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total" value={String(stats.total)} dark />
        <SummaryCard label="Errors" value={String(stats.errors)} color={stats.errors > 0 ? '#ef4444' : undefined} dark />
        <SummaryCard
          label="Warnings"
          value={String(stats.warnings)}
          color={stats.warnings > 0 ? '#f59e0b' : undefined}
          dark
        />
        <SummaryCard label="Info" value={String(stats.info)} dark />
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
              <span
                className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                style={{ background: '#22c55e' }}
              />
              live · refresh {REFRESH_MS / 1000}s
            </span>
          )}
          <span>last update {lastFetched ? lastFetched.toLocaleTimeString('de-CH') : '-'}</span>
          {isRefreshing && <span>loading…</span>}
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-dfxBlue-700 rounded-lg shadow p-4">
        <div className="text-lg font-semibold mb-3">Recent Entries (last {recent.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: LABEL_COLOR }} className="text-left">
                <th className="py-1 pr-3 font-medium">Time</th>
                <th className="py-1 pr-3 font-medium">Severity</th>
                <th className="py-1 pr-3 font-medium">Context</th>
                <th className="py-1 pr-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t, i) => {
                const style = severityStyle(t.severityLevel);
                return (
                  <tr
                    key={`${t.timestamp}-${t.operationId}-${i}`}
                    className="border-t"
                    style={{ borderColor: BORDER_COLOR }}
                  >
                    <td className="py-1 pr-3 font-mono text-xs whitespace-nowrap">{formatTime(t.timestamp)}</td>
                    <td className="py-1 pr-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ background: style.color, color: TEXT_COLOR }}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="py-1 pr-3 font-mono text-xs">{t.context}</td>
                    <td className="py-1 pr-3 font-mono text-xs whitespace-pre-wrap break-all">
                      {truncate(t.message, MAX_MESSAGE_LEN)}
                    </td>
                  </tr>
                );
              })}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center" style={{ color: LABEL_COLOR }}>
                    No traces in window
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
