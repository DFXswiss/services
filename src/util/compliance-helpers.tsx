import { Transaction } from '@dfx.swiss/react';

export function DetailRow({
  label,
  value,
  url,
  mono,
}: {
  label: string;
  value?: string | number | null;
  url?: string | null;
  mono?: boolean;
}): JSX.Element | null {
  if (value == null || value === '') return null;

  return (
    <tr>
      <td className="pr-3 py-0.5 font-medium whitespace-nowrap">{label}:</td>
      <td className={`py-0.5${mono ? ' font-mono break-all' : ''}`}>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-dfxBlue-300 underline hover:text-dfxBlue-800"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </td>
    </tr>
  );
}

export function TransactionDetailRows({ tx }: { tx: Transaction }): JSX.Element {
  return (
    <table className="text-sm text-dfxBlue-800 text-left">
      <tbody>
        <DetailRow label="Date" value={tx.date ? new Date(tx.date).toLocaleString() : undefined} />
        <DetailRow label="Type" value={tx.type} />
        <DetailRow label="State" value={tx.state} />
        {tx.reason && <DetailRow label="Failure Reason" value={tx.reason} />}
        <DetailRow
          label="Input"
          value={
            tx.inputAmount != null
              ? `${tx.inputAmount} ${tx.inputAsset ?? ''}${tx.inputBlockchain ? ` (${tx.inputBlockchain})` : ''}`
              : undefined
          }
        />
        <DetailRow label="Input TX" value={tx.inputTxId} url={tx.inputTxUrl} mono />
        {tx.state !== 'Returned' && (
          <DetailRow
            label="Output"
            value={
              tx.outputAmount != null
                ? `${tx.outputAmount} ${tx.outputAsset ?? ''}${tx.outputBlockchain ? ` (${tx.outputBlockchain})` : ''}`
                : undefined
            }
          />
        )}
        <DetailRow label="Output TX" value={tx.outputTxId} url={tx.outputTxUrl} mono />
        <DetailRow label="Exchange Rate" value={tx.exchangeRate} />
        {tx.fees && (
          <>
            <DetailRow label="Fee Total" value={`${tx.fees.total}%`} />
            <DetailRow label="Fee DFX" value={`${tx.fees.dfx}%`} />
            <DetailRow label="Fee Network" value={tx.fees.network ? `${tx.fees.network}%` : undefined} />
            <DetailRow
              label="Fee Bank (fixed)"
              value={tx.fees.bankFixed == null ? undefined : `${tx.fees.bankFixed}%`}
            />
            <DetailRow
              label="Fee Bank (variable)"
              value={tx.fees.bankVariable == null ? undefined : `${tx.fees.bankVariable}%`}
            />
            <DetailRow label="Fee Bank" value={tx.fees.bank ? `${tx.fees.bank}%` : undefined} />
          </>
        )}
        {tx.chargebackAmount != null && (
          <>
            <DetailRow label="Chargeback Amount" value={`${tx.chargebackAmount} ${tx.chargebackAsset ?? ''}`} />
            <DetailRow label="Chargeback Target" value={tx.chargebackTarget} />
            <DetailRow label="Chargeback TX" value={tx.chargeBackTxId} url={tx.chargeBackTxUrl} mono />
            <DetailRow
              label="Chargeback Date"
              value={tx.chargebackDate ? new Date(tx.chargebackDate).toLocaleString() : undefined}
            />
          </>
        )}
      </tbody>
    </table>
  );
}

const statusColors: Record<string, string> = {
  Completed: 'bg-dfxGray-300 text-dfxGreen-100',
  Pass: 'bg-dfxGray-300 text-dfxGreen-100',
  Accepted: 'bg-dfxGray-300 text-dfxGreen-100',
  Yes: 'bg-dfxGray-300 text-dfxGreen-100',
  Failed: 'bg-dfxGray-300 text-primary-red',
  Fail: 'bg-dfxGray-300 text-primary-red',
  Rejected: 'bg-dfxGray-300 text-primary-red',
  No: 'bg-dfxGray-300 text-primary-red',
  Created: 'bg-dfxGray-300 text-dfxBlue-300',
};

const fallbackColor = 'bg-dfxGray-300 text-dfxBlue-800';

export function statusBadge(status: string): JSX.Element {
  const classes = statusColors[status] ?? fallbackColor;
  return <span className={`px-2 py-1 rounded text-xs ${classes}`}>{status}</span>;
}

export function boolBadge(value: boolean, trueLabel = 'Yes', falseLabel = 'No'): JSX.Element {
  return statusBadge(value ? trueLabel : falseLabel);
}

export function todayAsString(): string {
  return new Date().toISOString().split('T')[0];
}

// Mirrors `BankTxUnassignedTypes` in DFXswiss/api (bank-tx.entity.ts).
// Only these types still allow a manual Return via compliance.
export const BankTxUnassignedTypes = ['GSheet', 'Unknown', 'Pending'];

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatDateTimeShort(value: string): string {
  return new Date(value).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error('formatValue failed:', e, value);
    return 'Fehler: Wert kann nicht ermittelt werden';
  }
}
