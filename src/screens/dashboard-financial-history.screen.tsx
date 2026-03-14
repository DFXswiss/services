import { useSessionContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { BalanceByTypeMinusChart, BalanceByTypePlusChart, BalanceByTypeTotalChart } from 'src/components/dashboard/balance-by-type-area-chart';
import { FinancialChangesMinusChart, FinancialChangesPlusChart, FinancialChangesTotalChart } from 'src/components/dashboard/financial-changes-chart';
import { TotalBalanceLongChart } from 'src/components/dashboard/total-balance-long-chart';
import { ShortTermMinusChart, ShortTermPlusChart, ShortTermTotalChart } from 'src/components/dashboard/total-balance-short-chart';
import { FinancialChangesEntry, FinancialLogEntry } from 'src/dto/dashboard.dto';
import { useDashboard } from 'src/hooks/dashboard.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function DashboardFinancialLogScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Log', noMaxWidth: true });

  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();
  const { getFinancialLog, getFinancialChanges } = useDashboard();

  const [longEntries, setLongEntries] = useState<FinancialLogEntry[]>([]);
  const [shortEntries, setShortEntries] = useState<FinancialLogEntry[]>([]);
  const [changesEntries, setChangesEntries] = useState<FinancialChangesEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      getFinancialLog(undefined, true),
      getFinancialLog(sevenDaysAgo, true),
      getFinancialChanges(undefined, true),
    ])
      .then(([longData, shortData, changesData]) => {
        setLongEntries(longData.entries);
        setShortEntries(shortData.entries);
        setChangesEntries(changesData.entries);
      })
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-96">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 w-full self-stretch" style={{ color: '#111827' }}>
      {/* Fee Income */}
      <div className="bg-white rounded-lg shadow p-4">
        <FinancialChangesPlusChart entries={changesEntries} />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <FinancialChangesMinusChart entries={changesEntries} onDetails={() => navigate('/dashboard/financial/expenses')} />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <FinancialChangesTotalChart entries={changesEntries} />
      </div>

      {/* Total Balance vs BTC */}
      <div className="bg-white rounded-lg shadow p-4">
        <TotalBalanceLongChart entries={longEntries} />
      </div>

      {/* Balance Breakdown Short-term */}
      <div className="bg-white rounded-lg shadow p-4">
        <ShortTermPlusChart entries={shortEntries} />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <ShortTermMinusChart entries={shortEntries} />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <ShortTermTotalChart entries={shortEntries} />
      </div>

      {/* Balance by Financial Type */}
      <div className="bg-white rounded-lg shadow p-4">
        <BalanceByTypePlusChart entries={longEntries} />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <BalanceByTypeMinusChart entries={longEntries} />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <BalanceByTypeTotalChart entries={longEntries} />
      </div>

    </div>
  );
}
