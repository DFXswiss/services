import { useMemo } from 'react';
import { BankTxInfo } from 'src/hooks/compliance.hook';

interface Props {
  bankTxs: BankTxInfo[];
  title: string;
  limit?: number;
  highlightTransactionId?: number;
}

export function CallQueueBankTxInfo({ bankTxs, title, limit = 10, highlightTransactionId }: Props): JSX.Element {
  const entries = useMemo(() => [...bankTxs].sort((a, b) => b.id - a.id).slice(0, limit), [bankTxs, limit]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      {entries.length === 0 ? (
        <span className="text-sm text-dfxGray-700">-</span>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-dfxGray-300">
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">IBAN</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Account Service Ref</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-dfxBlue-800">Tx</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((b) => {
                const highlight = highlightTransactionId != null && b.transactionId === highlightTransactionId;
                return (
                  <tr key={b.id} className={`border-b border-dfxGray-300 ${highlight ? 'bg-dfxBlue-100' : ''}`}>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{b.id}</td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{b.type}</td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">
                      {b.amount} {b.currency}
                    </td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{b.name ?? '-'}</td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800 break-all">{b.iban ?? '-'}</td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800 break-all">
                      {b.accountServiceRef ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-left text-xs text-dfxBlue-800">{b.transactionId ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {entries.length < bankTxs.length && (
            <span className="text-xs text-dfxGray-700 mt-2 inline-block">
              Showing {entries.length} of {bankTxs.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
