import { BankDataInfo, TransactionInfo } from 'src/hooks/compliance.hook';
import { formatDateTime } from 'src/util/compliance-helpers';

interface Props {
  transaction: TransactionInfo;
  bankData?: BankDataInfo;
  title: string;
}

type Row = { label: string; value?: string };

function renderRow({ label, value }: Row): JSX.Element {
  return (
    <div key={label} className="flex justify-between gap-4 py-1 border-b border-dfxGray-300 last:border-none">
      <span className="text-sm text-dfxGray-700">{label}</span>
      <span className="text-sm text-dfxBlue-800 font-medium text-right break-all">{value || '-'}</span>
    </div>
  );
}

function combineAmountAsset(amount?: number | null, asset?: string): string | undefined {
  if (amount == null && !asset) return undefined;
  return `${amount ?? ''} ${asset ?? ''}`.trim() || undefined;
}

export function CallQueueTxInfo({ transaction, bankData, title }: Props): JSX.Element {
  const leftRows: Row[] = [
    { label: 'Transaction ID', value: String(transaction.id) },
    { label: 'Source Type', value: transaction.sourceType },
    { label: 'Created', value: formatDateTime(transaction.created) },
    { label: 'Input', value: combineAmountAsset(transaction.inputAmount, transaction.inputAsset) },
    { label: 'Output', value: combineAmountAsset(transaction.outputAmount, transaction.outputAsset) },
    { label: 'Amount (CHF)', value: transaction.amountInChf != null ? String(transaction.amountInChf) : undefined },
  ];

  const rightRows: Row[] = [
    { label: 'UID', value: transaction.uid },
    { label: 'Type', value: transaction.type },
    { label: 'AML Check', value: transaction.amlCheck },
    { label: 'AML Reason', value: transaction.amlReason },
    { label: 'IBAN', value: bankData?.iban },
    { label: 'Bank Data Name', value: bankData?.name },
    { label: 'Bank Data Status', value: bankData?.status },
  ];

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-base font-semibold text-dfxBlue-800 mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div className="flex flex-col gap-y-1">{leftRows.map(renderRow)}</div>
        <div className="flex flex-col gap-y-1">{rightRows.map(renderRow)}</div>
      </div>
      <div className="flex justify-between gap-4 py-1 mt-1 border-t border-dfxGray-300">
        <span className="text-sm text-dfxGray-700">Comment</span>
        <span className="text-sm text-dfxBlue-800 font-medium text-right break-words whitespace-pre-wrap">
          {transaction.comment || '-'}
        </span>
      </div>
    </div>
  );
}
