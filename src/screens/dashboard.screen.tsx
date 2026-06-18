import { useThemeContext } from 'src/contexts/theme.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function DashboardScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Dashboard' });

  const { navigate } = useNavigation();
  const { tokens } = useThemeContext();

  return (
    <div className="space-y-4 p-4 w-full" style={{ color: tokens.textPrimary }}>
      <div
        className="bg-white dark:bg-dfxBlue-700 rounded-lg shadow p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-dfxBlue-600"
        onClick={() => navigate('/dashboard/financial')}
      >
        <div className="text-lg font-semibold">Financial</div>
        <div className="text-sm mt-1" style={{ color: tokens.textMuted }}>
          Balance overview, history, liquidity & expenses
        </div>
      </div>
      <div
        className="bg-white rounded-lg shadow p-6 cursor-pointer hover:bg-gray-50"
        onClick={() => navigate('/dashboard/log-tracing')}
      >
        <div className="text-lg font-semibold">Log Tracing</div>
        <div className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Live tracing of API calls — RealUnit dashboard and all logs
        </div>
      </div>
    </div>
  );
}
