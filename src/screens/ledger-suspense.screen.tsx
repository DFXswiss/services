import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SuspenseLegDto } from 'src/dto/ledger.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useLedger } from 'src/hooks/ledger.hook';
import { formatChf2, formatChf2OrDash, formatDate, formatNative } from 'src/util/ledger';

// SuspenseLegDto.age is delivered by the API in DAYS (ledger-query.service.ts -> Util.daysDiff).
const SEVEN_DAYS = 7;

export default function LedgerSuspenseScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { getSuspense } = useLedger();

  useLayoutOptions({ title: translate('screens/ledger', 'Suspense Account'), backButton: true, noMaxWidth: true });

  const [legs, setLegs] = useState<SuspenseLegDto[]>([]);
  const [totalChf, setTotalChf] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    setError(undefined);
    getSuspense()
      .then((data) => {
        setLegs(data.legs);
        setTotalChf(data.totalChf);
      })
      .catch(() => setError(translate('screens/ledger', 'Failed to load data')))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  // Sorted by age descending (oldest first), §9.4.
  const sortedLegs = useMemo(() => legs.slice().sort((a, b) => b.age - a.age), [legs]);

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label={translate('screens/ledger', 'Total Suspense (CHF)')} value={formatChf2OrDash(totalChf)} />
        <SummaryCard label={translate('screens/ledger', 'Open Items')} value={String(legs.length)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center w-full h-96">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : error ? (
        <div className="text-dfxRed-150">{error}</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow-sm text-sm">
            <thead>
              <tr className="bg-dfxGray-300">
                <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Booking Date')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Source')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Description')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Amount')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'CHF')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Age (days)')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLegs.map((leg) => {
                const isOld = leg.age > SEVEN_DAYS;
                return (
                  <tr
                    key={leg.legId}
                    className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 ${
                      isOld ? 'bg-dfxRed-100/10' : ''
                    }`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-dfxBlue-800">{formatDate(leg.bookingDate)}</td>
                    <td className="px-4 py-2 text-left text-dfxBlue-800">
                      <span className="text-xs text-dfxGray-700">{leg.sourceType}</span>{' '}
                      <span className="font-mono text-xs">{leg.sourceId}</span>
                    </td>
                    <td className="px-4 py-2 text-left text-dfxBlue-800">{leg.description ?? '-'}</td>
                    <td className="px-4 py-2 text-right font-mono text-dfxBlue-800">
                      {formatNative(leg.amountNative, leg.currency)} {leg.currency}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-dfxGray-700">
                      {formatChf2OrDash(leg.amountChf)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${isOld ? 'font-semibold text-dfxRed-150' : 'text-dfxBlue-800'}`}
                    >
                      {leg.age.toLocaleString('de-CH', { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                );
              })}
              {sortedLegs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-dfxGray-700">
                    {translate('screens/ledger', 'No open suspense items')} ({formatChf2(0)} CHF)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
