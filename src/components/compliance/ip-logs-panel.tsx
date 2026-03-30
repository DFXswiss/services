import { useState } from 'react';
import { IpLogInfo, useCompliance } from 'src/hooks/compliance.hook';
import { boolBadge, formatDateTimeShort } from 'src/util/compliance-helpers';

interface IpLogsPanelProps {
  ipLogs: IpLogInfo[];
  userDataId: number;
}

export function IpLogsPanel({ ipLogs, userDataId }: IpLogsPanelProps): JSX.Element {
  const { downloadIpLogPdf } = useCompliance();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDownloadPdf(): Promise<void> {
    setIsDownloading(true);
    setError(undefined);
    try {
      await downloadIpLogPdf(userDataId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF download failed');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="border-t border-dfxGray-500 pt-4">
      <div className="relative mb-2">
        <h2 className="text-dfxGray-700 text-center">IP Logs ({ipLogs?.length || 0})</h2>
        {ipLogs?.length > 0 && (
          <button
            className="absolute right-0 top-0 text-xs text-dfxBlue-300 underline hover:text-dfxBlue-800 disabled:opacity-50 disabled:no-underline"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'PDF'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-primary-red mb-1">{error}</p>}
      <div className="bg-white rounded-lg shadow-sm max-h-[35vh] overflow-auto scroll-shadow">
        {ipLogs?.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-dfxGray-300">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">IP / Country</th>
                <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Endpoint</th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Status</th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Date</th>
              </tr>
            </thead>
            <tbody>
              {ipLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 ${!log.result ? 'bg-dfxRed-100/15' : ''}`}
                >
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left">
                    <span className="font-mono">{log.ip}</span>
                    {log.country && <span className="ml-1 text-dfxGray-700">({log.country})</span>}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left">{log.url.replace('/v1/', '')}</td>
                  <td className="px-2 py-1.5 text-xs text-center">{boolBadge(log.result, 'Pass', 'Fail')}</td>
                  <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-center whitespace-nowrap">
                    {formatDateTimeShort(log.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-dfxGray-700 text-sm">No IP logs</div>
        )}
      </div>
    </div>
  );
}
