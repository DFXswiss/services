import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { KycFileYearlyStats, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

type KycYearDataKey = keyof Omit<KycFileYearlyStats, 'year'>;

const rowDefinitions: { key: KycYearDataKey; label: string }[] = [
  { key: 'startCount', label: 'KYC files managed on 01.01.xxxx' },
  { key: 'reopened', label: 'Internal: Reopened KYC files' },
  { key: 'newFiles', label: 'Internal: New KYC files' },
  { key: 'addedDuringYear', label: 'KYC files added between 01.01.20xx and 31.12.20xx' },
  { key: 'activeDuringYear', label: '*KYC files managed during the year' },
  { key: 'closedDuringYear', label: 'KYC files closed between 01.01.20xx and 31.12.20xx' },
  { key: 'endCount', label: 'KYC files managed on 31.12.20xx' },
  { key: 'highestFileNr', label: 'Internal: Highest KYC file number' },
];

function formatNumber(num: number): string {
  return num.toLocaleString('de-CH');
}

export default function ComplianceKycStatsScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { getKycFileStats } = useCompliance();

  const [stats, setStats] = useState<KycFileYearlyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useLayoutOptions({ title: translate('screens/compliance', 'KYC File Statistics') });

  useEffect(() => {
    getKycFileStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  if (error) {
    return <ErrorHint message={error} />;
  }

  const years = stats.map((s) => s.year);
  const kycData = stats.reduce(
    (acc, s) => {
      acc[s.year] = s;
      return acc;
    },
    {} as Record<number, KycFileYearlyStats>,
  );

  return (
    <StyledVerticalStack gap={6} full>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
          <thead>
            <tr className="bg-dfxGray-300">
              <th className="px-2 py-2 text-left text-sm font-semibold text-dfxBlue-800">
                {translate('screens/compliance', 'As of 31.12.:')}
              </th>
              {years.map((year) => (
                <th key={year} className="px-2 py-2 text-right text-sm font-semibold text-dfxBlue-800">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowDefinitions.map((row, index) => (
              <tr
                key={row.key}
                className={`border-b border-dfxGray-300 ${index % 2 === 1 ? 'bg-dfxGray-100' : ''}`}
              >
                <td className="px-2 py-2 text-left text-sm text-dfxBlue-800">
                  {translate('screens/compliance', row.label)}
                </td>
                {years.map((year) => (
                  <td key={year} className="px-2 py-2 text-right text-sm text-dfxBlue-800">
                    {formatNumber(kycData[year][row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StyledVerticalStack>
  );
}
