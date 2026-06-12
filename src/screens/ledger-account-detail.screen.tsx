import { useSessionContext } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonSize,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { useSettingsContext } from 'src/contexts/settings.context';
import { LedgerLegEntryDto, LedgerLegsResponseDto } from 'src/dto/ledger.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useLedger } from 'src/hooks/ledger.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { formatChf2OrDash, formatDate, formatNative } from 'src/util/ledger';

// Mirrors LEGS_PAGE_SIZE in the API (ledger-query.service.ts). The legs endpoint is 0-indexed and caps each
// page at this size; the screen pages explicitly so accounts with >100 legs are never silently truncated.
const LEGS_PAGE_SIZE = 100;

interface FlowGroup {
  counterAccountId?: number;
  counterAccountName: string;
  // Legs are kept individually — never netted to a single amount (Minor R2-6).
  legs: LedgerLegEntryDto[];
  debitTotal: number;
  creditTotal: number;
}

export default function LedgerAccountDetailScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { navigate } = useNavigation();
  const { accountId } = useParams<{ accountId: string }>();
  const { getAccountDetail } = useLedger();

  const numericAccountId = accountId ? Number(accountId) : undefined;

  const [data, setData] = useState<LedgerLegsResponseDto>();
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useLayoutOptions({
    title: data?.accountName ?? translate('screens/ledger', 'Account Detail'),
    backButton: true,
    noMaxWidth: true,
  });

  // Reset to the first page whenever the account changes, so a stale page index never points past a smaller account.
  useEffect(() => {
    setPage(0);
  }, [numericAccountId]);

  useEffect(() => {
    if (!isLoggedIn || numericAccountId === undefined || Number.isNaN(numericAccountId)) return;

    setIsLoading(true);
    setError(undefined);
    getAccountDetail(numericAccountId, undefined, undefined, page)
      .then(setData)
      .catch(() => setError(translate('screens/ledger', 'Failed to load data')))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, numericAccountId, page]);

  const groups = useMemo((): FlowGroup[] => {
    if (!data) return [];
    const byCounter = new Map<string, FlowGroup>();
    for (const leg of data.legs) {
      const key =
        leg.counterAccountId !== undefined ? String(leg.counterAccountId) : `name:${leg.counterAccountName ?? ''}`;
      let group = byCounter.get(key);
      if (!group) {
        group = {
          counterAccountId: leg.counterAccountId,
          counterAccountName: leg.counterAccountName ?? translate('screens/ledger', 'Unassigned'),
          legs: [],
          debitTotal: 0,
          creditTotal: 0,
        };
        byCounter.set(key, group);
      }
      group.legs.push(leg);
      if (leg.amountNative >= 0) group.debitTotal += leg.amountNative;
      else group.creditTotal += -leg.amountNative;
    }
    return Array.from(byCounter.values());
  }, [data]);

  // Full-screen spinner only on the initial load (no data yet). Page changes keep the previous page visible
  // and show an inline spinner in the pagination bar instead, so the controls never disappear under the user.
  if (isLoading && !data) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-dfxRed-150">{error ?? translate('screens/ledger', 'Failed to load data')}</div>;
  }

  const currency = data.currency;

  const pageCount = Math.max(1, Math.ceil(data.total / LEGS_PAGE_SIZE));
  const firstEntry = data.total === 0 ? 0 : page * LEGS_PAGE_SIZE + 1;
  const lastEntry = page * LEGS_PAGE_SIZE + data.legs.length;
  const canPrev = page > 0 && !isLoading;
  const canNext = lastEntry < data.total && !isLoading;

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={translate('screens/ledger', 'Opening Balance')}
          value={formatNative(data.openingBalance, currency)}
        />
        <SummaryCard
          label={translate('screens/ledger', 'Closing Balance')}
          value={formatNative(data.closingBalance, currency)}
        />
        <SummaryCard label={translate('screens/ledger', 'Currency')} value={currency} />
        <SummaryCard label={translate('screens/ledger', 'Entries')} value={String(data.total)} />
      </div>

      {groups.map((group) => (
        <div key={group.counterAccountId ?? group.counterAccountName} className="bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between border-b border-dfxGray-300 px-4 py-2">
            {group.counterAccountId !== undefined ? (
              <button
                type="button"
                onClick={() => navigate(`/ledger/accounts/${group.counterAccountId}`)}
                className="text-sm font-semibold text-dfxBlue-800 hover:text-dfxBlue-600 hover:underline"
              >
                {group.counterAccountName}
              </button>
            ) : (
              <span className="text-sm font-semibold text-dfxBlue-800">{group.counterAccountName}</span>
            )}
            <span className="font-mono text-xs text-dfxGray-700">
              {translate('screens/ledger', 'Debit')} {formatNative(group.debitTotal, currency)} /{' '}
              {translate('screens/ledger', 'Credit')} {formatNative(group.creditTotal, currency)}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dfxGray-300 text-xs">
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Date')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Source')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Description')}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Debit')}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Credit')}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'CHF')}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Each leg is rendered individually; same-tx legs are never netted (Minor R2-6). */}
              {group.legs.map((leg) => (
                <tr key={leg.legId} className="border-b border-dfxGray-300 hover:bg-dfxGray-300/60">
                  <td className="px-3 py-1.5 whitespace-nowrap text-dfxBlue-800">{formatDate(leg.bookingDate)}</td>
                  <td className="px-3 py-1.5 text-left text-dfxBlue-800">
                    <span className="text-xs text-dfxGray-700">{leg.sourceType}</span>{' '}
                    {/* sourceId is always a DB row-id / composite (api ledger-tx.entity), never a blockchain
                        tx-hash — the API DTO carries no blockchain reference, so no explorer link is rendered. */}
                    <span className="font-mono text-xs">{leg.sourceId}</span>
                    {leg.reversalOf !== undefined && (
                      <span className="ml-1 rounded bg-dfxRed-100 px-1 text-xs text-dfxRed-150">
                        {translate('screens/ledger', 'Reversal')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-left text-dfxBlue-800">{leg.description ?? '-'}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-dfxBlue-800">
                    {leg.amountNative >= 0 ? formatNative(leg.amountNative, currency) : ''}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-dfxBlue-800">
                    {leg.amountNative < 0 ? formatNative(-leg.amountNative, currency) : ''}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-dfxGray-700">
                    {formatChf2OrDash(leg.amountChf)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="text-dfxGray-700">{translate('screens/ledger', 'No entries in this period')}</div>
      )}

      {data.total > 0 && (
        <div className="flex items-center justify-between border-t border-dfxGray-300 pt-3">
          <span className="text-xs text-dfxGray-700">
            {translate('screens/ledger', 'Showing')} {firstEntry}–{lastEntry} {translate('screens/ledger', 'of')}{' '}
            {data.total} ({translate('screens/ledger', 'Page')} {page + 1}/{pageCount})
          </span>
          <div className="flex items-center gap-2">
            {isLoading && <StyledLoadingSpinner size={SpinnerSize.SM} />}
            <StyledButton
              label={translate('general/actions', 'Previous')}
              size={StyledButtonSize.SMALL}
              color={StyledButtonColor.GRAY_OUTLINE}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canPrev}
            />
            <StyledButton
              label={translate('general/actions', 'Next')}
              size={StyledButtonSize.SMALL}
              color={StyledButtonColor.GRAY_OUTLINE}
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
            />
          </div>
        </div>
      )}
    </div>
  );
}
