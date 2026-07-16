import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { ErrorHint } from 'src/components/error-hint';
import { InfoPanel, InfoRow } from 'src/components/support/info-panel';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
  isSentinelSeverity,
  parseScorechainHighlight,
  ScorechainRiskDetail,
  ScorechainRiskIndicatorData,
  ScorechainScreeningDto,
  ScorechainSeverity,
  screeningMatchesHighlight,
} from 'src/dto/scorechain.dto';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useScorechain } from 'src/hooks/scorechain.hook';
import { boolBadge, formatDateTime } from 'src/util/compliance-helpers';

// Risk-band text colors. Sentinels (NoCoverage/NotFound/NotSupported) are handled separately as neutral.
const severityTextColors: Record<string, string> = {
  [ScorechainSeverity.CRITICAL_RISK]: 'text-primary-red',
  [ScorechainSeverity.HIGH_RISK]: 'text-primary-red',
  [ScorechainSeverity.MEDIUM_RISK]: 'text-yellow-600',
  [ScorechainSeverity.LOW_RISK]: 'text-dfxBlue-300',
  [ScorechainSeverity.NO_RISK]: 'text-dfxGreen-100',
};

// Badge for a severity band. Sentinels + unknown values render neutral (informational), never a risk color.
function severityBadge(severity?: string): JSX.Element {
  if (!severity) return <span className="px-2 py-1 rounded text-xs bg-dfxGray-300 text-dfxBlue-800">-</span>;
  const textColor = isSentinelSeverity(severity)
    ? 'text-dfxBlue-800'
    : (severityTextColors[severity] ?? 'text-dfxBlue-800');
  return <span className={`px-2 py-1 rounded text-xs font-semibold bg-dfxGray-300 ${textColor}`}>{severity}</span>;
}

interface ExposureRow extends ScorechainRiskDetail {
  bucket: string;
}

// Flatten the per-direction riskIndicatorData into a single exposure table.
function toExposureRows(data?: ScorechainRiskIndicatorData): ExposureRow[] {
  if (!data) return [];
  const sources: Array<[string, ScorechainRiskDetail[] | undefined]> = [
    ['assigned', data.assigned?.result?.details],
    ['incoming', data.incoming?.result?.details],
    ['outgoing', data.outgoing?.result?.details],
    ['full', data.full?.result?.details],
  ];
  return sources.flatMap(([bucket, details]) => {
    if (!details) return [];
    return details.map((detail) => ({ bucket, ...detail }));
  });
}

function num(value?: number): string {
  return value != null ? value.toLocaleString() : '-';
}

export default function ComplianceScorechainScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useSessionContext();
  const { getUserScreenings, retriggerBuyCrypto } = useScorechain();

  const userDataId = id ? Number(id) : NaN;
  const highlight = useMemo(() => parseScorechainHighlight(searchParams.get('highlight')), [searchParams]);

  const [data, setData] = useState<ScorechainScreeningDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<number>();
  const [showRaw, setShowRaw] = useState(false);
  const [confirmRescreen, setConfirmRescreen] = useState(false);
  const [isRescreening, setIsRescreening] = useState(false);
  const [actionError, setActionError] = useState<string>();

  useLayoutOptions({
    title: translate('screens/compliance', 'Scorechain screenings'),
    backButton: true,
    textStart: true,
    noMaxWidth: true,
  });

  const fetchScreenings = useCallback(async (): Promise<void> => {
    if (!Number.isInteger(userDataId)) {
      setError('Invalid user id');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      setData(await getUserScreenings(userDataId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userDataId, getUserScreenings]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void fetchScreenings();
  }, [isLoggedIn, fetchScreenings]);

  // id of the screening related to the highlighted transaction (if any)
  const highlightedId = useMemo(() => {
    if (!highlight) return undefined;
    return data.find((s) => screeningMatchesHighlight(s, highlight))?.id;
  }, [data, highlight]);

  // initial selection: the highlighted screening, otherwise the newest (list is created DESC)
  useEffect(() => {
    if (selectedId != null || data.length === 0) return;
    setSelectedId(highlightedId != null ? highlightedId : data[0].id);
  }, [data, highlightedId, selectedId]);

  const selected = useMemo(() => data.find((s) => s.id === selectedId), [data, selectedId]);
  const rescreenBuyCryptoId = selected?.relatedBuyCryptoIds?.[0];
  const exposureRows = useMemo(() => toExposureRows(selected?.riskIndicatorData), [selected]);

  async function handleRescreen(): Promise<void> {
    if (rescreenBuyCryptoId == null) return;
    setIsRescreening(true);
    setActionError(undefined);
    try {
      await retriggerBuyCrypto(rescreenBuyCryptoId);
      setConfirmRescreen(false);
      await fetchScreenings();
    } catch (e) {
      setConfirmRescreen(false);
      setActionError(e instanceof Error ? e.message : 'Re-screen failed');
    } finally {
      setIsRescreening(false);
    }
  }

  if (error) return <ErrorHint message={error} />;
  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  return (
    <div className="w-full max-w-screen-xl mx-auto flex flex-col gap-6 p-4 md:p-6 text-left">
      <h2 className="text-dfxGray-700">
        {translate('screens/compliance', 'Screenings for user')} #{Number.isInteger(userDataId) ? userDataId : '-'} (
        {data.length})
      </h2>

      {actionError && <ErrorHint message={actionError} />}

      {/* Screening list */}
      <div className="bg-white rounded-lg shadow-sm max-h-[50vh] overflow-auto scroll-shadow">
        {data.length === 0 ? (
          <div className="p-4 text-dfxGray-700 text-sm">
            {translate('screens/compliance', 'No screenings found')}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-dfxGray-300">
              <tr>
                {[
                  translate('screens/compliance', 'Created'),
                  translate('screens/compliance', 'Context'),
                  translate('screens/compliance', 'Blockchain'),
                  translate('screens/compliance', 'Object type'),
                  translate('screens/compliance', 'Severity'),
                  translate('screens/compliance', 'Risk score'),
                  translate('screens/compliance', 'High risk'),
                ].map((header) => (
                  <th
                    key={header}
                    className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`border-b border-dfxGray-300 cursor-pointer transition-colors hover:bg-dfxGray-300 ${
                    s.id === selectedId ? 'bg-dfxBlue-300/10' : ''
                  } ${s.id === highlightedId ? 'border-l-4 border-l-dfxBlue-800' : ''}`}
                >
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top whitespace-nowrap">
                    {formatDateTime(s.created)}
                    {s.id === highlightedId && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-dfxBlue-800 text-white">
                        {translate('screens/compliance', 'Linked transaction')}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{s.context}</td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{s.blockchain}</td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{s.objectType}</td>
                  <td className="px-2 py-1.5 text-xs align-top">{severityBadge(s.severity)}</td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{num(s.riskScore)}</td>
                  <td className="px-2 py-1.5 text-xs align-top">{boolBadge(s.isHighRisk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 flex-wrap">
            <InfoPanel title={translate('screens/compliance', 'Screening detail')}>
              <InfoRow label="ID" value={String(selected.id)} mono />
              <InfoRow label={translate('screens/compliance', 'Created')} value={formatDateTime(selected.created)} />
              <InfoRow label={translate('screens/compliance', 'Context')} value={selected.context} />
              <InfoRow label={translate('screens/compliance', 'Blockchain')} value={selected.blockchain} />
              <InfoRow label={translate('screens/compliance', 'Object type')} value={selected.objectType} />
              <InfoRow label={translate('screens/compliance', 'Object ID')} value={selected.objectId} mono />
              <InfoRow label={translate('screens/compliance', 'Analysis type')} value={selected.analysisType} />
              <InfoRow label={translate('screens/compliance', 'Trigger type')} value={selected.triggerType} />
            </InfoPanel>

            <InfoPanel title={translate('screens/compliance', 'Severity')}>
              <InfoRow label={translate('screens/compliance', 'Severity')} value={severityBadge(selected.severity)} />
              <InfoRow label={translate('screens/compliance', 'Risk score')} value={num(selected.riskScore)} />
              <InfoRow label={translate('screens/compliance', 'High risk')} value={boolBadge(selected.isHighRisk)} />
              <InfoRow
                label={translate('screens/compliance', 'Signature valid')}
                value={boolBadge(selected.signatureValid)}
              />
              <InfoRow
                label={translate('screens/compliance', 'Related buy-crypto')}
                value={selected.relatedBuyCryptoIds?.length ? selected.relatedBuyCryptoIds.join(', ') : '-'}
              />
              <InfoRow
                label={translate('screens/compliance', 'Related buy-fiat')}
                value={selected.relatedBuyFiatIds?.length ? selected.relatedBuyFiatIds.join(', ') : '-'}
              />
            </InfoPanel>
          </div>

          {/* Re-screen action (only when a related buyCrypto exists; costs provider quota) */}
          {rescreenBuyCryptoId != null && (
            <div>
              <button
                className="px-3 py-1.5 text-sm font-medium bg-white border border-dfxGray-400 text-dfxBlue-800 rounded hover:bg-dfxGray-300 transition-colors disabled:opacity-50"
                onClick={() => setConfirmRescreen(true)}
                disabled={isRescreening}
              >
                {translate('screens/compliance', 'Re-screen')}
              </button>
            </div>
          )}

          {/* Exposure breakdown */}
          <div>
            <h3 className="text-dfxGray-700 mb-2 font-semibold text-sm">
              {translate('screens/compliance', 'Exposure breakdown')}
            </h3>
            <div className="bg-white rounded-lg shadow-sm max-h-[40vh] overflow-auto scroll-shadow">
              {exposureRows.length === 0 ? (
                <div className="p-4 text-dfxGray-700 text-sm">
                  {translate('screens/compliance', 'No exposure data')}
                </div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      {[
                        translate('screens/compliance', 'Analysis'),
                        translate('screens/compliance', 'Entity'),
                        translate('screens/compliance', 'Indicator type'),
                        translate('screens/compliance', 'Countries'),
                        translate('screens/compliance', 'Exposure %'),
                        translate('screens/compliance', 'Amount USD'),
                        translate('screens/compliance', 'Score'),
                        translate('screens/compliance', 'Severity'),
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exposureRows.map((row, i) => (
                      <tr key={i} className="border-b border-dfxGray-300">
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{row.bucket}</td>
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{row.name ?? '-'}</td>
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{row.type ?? '-'}</td>
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">
                          {row.countries?.length ? row.countries.join(', ') : '-'}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">
                          {row.percentage != null ? `${row.percentage}%` : '-'}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{num(row.amountUsd)}</td>
                        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 align-top">{num(row.score)}</td>
                        <td className="px-2 py-1.5 text-xs align-top">{severityBadge(row.severity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Raw provider response (collapsible) */}
          {selected.rawResponseData && (
            <div>
              <button
                className="text-xs text-dfxBlue-300 underline hover:text-dfxBlue-800"
                onClick={() => setShowRaw((v) => !v)}
              >
                {translate('screens/compliance', 'Raw data')}
              </button>
              {showRaw && (
                <pre className="mt-2 bg-white rounded-lg shadow-sm p-3 text-xs text-dfxBlue-800 overflow-auto max-h-[40vh] whitespace-pre-wrap break-all">
                  {JSON.stringify(selected.rawResponseData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmRescreen}
        title={translate('screens/compliance', 'Re-screen transaction')}
        message={translate(
          'screens/compliance',
          'Re-screening consumes provider quota and costs money – continue?',
        )}
        confirmLabel={translate('screens/compliance', 'Re-screen')}
        isLoading={isRescreening}
        onConfirm={handleRescreen}
        onCancel={() => setConfirmRescreen(false)}
      />
    </div>
  );
}
