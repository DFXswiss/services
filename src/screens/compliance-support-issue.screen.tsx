import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { LimitRequestDecisionForm } from 'src/components/compliance/limit-request-decision-form';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { LimitRequestFinalDecisions, SupportIssueInfo, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { formatDateTime, statusBadge } from 'src/util/compliance-helpers';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

function isDecisionFinal(decision?: string): boolean {
  return !!decision && (LimitRequestFinalDecisions as readonly string[]).includes(decision);
}

export default function ComplianceSupportIssueScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id: userDataId, issueId } = useParams();
  const { getUserData } = useCompliance();
  const location = useLocation();
  const passedIssue = (location.state as { issue?: SupportIssueInfo } | null)?.issue;

  const [isLoading, setIsLoading] = useState(!passedIssue);
  const [error, setError] = useState<string>();
  const [issue, setIssue] = useState<SupportIssueInfo | undefined>(passedIssue);

  useLayoutOptions({ title: translate('screens/compliance', 'Support Issue'), backButton: true, noMaxWidth: true });

  // Returns a cancel handle so the initial effect can drop a late response after unmount, while the
  // reload after a decision can simply await the same fetch.
  const loadIssue = useCallback((): { promise: Promise<void>; cancel: () => void } => {
    let cancelled = false;
    if (!userDataId || !issueId) {
      setError('Missing parameters');
      setIsLoading(false);
      return { promise: Promise.resolve(), cancel: () => undefined };
    }

    setIsLoading(true);
    const promise = getUserData(+userDataId)
      .then((data) => {
        if (cancelled) return;
        const found = data.supportIssues?.find((s) => s.id === +issueId);
        if (found) {
          setIssue(found);
          setError(undefined);
        } else {
          setError('Support issue not found');
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return {
      promise,
      cancel: () => {
        cancelled = true;
      },
    };
  }, [userDataId, issueId]);

  useEffect(() => {
    // The list passes the issue along, so the detail view renders without a round trip; only a direct
    // hit on the URL has to fetch.
    if (issue) return;

    const { cancel } = loadIssue();
    return cancel;
  }, [loadIssue]);

  if (error) return <ErrorHint message={error} />;
  if (isLoading || !issue) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  return (
    <div className="w-full flex flex-col gap-6 max-w-4xl text-left">
      {/* Header Panels */}
      <div className="flex gap-4 flex-wrap">
        {/* Issue Details — always shown */}
        <div className="bg-white rounded-lg shadow-sm p-4 flex-1 min-w-[250px]">
          <h2 className="text-dfxGray-700 mb-3">Issue Details</h2>
          <table className="text-sm text-dfxBlue-800 text-left">
            <tbody>
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap">UID:</td>
                <td className="py-1 font-mono">{issue.uid}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap">Name:</td>
                <td className="py-1">{issue.name}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap">Type:</td>
                <td className="py-1">{issue.type}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap">Reason:</td>
                <td className="py-1">{issue.reason}</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap">State:</td>
                <td className="py-1">{statusBadge(issue.state)}</td>
              </tr>
              {issue.clerk && (
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Clerk:</td>
                  <td className="py-1">{issue.clerk}</td>
                </tr>
              )}
              {issue.department && (
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Department:</td>
                  <td className="py-1">{issue.department}</td>
                </tr>
              )}
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap">Created:</td>
                <td className="py-1">{formatDateTime(issue.created)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Transaction — shown for TransactionIssue */}
        {issue.transaction && (
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 min-w-[250px]">
            <h2 className="text-dfxGray-700 mb-3">Related Transaction</h2>
            <table className="text-sm text-dfxBlue-800 text-left">
              <tbody>
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">ID:</td>
                  <td className="py-1">{issue.transaction.id}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">UID:</td>
                  <td className="py-1 font-mono">{issue.transaction.uid}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Type:</td>
                  <td className="py-1">{issue.transaction.type || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Source:</td>
                  <td className="py-1">{issue.transaction.sourceType}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Amount (CHF):</td>
                  <td className="py-1">{issue.transaction.amountInChf?.toFixed(2) || '-'}</td>
                </tr>
                {issue.transaction.amlCheck && (
                  <tr>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap">AML Check:</td>
                    <td className="py-1">{statusBadge(issue.transaction.amlCheck)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Limit Request — shown for LimitRequest */}
        {issue.limitRequest && (
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 min-w-[250px]">
            <h2 className="text-dfxGray-700 mb-3">Limit Request</h2>
            <table className="text-sm text-dfxBlue-800 text-left">
              <tbody>
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Requested Limit:</td>
                  <td className="py-1">{issue.limitRequest.limit.toLocaleString()} CHF</td>
                </tr>
                {issue.limitRequest.acceptedLimit != null && (
                  <tr>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap">Accepted Limit:</td>
                    <td className="py-1">{issue.limitRequest.acceptedLimit.toLocaleString()} CHF</td>
                  </tr>
                )}
                <tr>
                  <td className="pr-4 py-1 font-medium whitespace-nowrap">Fund Origin:</td>
                  <td className="py-1">{issue.limitRequest.fundOrigin}</td>
                </tr>
                {issue.limitRequest.decision && (
                  <tr>
                    <td className="pr-4 py-1 font-medium whitespace-nowrap">Decision:</td>
                    <td className="py-1">{statusBadge(issue.limitRequest.decision)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* A final decision cannot be changed (the API rejects it), so the form is only offered
                while the request is still open. */}
            {!isDecisionFinal(issue.limitRequest.decision) && (
              <LimitRequestDecisionForm limitRequest={issue.limitRequest} onDecided={() => void loadIssue().promise} />
            )}
          </div>
        )}

        {/* Additional Info — shown when information field is set */}
        {issue.information && (
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 min-w-[250px]">
            <h2 className="text-dfxGray-700 mb-3">Additional Info</h2>
            <div className="text-sm text-dfxBlue-800 whitespace-pre-wrap">{issue.information}</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div>
        <h2 className="text-dfxGray-700 mb-2">Messages ({issue.messages.length})</h2>
        <div className="flex flex-col gap-3">
          {issue.messages.map((msg, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-2 text-left">
                <span
                  className={`text-sm font-medium ${
                    msg.author === 'Customer' ? 'text-dfxBlue-800' : 'text-dfxGreen-100'
                  }`}
                >
                  {msg.author}
                </span>
                <span className="text-xs text-dfxGray-700">{formatDateTime(msg.created)}</span>
              </div>
              <div className="text-sm text-dfxBlue-800 text-left">{msg.message || '-'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
