import { useAuthContext } from '@dfx.swiss/react';
import { useEffect, useState } from 'react';
import { NavigateFunction } from 'react-router-dom';
import { KycStepInfo, useCompliance, UserInfo } from 'src/hooks/compliance.hook';
import { formatDate, statusBadge } from 'src/util/compliance-helpers';
import { canEditUsedRef } from 'src/util/used-ref.util';
import { UsedRefEditor } from './used-ref-editor';

interface RecommendationPanelProps {
  kycSteps: KycStepInfo[];
  users: UserInfo[];
  userDataId: string;
  navigate: NavigateFunction;
}

export function RecommendationPanel(props: RecommendationPanelProps): JSX.Element {
  return <RecommendationPanelBody key={props.userDataId} {...props} />;
}

function RecommendationPanelBody({ kycSteps, userDataId, navigate }: RecommendationPanelProps): JSX.Element {
  const recommendations = kycSteps?.filter((s) => s.name === 'Recommendation') || [];
  const { session } = useAuthContext();
  const canEditRef = canEditUsedRef(session?.role);
  const { getUserData } = useCompliance();

  const [fetched, setFetched] = useState<{ id: string; users: UserInfo[] } | undefined>(undefined);
  const [saved, setSaved] = useState<{ id: string; users: UserInfo[] } | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const displayWallets =
    saved?.id === userDataId ? saved.users : fetched?.id === userDataId ? fetched.users : undefined;
  const wallets = displayWallets ?? [];

  useEffect(() => {
    let live = true;
    setSaved(undefined);
    setFetched(undefined);
    setLoadError(false);
    getUserData(+userDataId)
      .then((data) => {
        if (!live) return;
        setLoadError(false);
        setFetched({ id: userDataId, users: data.users });
      })
      .catch(() => {
        if (!live) return;
        setLoadError(true);
      });
    return () => {
      live = false;
    };
  }, [userDataId, getUserData]);

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
      {loadError && (
        <div className="bg-white rounded-lg shadow-sm mb-2 p-3 text-sm">
          <div className="text-dfxGray-700 mb-1">Referrer (Ref-Code)</div>
          <p className="text-xs text-dfxRed-100">Could not load the referrer.</p>
        </div>
      )}
      {!loadError && wallets.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-2 p-3 text-sm">
          <div className="text-dfxGray-700 mb-1">Referrer (Ref-Code)</div>
          <UsedRefEditor
            key={userDataId}
            userDataId={userDataId}
            users={wallets}
            canEdit={canEditRef}
            navigate={navigate}
            onSaved={(users) => setSaved({ id: userDataId, users })}
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
