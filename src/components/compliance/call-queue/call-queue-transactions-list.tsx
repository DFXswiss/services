import { useMemo, useState } from 'react';
import { TransactionInfo } from 'src/hooks/compliance.hook';
import { formatDateTime, statusBadge } from 'src/util/compliance-helpers';

interface Props {
  transactions: TransactionInfo[];
  title: string;
  initialLimit?: number;
  step?: number;
}

export function CallQueueTransactionsList({ transactions, title, initialLimit = 5, step = 5 }: Props): JSX.Element {
  const [visibleCount, setVisibleCount] = useState(initialLimit);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()),
    [transactions],
  );
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">
        {title} ({transactions.length})
      </h3>
      {visible.length === 0 ? (
        <span className="text-sm text-dfxGray-700">-</span>
      ) : (
        <>
          <div className="w-full max-h-96 overflow-y-auto overflow-x-auto scroll-shadow">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-dfxGray-300 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Created</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Source</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Input</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Output</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">AML Check</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">AML Reason</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b border-dfxGray-300">
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{t.id}</td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800 whitespace-nowrap">
                      {formatDateTime(t.created)}
                    </td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{t.sourceType}</td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800 whitespace-nowrap">
                      {t.inputAmount != null ? `${t.inputAmount.toFixed(2)} ${t.inputAsset ?? ''}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800 whitespace-nowrap">
                      {t.outputAmount != null && t.outputAsset
                        ? `${t.outputAmount} ${t.outputAsset}`
                        : (t.outputAsset ?? '-')}
                    </td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">
                      {t.amlCheck ? statusBadge(t.amlCheck) : '-'}
                    </td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{t.amlReason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="mt-3 flex justify-center">
              <button
                className="px-3 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
                onClick={() => setVisibleCount((c) => c + step)}
              >
                Load more ({sorted.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
