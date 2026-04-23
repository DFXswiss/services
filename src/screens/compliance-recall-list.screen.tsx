import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { RecallListEntry } from 'src/dto/recall.dto';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

export default function ComplianceRecallListScreen(): JSX.Element {
  useComplianceGuard();
  useLayoutOptions({ title: 'Recalls', backButton: true, noMaxWidth: true });

  const { isLoggedIn } = useSessionContext();
  const { getRecalls } = useCompliance();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<RecallListEntry[]>([]);

  const loadData = useCallback(() => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    setError(undefined);

    getRecalls()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn, getRecalls]);

  useEffect(() => {
    loadData();
  }, [isLoggedIn]);

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function txReference(entry: RecallListEntry): string {
    if (entry.bankTx) return `BankTx #${entry.bankTx.id}`;
    if (entry.checkoutTx) return `CheckoutTx #${entry.checkoutTx.id}`;
    return '-';
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Transaction</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">Sequence</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Reason</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">Fee</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">User ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Comment</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((entry) => (
                  <tr key={entry.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.id}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.created)}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{formatDate(entry.updated)}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{txReference(entry)}</td>
                    <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.sequence}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{entry.reason ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.fee}</td>
                    <td className="px-4 py-3 text-right text-sm text-dfxBlue-800">{entry.user?.id ?? '-'}</td>
                    <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 max-w-xs truncate" title={entry.comment}>
                      {entry.comment}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-3 text-center text-dfxGray-700">
                    No recalls found
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
