import { useNavigation } from 'src/hooks/navigation.hook';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

const pages = [
  { path: '/dashboard/financial/live', title: 'Live', description: 'Current balances and latest changes' },
  { path: '/dashboard/financial/history', title: 'History', description: 'Balance history over time' },
  { path: '/dashboard/financial/liquidity', title: 'Liquidity', description: 'Balance breakdown by type' },
  { path: '/dashboard/financial/expenses', title: 'Expenses', description: 'Revenue and cost details' },
];

export default function DashboardFinancialScreen(): JSX.Element {
  useAdminGuard();
  useLayoutOptions({ title: 'Financial Dashboard' });

  const { navigate } = useNavigation();

  return (
    <div className="space-y-4 p-4 w-full" style={{ color: '#111827' }}>
      <div className="grid grid-cols-2 gap-4">
        {pages.map((page) => (
          <div
            key={page.path}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:bg-gray-50"
            onClick={() => navigate(page.path)}
          >
            <div className="text-lg font-semibold">{page.title}</div>
            <div className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {page.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
