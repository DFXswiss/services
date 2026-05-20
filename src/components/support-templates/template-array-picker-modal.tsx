import { TransactionInfo } from 'src/hooks/compliance.hook';
import { Modal } from 'src/components/modal';
import { formatDateTime } from 'src/util/compliance-helpers';

interface Props {
  isOpen: boolean;
  transactions: TransactionInfo[];
  onSelect: (transactionId: number) => void;
  onCancel: () => void;
}

export function TemplateArrayPickerModal({ isOpen, transactions, onSelect, onCancel }: Readonly<Props>): JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} variant="dialog">
      <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-dfxBlue-800 font-semibold">Transaktion auswählen</h2>
          <button
            type="button"
            className="text-dfxGray-700 hover:text-dfxBlue-800 text-xl leading-none"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <p className="text-xs text-dfxGray-700">
          Die Vorlage enthält Platzhalter für eine Transaktion. Bitte wähle aus, welche verwendet werden soll.
        </p>
        <div className="max-h-[60vh] overflow-auto border border-dfxGray-300 rounded">
          <table className="w-full text-sm">
            <thead className="bg-dfxGray-300 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-semibold text-dfxBlue-800">ID</th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-dfxBlue-800">UID</th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-dfxBlue-800">Type</th>
                <th className="px-2 py-1 text-right text-xs font-semibold text-dfxBlue-800">CHF</th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-dfxBlue-800">Input</th>
                <th className="px-2 py-1 text-left text-xs font-semibold text-dfxBlue-800">Created</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-dfxGray-300 hover:bg-dfxBlue-400 cursor-pointer group"
                  onClick={() => onSelect(tx.id)}
                >
                  <td className="px-2 py-1 text-xs text-dfxBlue-800 group-hover:text-white">{tx.id}</td>
                  <td className="px-2 py-1 text-xs font-mono text-dfxBlue-800 group-hover:text-white">{tx.uid}</td>
                  <td className="px-2 py-1 text-xs text-dfxBlue-800 group-hover:text-white">{tx.type ?? '-'}</td>
                  <td className="px-2 py-1 text-xs text-right text-dfxBlue-800 group-hover:text-white">
                    {tx.amountInChf != null ? tx.amountInChf.toFixed(2) : '-'}
                  </td>
                  <td className="px-2 py-1 text-xs text-dfxBlue-800 group-hover:text-white">
                    {tx.inputAmount != null ? `${tx.inputAmount} ${tx.inputAsset ?? ''}` : '-'}
                  </td>
                  <td className="px-2 py-1 text-xs text-dfxBlue-800 group-hover:text-white whitespace-nowrap">
                    {formatDateTime(tx.created)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="px-3 py-1 text-xs text-dfxBlue-800 bg-dfxGray-300 rounded hover:bg-dfxGray-400 transition-colors"
            onClick={onCancel}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>
  );
}
