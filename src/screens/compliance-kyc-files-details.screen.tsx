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
import { KycFileListEntry, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function ComplianceKycFilesDetailsScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { getKycFileList } = useCompliance();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<KycFileListEntry[]>([]);

  function formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-CH');
  }

  function formatVolume(volume?: number): string {
    if (volume == null) return '-';
    return volume.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getStatus(entry: KycFileListEntry): string {
    return entry.amlListExpiredDate == null ? 'open' : 'closed';
  }

  function isShellCompany(entry: KycFileListEntry): boolean {
    return entry.amlAccountType === 'Sitzgesellschaft';
  }

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
    const rows = data.map((entry) => [
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
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
          <thead>
            <tr className="bg-dfxGray-300">
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Id')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'Volume')}
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
                  onClick={exportCsv}
                  title={translate('screens/compliance', 'Export CSV')}
                  disabled={data.length === 0}
                >
                  <DfxIcon icon={IconVariant.FILE} color={IconColor.BLUE} size={IconSize.MD} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                  onClick={() => navigate(`compliance/user/${entry.id}`)}
                >
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.kycFileId}</td>
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.id}</td>
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
                  <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                    {formatVolume(entry.totalVolumeChfAuditPeriod)}
                  </td>
                  <td></td>
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
