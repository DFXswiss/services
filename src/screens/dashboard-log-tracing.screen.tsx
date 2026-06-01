import { useAdminGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

export default function DashboardLogTracingScreen(): JSX.Element {
  // Backend /gs/debug/logs is RoleGuard(DEBUG); additionalRoles allows
  // ADMIN+SUPER_ADMIN, but not REALUNIT — so admin-only is the right gate.
  useAdminGuard();
  useLayoutOptions({ title: 'Log Tracing', noMaxWidth: true });
  const { navigate } = useNavigation();
  return (
    <div className="space-y-4 p-4 w-full self-stretch bg-dfxBlue-800 min-h-screen" style={{ color: '#ffffff' }}>
      <div
        className="bg-dfxBlue-700 rounded-lg shadow p-6 cursor-pointer hover:bg-dfxBlue-500"
        onClick={() => navigate('/dashboard/log-tracing/realunit')}
      >
        <div className="text-lg font-semibold">RealUnit</div>
        <div className="text-sm mt-1" style={{ color: '#9AA5B8' }}>
          Live API-call tracing for the RealUnit wallet (test phase)
        </div>
      </div>
      <div
        className="bg-dfxBlue-700 rounded-lg shadow p-6 cursor-pointer hover:bg-dfxBlue-500"
        onClick={() => navigate('/dashboard/log-tracing/all')}
      >
        <div className="text-lg font-semibold">All Logs</div>
        <div className="text-sm mt-1" style={{ color: '#9AA5B8' }}>
          All API trace entries, grouped by severity and context
        </div>
      </div>
    </div>
  );
}
