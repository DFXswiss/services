import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { AccountsTable } from 'src/components/ledger/accounts-table';
import { useSettingsContext } from 'src/contexts/settings.context';
import { LedgerAccountBalanceDto } from 'src/dto/ledger.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useLedger } from 'src/hooks/ledger.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function LedgerAccountsScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { navigate } = useNavigation();
  const { getAccounts } = useLedger();

  useLayoutOptions({ title: translate('screens/ledger', 'Accounts'), backButton: true, noMaxWidth: true });

  const [accounts, setAccounts] = useState<LedgerAccountBalanceDto[]>([]);
  const [period, setPeriod] = useState<{ from: string; to: string }>();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  function load(fromValue?: string, toValue?: string): void {
    setIsLoading(true);
    setError(undefined);
    getAccounts(fromValue || undefined, toValue || undefined)
      .then((data) => {
        setAccounts(data.accounts);
        setPeriod(data.period);
      })
      .catch(() => setError(translate('screens/ledger', 'Failed to load data')))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    load();
  }, [isLoggedIn]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-dfxGray-700">
          {translate('screens/ledger', 'From')}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded border border-dfxGray-400 px-2 py-1 text-sm text-dfxBlue-800"
          />
        </label>
        <label className="flex flex-col text-xs text-dfxGray-700">
          {translate('screens/ledger', 'To')}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded border border-dfxGray-400 px-2 py-1 text-sm text-dfxBlue-800"
          />
        </label>
        <button
          type="button"
          onClick={() => load(from, to)}
          className="rounded bg-dfxBlue-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-dfxBlue-600"
        >
          {translate('screens/ledger', 'Apply')}
        </button>
        {period && (
          <span className="text-xs text-dfxGray-700">
            {translate('screens/ledger', 'Period')}: {period.from} – {period.to}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center w-full h-96">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : error ? (
        <div className="text-dfxRed-150">{error}</div>
      ) : (
        <AccountsTable
          accounts={accounts}
          translate={translate}
          onSelect={(accountId) => navigate(`/ledger/accounts/${accountId}`)}
        />
      )}
    </div>
  );
}
