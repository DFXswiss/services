import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useMemo, useState } from 'react';
import { AgeBadge } from 'src/components/dashboard/age-badge';
import { SummaryCard } from 'src/components/dashboard/summary-card';
import { AccountsTable } from 'src/components/ledger/accounts-table';
import { useSettingsContext } from 'src/contexts/settings.context';
import { LedgerAccountBalanceDto } from 'src/dto/ledger.dto';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useLedger } from 'src/hooks/ledger.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { formatChf2OrDash, summarizeLedger } from 'src/util/ledger';

export default function LedgerScreen(): JSX.Element {
  useAdminGuard();

  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { navigate } = useNavigation();
  const { getAccounts } = useLedger();

  useLayoutOptions({ title: translate('screens/ledger', 'Ledger'), noMaxWidth: true });

  const [accounts, setAccounts] = useState<LedgerAccountBalanceDto[]>([]);
  const [period, setPeriod] = useState<{ from: string; to: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!isLoggedIn) return;

    setIsLoading(true);
    setError(undefined);
    getAccounts()
      .then((data) => {
        setAccounts(data.accounts);
        setPeriod(data.period);
      })
      .catch(() => setError(translate('screens/ledger', 'Failed to load data')))
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  const { totalAssets, totalLiabilities, netEquity } = useMemo(() => summarizeLedger(accounts), [accounts]);

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label={translate('screens/ledger', 'Total Assets')} value={formatChf2OrDash(totalAssets)} />
        <SummaryCard
          label={translate('screens/ledger', 'Total Liabilities')}
          value={formatChf2OrDash(-totalLiabilities)}
          color="#ef4444"
        />
        <SummaryCard
          label={translate('screens/ledger', 'Net Equity')}
          value={formatChf2OrDash(netEquity)}
          color="#22c55e"
        />
        <SummaryCard label={translate('screens/ledger', 'As of')} value={<AgeBadge timestamp={period?.to} />} />
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
