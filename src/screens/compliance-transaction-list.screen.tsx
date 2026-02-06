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

  // Filter state
  const today = new Date().toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [createdFrom, setCreatedFrom] = useState<string>(threeDaysAgo);
  const [createdTo, setCreatedTo] = useState<string>(today);
  const [outputFrom, setOutputFrom] = useState<string>(threeDaysAgo);
  const [outputTo, setOutputTo] = useState<string>(today);

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
    const headers = [
      'Id',
      'Type',
      'AccountId',
      'Name',
      'Domizil',
      'Created',
      'Transaktionsdatum',
      'Output Datum',
      'Assets',
      'CHF Value',
      'TMER',
    ];
    const rows = data.map((entry) => [
      entry.id,
      entry.type ?? '',
      entry.accountId ?? '',
      entry.name ?? '',
      entry.domicile ?? '',
      formatDate(entry.created),
      formatDate(entry.eventDate),
      formatDate(entry.outputDate),
      entry.assets ?? '',
      formatChf(entry.amountInChf),
      entry.highRisk ? 'Ja' : 'Nein',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

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

    setIsLoading(true);
    setError(undefined);

    const params = {
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      outputFrom: outputFrom || undefined,
      outputTo: outputTo || undefined,
    };

    getTransactionList(params)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, getTransactionList, createdFrom, createdTo, outputFrom, outputTo]);

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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Created von')}
          </label>
          <input
            type="date"
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Created bis')}
          </label>
          <input
            type="date"
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Output Datum von')}
          </label>
          <input
            type="date"
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800"
            value={outputFrom}
            onChange={(e) => setOutputFrom(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Output Datum bis')}
          </label>
          <input
            type="date"
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800"
            value={outputTo}
            onChange={(e) => setOutputTo(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-dfxBlue-800">&nbsp;</span>
          <button
            className="px-3 py-2 text-sm text-dfxBlue-800 hover:bg-dfxGray-300 rounded-lg transition-colors"
            onClick={() => {
              setCreatedFrom('');
              setCreatedTo('');
              setOutputFrom('');
              setOutputTo('');
            }}
          >
            {translate('screens/compliance', 'Reset')}
          </button>
        </div>

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
                {translate('screens/compliance', 'Created')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Transaktionsdatum')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Output Datum')}
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
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.created)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.eventDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.outputDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.assets ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{formatChf(entry.amountInChf)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {entry.highRisk ? 'Ja' : 'Nein'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-4 py-3 text-center text-dfxGray-700">
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
