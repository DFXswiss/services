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
import { useEffect, useMemo, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { KycFileListEntry, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

type StatusFilter = 'all' | 'open' | 'closed';

export default function ComplianceKycFilesDetailsScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { getKycFileList, downloadUserFiles, checkUserFiles } = useCompliance();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<KycFileListEntry[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  function formatDate(dateString?: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function formatVolume(volume?: number): string {
    if (volume == null) return '-';
    return Math.round(volume).toLocaleString('de-CH');
  }

  function getStatus(entry: KycFileListEntry): string {
    return entry.amlListExpiredDate ? 'closed' : 'open';
  }

  function isShellCompany(entry: KycFileListEntry): boolean {
    return entry.amlAccountType === 'Sitzgesellschaft';
  }

  const filteredData = useMemo(() => {
    return data.filter((entry) => {
      // Status filter
      if (statusFilter !== 'all') {
        const entryStatus = getStatus(entry);
        if (entryStatus !== statusFilter) return false;
      }

      // Date range filter (Eröffnungsdatum)
      if (dateFrom || dateTo) {
        const entryDate = entry.amlListAddedDate ? new Date(entry.amlListAddedDate) : null;
        if (!entryDate) return false;

        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (entryDate < fromDate) return false;
        }

        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (entryDate > toDate) return false;
        }
      }

      return true;
    });
  }, [data, statusFilter, dateFrom, dateTo]);

  function exportCsv() {
    const headers = [
      'KycFileId',
      'AccountId',
      'Type',
      'Name',
      'Status',
      'Domizil Vertragspartei',
      'Domizil wB',
      'Sitzgesellschaft',
      'Eröffnungsdatum',
      'Schliessdatum',
      'Neueröffnung',
      'GmeR',
      'PEP',
      'Komplexe Struktur',
      'Volume',
    ];
    const rows = filteredData.map((entry) => [
      entry.kycFileId,
      entry.id,
      entry.amlAccountType ?? '',
      entry.verifiedName ?? '',
      getStatus(entry),
      entry.country?.name ?? '',
      entry.allBeneficialOwnersDomicile ?? '',
      isShellCompany(entry) ? 'Ja' : 'Nein',
      formatDate(entry.amlListAddedDate),
      formatDate(entry.amlListExpiredDate),
      entry.amlListReactivatedDate ? 'Ja' : 'Nein',
      entry.highRisk ? 'Ja' : 'Nein',
      entry.pep ? 'Ja' : 'Nein',
      entry.complexOrgStructure ? 'Ja' : 'Nein',
      formatVolume(entry.totalVolumeChfAuditPeriod),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kyc-files-details-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    getKycFileList()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  useLayoutOptions({ title: translate('screens/compliance', 'KYC File Details'), noMaxWidth: true });

  if (isLoading) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  if (error) {
    return <ErrorHint message={error} />;
  }

  return (
    <StyledVerticalStack gap={6} full>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Status')}
          </label>
          <select
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">{translate('screens/compliance', 'All')}</option>
            <option value="open">{translate('screens/compliance', 'Open')}</option>
            <option value="closed">{translate('screens/compliance', 'Closed')}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Eröffnungsdatum von')}
          </label>
          <input
            type="date"
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-dfxBlue-800">
            {translate('screens/compliance', 'Eröffnungsdatum bis')}
          </label>
          <input
            type="date"
            className="px-3 py-2 border border-dfxGray-400 rounded-lg text-sm text-dfxBlue-800"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-dfxBlue-800">&nbsp;</span>
          <button
            className="px-3 py-2 text-sm text-dfxBlue-800 hover:bg-dfxGray-300 rounded-lg transition-colors"
            onClick={() => {
              setStatusFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
          >
            {translate('screens/compliance', 'Reset')}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-dfxGray-700">
            {translate('screens/compliance', 'Showing')} {filteredData.length} {translate('screens/compliance', 'of')}{' '}
            {data.length} {translate('screens/compliance', 'entries')}
          </span>
          <button
            className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
            onClick={() => checkUserFiles(filteredData.map((e) => e.id))}
            title={translate('screens/compliance', 'Check Filtered Files') + ` (${filteredData.length})`}
            disabled={filteredData.length === 0}
          >
            <DfxIcon icon={IconVariant.SEARCH} color={IconColor.BLUE} size={IconSize.MD} />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
            onClick={exportCsv}
            title={translate('screens/compliance', 'Export CSV')}
            disabled={filteredData.length === 0}
          >
            <DfxIcon icon={IconVariant.FILE} color={IconColor.BLUE} size={IconSize.MD} />
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
              <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'AccountId')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Type')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Name')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Status')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Domizil Vertragspartei')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Domizil wB')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Sitzgesellschaft')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Eröffnungsdatum')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Schliessdatum')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Neueröffnung')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'GmeR')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'PEP')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Komplexe Struktur')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Volume')}
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                  onClick={() => navigate(`compliance/user/${entry.id}`)}
                >
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.kycFileId}</td>
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.id}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.amlAccountType ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.verifiedName ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{getStatus(entry)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.country?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {entry.allBeneficialOwnersDomicile ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {isShellCompany(entry) ? 'Ja' : 'Nein'}
                  </td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.amlListAddedDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.amlListExpiredDate)}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.amlListReactivatedDate ? 'Ja' : 'Nein'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.highRisk ? 'Ja' : 'Nein'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.pep ? 'Ja' : 'Nein'}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {entry.complexOrgStructure ? 'Ja' : 'Nein'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">
                    {formatVolume(entry.totalVolumeChfAuditPeriod)}
                  </td>
                  <td className="px-4 py-3 text-right flex gap-1 justify-end">
                    <button
                      className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        checkUserFiles([entry.id]);
                      }}
                      title={translate('screens/compliance', 'Check Files')}
                    >
                      <DfxIcon icon={IconVariant.SEARCH} color={IconColor.BLUE} size={IconSize.SM} />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadUserFiles([entry.id]);
                      }}
                      title={translate('screens/compliance', 'Download Files')}
                    >
                      <DfxIcon icon={IconVariant.FILE} color={IconColor.BLUE} size={IconSize.SM} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={16} className="px-4 py-3 text-center text-dfxGray-700">
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
