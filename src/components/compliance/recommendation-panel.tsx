import { useAuthContext } from '@dfx.swiss/react';
import { NavigateFunction } from 'react-router-dom';
import { KycStepInfo, UserInfo } from 'src/hooks/compliance.hook';
import { formatDate, statusBadge } from 'src/util/compliance-helpers';
import { canEditUsedRef } from 'src/util/used-ref.util';
import { UsedRefEditor } from './used-ref-editor';

interface RecommendationPanelProps {
  kycSteps: KycStepInfo[];
  users: UserInfo[];
  userDataId: string;
  navigate: NavigateFunction;
  // Reloads the account after the referral code changed (the users of the answer carry the code).
  onChange: () => void;
}

export function RecommendationPanel({
  kycSteps,
  users,
  userDataId,
  navigate,
  onChange,
}: RecommendationPanelProps): JSX.Element {
  const recommendations = kycSteps?.filter((s) => s.name === 'Recommendation') || [];
  const { session } = useAuthContext();
  const canEditRef = canEditUsedRef(session?.role);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-dfxGray-700">Recommendation ({recommendations.length})</h2>
        <button
          className="text-xs text-dfxBlue-800 hover:underline"
          onClick={() => navigate(`/compliance/recommendations/${userDataId}`)}
        >
          View Network
        </button>
      </div>
      {users?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-2 p-3 text-sm">
          <div className="text-dfxGray-700 mb-1">Referrer (Ref-Code)</div>
          <UsedRefEditor
            userDataId={userDataId}
            users={users}
            canEdit={canEditRef}
            navigate={navigate}
            onSaved={onChange}
          />
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm max-h-[35vh] overflow-auto scroll-shadow">
        {recommendations.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-dfxGray-300">
              <tr>
                <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Status</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((step) => (
                <tr
                  key={step.id}
                  className="border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer group"
                  onClick={() => navigate(`/compliance/user/${userDataId}/kyc-step/${step.id}`, { state: { step } })}
                >
                  <td className="px-3 py-2 text-sm text-center">{statusBadge(step.status)}</td>
                  <td className="px-3 py-2 text-sm text-dfxBlue-800 text-center group-hover:text-white">
                    {formatDate(step.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-dfxGray-700 text-sm">No recommendation</div>
        )}
      </div>
    </div>
  );
}
