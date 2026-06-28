import { useMemo } from 'react';
import { LedgerAccountBalanceDto } from 'src/dto/ledger.dto';
import { ACCOUNT_TYPE_ORDER, formatChf2, formatNative, reconAmpel } from 'src/util/ledger';
import { ReconAmpel } from './recon-ampel';

interface AccountsTableProps {
  accounts: LedgerAccountBalanceDto[];
  onSelect?: (accountId: number) => void;
  translate: (key: string, defaultValue: string) => string;
}

// Account-list / balance overview table (§9.4 OverviewTable pattern), grouped by account type.
export function AccountsTable({ accounts, onSelect, translate }: AccountsTableProps): JSX.Element {
  const grouped = useMemo(() => {
    const byType = new Map<string, LedgerAccountBalanceDto[]>();
    for (const account of accounts) {
      const list = byType.get(account.type);
      if (list) list.push(account);
      else byType.set(account.type, [account]);
    }
    return ACCOUNT_TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
      type,
      rows: (byType.get(type) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [accounts]);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg shadow-sm text-sm">
        <thead>
          <tr className="bg-dfxGray-300">
            <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
              {translate('screens/ledger', 'Account')}
            </th>
            <th className="px-4 py-3 text-left font-semibold text-dfxBlue-800">
              {translate('screens/ledger', 'Currency')}
            </th>
            <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
              {translate('screens/ledger', 'Balance')}
            </th>
            <th className="px-4 py-3 text-right font-semibold text-dfxBlue-800">
              {translate('screens/ledger', 'Balance (CHF)')}
            </th>
            <th className="px-4 py-3 text-center font-semibold text-dfxBlue-800">
              {translate('screens/ledger', 'Reconciliation')}
            </th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((group) => (
            <ContentGroup
              key={group.type}
              type={group.type}
              rows={group.rows}
              onSelect={onSelect}
              translate={translate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ContentGroupProps {
  type: string;
  rows: LedgerAccountBalanceDto[];
  onSelect?: (accountId: number) => void;
  translate: (key: string, defaultValue: string) => string;
}

function ContentGroup({ type, rows, onSelect, translate }: ContentGroupProps): JSX.Element {
  const subtotal = rows.reduce((sum, row) => sum + row.balanceChf, 0);

  return (
    <>
      <tr className="bg-dfxGray-400/40">
        <td colSpan={5} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-dfxBlue-800">
          {translate('screens/ledger', type)}
        </td>
      </tr>
      {rows.map((row) => (
        <tr
          key={row.accountId}
          className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 ${
            onSelect ? 'cursor-pointer' : ''
          }`}
          onClick={onSelect ? () => onSelect(row.accountId) : undefined}
        >
          <td className="px-4 py-2 text-left text-dfxBlue-800">{row.name}</td>
          <td className="px-4 py-2 text-left text-dfxBlue-800">{row.currency}</td>
          <td className="px-4 py-2 text-right font-mono text-dfxBlue-800">
            {formatNative(row.balanceNative, row.currency)}
          </td>
          <td className="px-4 py-2 text-right font-mono text-dfxBlue-800">{formatChf2(row.balanceChf)}</td>
          <td className="px-4 py-2 text-center">
            <ReconAmpel
              color={reconAmpel(row.reconStatus)}
              title={
                row.reconStatus
                  ? `${translate('screens/ledger', 'Status')}: ${row.reconStatus}${
                      row.reconDiff !== undefined ? ` (${formatChf2(row.reconDiff)} CHF)` : ''
                    }`
                  : undefined
              }
            />
          </td>
        </tr>
      ))}
      <tr className="border-b-2 border-dfxGray-400">
        <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-dfxGray-700">
          {translate('screens/ledger', 'Subtotal')}
        </td>
        <td className="px-4 py-2 text-right font-mono font-semibold text-dfxBlue-800">{formatChf2(subtotal)}</td>
        <td />
      </tr>
    </>
  );
}
