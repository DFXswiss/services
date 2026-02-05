import { useSessionContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { TransactionListEntry, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function ComplianceTransactionListScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { getTransactionList } = useCompliance();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<TransactionListEntry[]>([]);

  function formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatChf(value?: number): string {
    if (value == null) return '-';
    return Math.round(value).toLocaleString('de-CH');
  }

  function exportCsv() {
    const headers = ['Id', 'Type', 'AccountId', 'Name', 'Domizil', 'Transaktionsdatum', 'Assets', 'CHF Value', 'TMER'];
    const rows = data.map((entry) => [
      entry.id,
      entry.type ?? '',
      entry.accountId ?? '',
      entry.name ?? '',
      entry.domicile ?? '',
      formatDate(entry.eventDate),
      entry.assets ?? '',
      formatChf(entry.amountInChf),
      entry.highRisk ? 'Ja' : 'Nein',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transaction-list-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    getTransactionList()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, getTransactionList]);

  useLayoutOptions({ title: translate('screens/compliance', 'Transaction List'), noMaxWidth: true });

  if (isLoading) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  if (error) {
    return <ErrorHint message={error} />;
  }

  return (
    <StyledVerticalStack gap={6} full>
      <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm">
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-dfxGray-700">
            {data.length} {translate('screens/compliance', 'entries')}
          </span>
          <button
            className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
            onClick={exportCsv}
            title={translate('screens/compliance', 'Export CSV')}
            disabled={data.length === 0}
          >
            <DfxIcon icon={IconVariant.ARROW_DOWN} color={IconColor.BLUE} size={IconSize.MD} />
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
          <thead>
            <tr className="bg-dfxGray-300">
              <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Id')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Type')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'AccountId')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Name')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Domizil')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Transaktionsdatum')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Assets')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'CHF Value')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'TMER')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 ${entry.accountId ? 'cursor-pointer' : ''}`}
                  onClick={() => entry.accountId && navigate(`compliance/user/${entry.accountId}`)}
                >
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.id}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.type ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.accountId ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.name ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.domicile ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.eventDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.assets ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{formatChf(entry.amountInChf)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {entry.highRisk ? 'Ja' : 'Nein'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-3 text-center text-dfxGray-700">
                  {translate('screens/compliance', 'No entries found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StyledVerticalStack>
  );
}
