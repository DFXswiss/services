import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { MrosListEntry } from 'src/dto/mros.dto';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

export default function ComplianceMrosListScreen(): JSX.Element {
  useComplianceGuard();
  useLayoutOptions({ title: 'MROS Reports', backButton: true, noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getMrosList } = useCompliance();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<MrosListEntry[]>([]);

  const loadData = useCallback(() => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    setError(undefined);

    getMrosList()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, getMrosList]);

  useEffect(() => {
    loadData();
  }, [isLoggedIn]);

  function formatDate(date?: Date): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <StyledVerticalStack gap={6} full>
      {error && <ErrorHint message={error} />}

      {isLoading && data.length === 0 ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="bg-dfxGray-300">
                <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">UserData ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Submission Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Authority Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Case Manager</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((entry) => (
                  <tr key={entry.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.id}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.created)}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.updated)}</td>
                    <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.userData.id}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.status}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.submissionDate)}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.authorityReference ?? '-'}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.caseManager}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-3 text-center text-dfxGray-700">
                    No MROS reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </StyledVerticalStack>
  );
}
