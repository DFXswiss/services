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

export default function ComplianceKycFilesScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { getKycFileList } = useCompliance();
  const { navigate } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<KycFileListEntry[]>([]);

  function exportCsv() {
    const headers = ['KycFileId', 'AccountId', 'Type', 'Name'];
    const rows = data.map((entry) => [entry.kycFileId, entry.id, entry.amlAccountType ?? '', entry.verifiedName ?? '']);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kyc-files-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    getKycFileList()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  useLayoutOptions({ title: translate('screens/compliance', 'KYC File List') });

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
              <th className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
                    onClick={() => navigate('compliance/kyc-files/details')}
                    title={translate('screens/compliance', 'Details')}
                  >
                    <DfxIcon icon={IconVariant.INFO} color={IconColor.BLUE} size={IconSize.MD} />
                  </button>
                  <button
                    className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer"
                    onClick={exportCsv}
                    title={translate('screens/compliance', 'Export CSV')}
                    disabled={data.length === 0}
                  >
                    <DfxIcon icon={IconVariant.FILE} color={IconColor.BLUE} size={IconSize.MD} />
                  </button>
                </div>
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
                  <td></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-dfxGray-700">
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
