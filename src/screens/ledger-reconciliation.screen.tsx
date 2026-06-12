import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { ReconAmpel } from 'src/components/ledger/recon-ampel';
import { useSettingsContext } from 'src/contexts/settings.context';
import { AccountReconResultDto } from 'src/dto/ledger.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useLedger } from 'src/hooks/ledger.hook';
import { formatAge, formatChf2, formatDate, reconStatusAmpel } from 'src/util/ledger';

export default function LedgerReconciliationScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { getReconStatus } = useLedger();

  useLayoutOptions({ title: translate('screens/ledger', 'Reconciliation'), backButton: true, noMaxWidth: true });

  const [accounts, setAccounts] = useState<AccountReconResultDto[]>([]);
  const [runAt, setRunAt] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    setError(undefined);
    getReconStatus()
      .then((data) => {
        setAccounts(data.accounts);
        setRunAt(data.runAt);
      })
      .catch(() => setError(translate('screens/ledger', 'Failed to load data')))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  return (
    <div className="w-full space-y-4">
      {runAt && (
        <div className="text-xs text-dfxGray-700">
          {translate('screens/ledger', 'Last run')}: {formatDate(runAt)}
        </div>
      )}

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
                <th className="px-4 py-3 text-center font-semibold text-dfxBlue-800" />
                <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Account')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Ledger (CHF)')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Feed (CHF)')}
                </th>
                <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Difference')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Feed Age')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
                  {translate('screens/ledger', 'Status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.accountId}
                  className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                >
                  <td className="px-4 py-2 text-center">
                    <ReconAmpel
                      color={reconStatusAmpel(account.status)}
                      title={`${translate('screens/ledger', 'Staleness')}: ${account.staleness}`}
                    />
                  </td>
                  <td className="px-4 py-2 text-left text-dfxBlue-800">{account.accountName}</td>
                  <td className="px-4 py-2 text-right font-mono text-dfxBlue-800">
                    {formatChf2(account.ledgerBalance)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-dfxBlue-800">
                    {formatChf2(account.externalFeedBalance)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono ${
                      account.difference === 0 ? 'text-dfxBlue-800' : 'text-dfxRed-150'
                    }`}
                  >
                    {formatChf2(account.difference)}
                  </td>
                  <td className="px-4 py-2 text-left text-dfxGray-700">{formatAge(account.feedAge)}</td>
                  <td className="px-4 py-2 text-left text-dfxBlue-800">
                    {translate('screens/ledger', account.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
