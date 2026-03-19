import { useNavigation } from 'src/hooks/navigation.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

export default function DashboardScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Dashboard' });

  const { navigate } = useNavigation();

  return (
    <div className="space-y-4 p-4 w-full" style={{ color: '#111827' }}>
      <div
        className="bg-white rounded-lg shadow p-6 cursor-pointer hover:bg-gray-50"
        onClick={() => navigate('/dashboard/financial')}
      >
        <div className="text-lg font-semibold">Financial</div>
        <div className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Balance overview, history, liquidity & expenses
        </div>
      </div>
    </div>
  );
}
