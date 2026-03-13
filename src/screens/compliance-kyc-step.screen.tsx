import { ApiError } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { KycStepInfo, RecommendationUserInfo, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

function UserCard({ label, user }: { label: string; user: RecommendationUserInfo }): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="text-xs text-dfxGray-700 uppercase mb-1">{label}</div>
      <div className="text-lg font-semibold text-dfxBlue-800">
        {[user.firstname, user.surname].filter(Boolean).join(' ') || '-'}
      </div>
      <div className="text-sm text-dfxGray-700">UserData #{user.id}</div>
    </div>
  );
}

export default function ComplianceKycStepScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const navigate = useNavigate();
  const { id: userDataId, stepId } = useParams();
  const { getUserData } = useCompliance();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [step, setStep] = useState<KycStepInfo>();

  useLayoutOptions({ title: translate('screens/compliance', 'KYC Step'), backButton: true, noMaxWidth: true });

  useEffect(() => {
    if (userDataId && stepId) {
      setIsLoading(true);
      getUserData(+userDataId)
        .then((data) => {
          const found = data.kycSteps?.find((s) => s.id === +stepId);
          if (found) setStep(found);
          else setError('KYC Step not found');
        })
        .catch((e: ApiError) => setError(e.message ?? 'Unknown error'))
        .finally(() => setIsLoading(false));
    } else {
      setError('Missing parameters');
      setIsLoading(false);
    }
  }, [userDataId, stepId]);

  if (error) return <ErrorHint message={error} />;
  if (isLoading || !step) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  let parsedResult: object | string | undefined;
  try {
    parsedResult = step.result ? JSON.parse(step.result) : undefined;
  } catch {
    parsedResult = step.result;
  }

  return (
    <div className="w-full flex flex-col gap-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-dfxGray-700 text-lg font-semibold">
          {step.name} #{step.id}
        </h2>
        <span
          className={`px-2 py-1 rounded text-xs ${
            step.status === 'Completed'
              ? 'bg-green-100 text-green-800'
              : step.status === 'Failed'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {step.status}
        </span>
        <button
          onClick={() => navigate(`/compliance/recommendations/${userDataId}`)}
          className="ml-auto px-3 py-1.5 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-400 transition-colors"
        >
          View Network
        </button>
      </div>

      {/* Recommender -> Recommended */}
      {(step.recommender || step.recommended) && (
        <div className="flex items-center gap-4">
          {step.recommender && <UserCard label="Recommender" user={step.recommender} />}
          {step.recommender && step.recommended && (
            <div className="text-2xl text-dfxGray-700">&rarr;</div>
          )}
          {step.recommended && <UserCard label="Recommended" user={step.recommended} />}
        </div>
      )}

      {/* Info Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <table className="w-full border-collapse">
          <tbody>
            {[
              ['ID', step.id],
              ['Name', step.name],
              ['Type', step.type || '-'],
              ['Status', step.status],
              ['Sequence', step.sequenceNumber],
              ['Created', new Date(step.created).toLocaleString()],
            ].map(([key, value]) => (
              <tr key={String(key)} className="border-b border-dfxGray-300">
                <td className="px-4 py-2 text-sm text-dfxBlue-800 font-medium w-40">{String(key)}</td>
                <td className="px-4 py-2 text-sm text-dfxBlue-800">{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comment */}
      {step.comment && (
        <div>
          <h3 className="text-dfxGray-700 mb-2 font-semibold">Comment</h3>
          <div className="bg-white rounded-lg shadow-sm p-4 text-sm text-dfxBlue-800 whitespace-pre-wrap">
            {step.comment}
          </div>
        </div>
      )}

      {/* All Recommendations by this Recommender */}
      {step.allRecommendations && step.allRecommendations.length > 0 && step.recommender && (
        <div>
          <h3 className="text-dfxGray-700 mb-2 font-semibold">
            All Recommendations by {[step.recommender.firstname, step.recommender.surname].filter(Boolean).join(' ') || `#${step.recommender.id}`} ({step.allRecommendations.length})
          </h3>
          <div className="bg-white rounded-lg shadow-sm overflow-auto max-h-[40vh]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-dfxGray-300">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">UserData</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Confirmed</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Date</th>
                </tr>
              </thead>
              <tbody>
                {step.allRecommendations.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer group ${
                      rec.recommended.id === +(userDataId ?? 0) ? 'bg-dfxGray-300' : ''
                    }`}
                    onClick={() => navigate(`/compliance/user/${rec.recommended.id}`)}
                  >
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 group-hover:text-white">
                      #{rec.recommended.id}
                    </td>
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 group-hover:text-white">
                      {[rec.recommended.firstname, rec.recommended.surname].filter(Boolean).join(' ') || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rec.isConfirmed === true
                            ? 'bg-green-100 text-green-800'
                            : rec.isConfirmed === false
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {rec.isConfirmed === true ? 'Yes' : rec.isConfirmed === false ? 'Denied' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-dfxBlue-800 group-hover:text-white">
                      {new Date(rec.created).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {parsedResult && (
        <div>
          <h3 className="text-dfxGray-700 mb-2 font-semibold">Result</h3>
          <div className="bg-white rounded-lg shadow-sm p-4 overflow-auto max-h-[60vh]">
            {typeof parsedResult === 'object' ? (
              <table className="w-full border-collapse">
                <tbody>
                  {Object.entries(parsedResult).map(([key, value]) => (
                    <tr key={key} className="border-b border-dfxGray-300">
                      <td className="px-4 py-2 text-sm text-dfxBlue-800 font-medium w-48 align-top">{key}</td>
                      <td className="px-4 py-2 text-sm text-dfxBlue-800 break-all whitespace-pre-wrap">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value, null, 2)
                          : String(value ?? '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="text-sm text-dfxBlue-800 whitespace-pre-wrap">{String(parsedResult)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
