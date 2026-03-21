import { FinancialLogEntry } from 'src/dto/dashboard.dto';

interface FinancialLogTableProps {
  entries: FinancialLogEntry[];
}

function formatChf(value: number): string {
  return value.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function FinancialLogTable({ entries }: FinancialLogTableProps) {
  const reversed = [...entries].reverse();

  return (
    <div className="overflow-auto max-h-[680px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 font-semibold">Timestamp (UTC)</th>
            <th className="text-right py-2 px-2 font-semibold">Vermögen (CHF)</th>
            <th className="text-right py-2 px-2 font-semibold">Plus (CHF)</th>
            <th className="text-right py-2 px-2 font-semibold">Minus (CHF)</th>
          </tr>
        </thead>
        <tbody>
          {reversed.map((entry, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-1 px-2 whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
              <td className="py-1 px-2 text-right whitespace-nowrap">{formatChf(entry.totalBalanceChf)}</td>
              <td className="py-1 px-2 text-right whitespace-nowrap text-green-600">{formatChf(entry.plusBalanceChf)}</td>
              <td className="py-1 px-2 text-right whitespace-nowrap text-red-600">{formatChf(entry.minusBalanceChf)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
