import { NavigateFunction } from 'react-router-dom';
import { SupportIssueInfo } from 'src/hooks/compliance.hook';
import { formatDate, statusBadge } from 'src/util/compliance-helpers';

interface SupportIssuesPanelProps {
  supportIssues: SupportIssueInfo[];
  userDataId: string;
  navigate: NavigateFunction;
}

export function SupportIssuesPanel({ supportIssues, userDataId, navigate }: SupportIssuesPanelProps): JSX.Element {
  return (
    <div className="border-t border-dfxGray-500 pt-4">
      <h2 className="text-dfxGray-700 mb-2">Support Issues ({supportIssues?.length || 0})</h2>
      <div className="bg-white rounded-lg shadow-sm max-h-[35vh] overflow-auto scroll-shadow">
        {supportIssues?.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-dfxGray-300">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Type</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Reason</th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">State</th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Msgs</th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Date</th>
              </tr>
            </thead>
            <tbody>
              {supportIssues.map((issue) => (
                <tr
                  key={issue.id}
                  className="border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer group"
                  onClick={() =>
                    navigate(`/compliance/user/${userDataId}/support-issue/${issue.id}`, { state: { issue } })
                  }
                >
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">
                    {issue.type}
                    {issue.limitRequest && (
                      <span className="ml-1 text-dfxGray-700 group-hover:text-white/70">
                        ({issue.limitRequest.limit.toLocaleString()} CHF
                        {issue.limitRequest.decision && ` - ${issue.limitRequest.decision}`})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">
                    {issue.reason}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-center">{statusBadge(issue.state)}</td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-center group-hover:text-white">
                    {issue.messages.length}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-center whitespace-nowrap group-hover:text-white">
                    {formatDate(issue.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-dfxGray-700 text-sm">No support issues</div>
        )}
      </div>
    </div>
  );
}
