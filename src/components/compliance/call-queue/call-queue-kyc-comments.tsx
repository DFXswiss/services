import { KycLogInfo } from 'src/hooks/compliance.hook';
import { formatDateTime } from 'src/util/compliance-helpers';

interface Props {
  kycLogs: KycLogInfo[];
  title: string;
  filterTypes?: string[];
  limit?: number;
}

export function CallQueueKycComments({ kycLogs, title, filterTypes, limit = 5 }: Props): JSX.Element {
  const filtered = kycLogs
    .filter((l) => l.comment != null && l.comment !== '')
    .filter((l) => !filterTypes || filterTypes.includes(l.type))
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, limit)
    .reverse();

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      {filtered.length === 0 ? (
        <span className="text-sm text-dfxGray-700">-</span>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((log) => (
            <div key={log.id} className="border-l-4 border-dfxBlue-800 pl-3 text-left">
              <div className="flex justify-between gap-4 items-baseline">
                <span className="text-xs font-semibold text-dfxBlue-800">{log.type}</span>
                <span className="text-xs text-dfxGray-700">{formatDateTime(log.created)}</span>
              </div>
              <p className="text-sm text-dfxBlue-800 mt-1 whitespace-pre-wrap break-words">{log.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
