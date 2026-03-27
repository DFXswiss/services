import { ReactNode } from 'react';
import {
  BankDataInfo,
  BuyRouteInfo,
  KycLogInfo,
  KycStepInfo,
  SellRouteInfo,
  UserInfo,
} from 'src/hooks/compliance.hook';
import { boolBadge, formatDate, statusBadge } from 'src/util/compliance-helpers';

interface ColumnDef<T> {
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => ReactNode;
  className?: string;
}

function DataTable<T extends { id: number }>({
  data,
  columns,
  emptyLabel,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  emptyLabel: string;
}): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          {columns.map((col) => (
            <th
              key={col.header}
              className={`px-3 py-2 text-sm font-semibold text-dfxBlue-800 text-${col.align ?? 'center'}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data?.length > 0 ? (
          data.map((item) => (
            <tr key={item.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-3 py-2 text-sm text-dfxBlue-800 text-${col.align ?? 'center'} ${col.className ?? ''}`}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="px-3 py-4 text-center text-dfxGray-700">
              {emptyLabel}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const usersColumns: ColumnDef<UserInfo>[] = [
  { header: 'ID', render: (u) => u.id },
  { header: 'Address', align: 'left', render: (u) => u.address, className: 'font-mono' },
  { header: 'Ref', render: (u) => u.ref || '-' },
  { header: 'Role', render: (u) => u.role },
  { header: 'Status', render: (u) => u.status },
  { header: 'Created', render: (u) => formatDate(u.created) },
];

export function UsersTable({ users }: { users: UserInfo[] }): JSX.Element {
  return <DataTable data={users} columns={usersColumns} emptyLabel="No users" />;
}

const kycStepsColumns: ColumnDef<KycStepInfo>[] = [
  { header: 'ID', render: (s) => s.id },
  { header: 'Name', align: 'left', render: (s) => s.name },
  { header: 'Type', align: 'left', render: (s) => s.type || '-' },
  { header: 'Status', render: (s) => statusBadge(s.status) },
  { header: 'Sequence', render: (s) => s.sequenceNumber },
  {
    header: 'Comment',
    align: 'left',
    render: (s) => <span title={s.comment}>{s.comment || '-'}</span>,
    className: 'max-w-xs truncate',
  },
  { header: 'Created', render: (s) => formatDate(s.created) },
];

export function KycStepsTable({ kycSteps }: { kycSteps: KycStepInfo[] }): JSX.Element {
  return <DataTable data={kycSteps} columns={kycStepsColumns} emptyLabel="No KYC steps" />;
}

const kycLogsColumns: ColumnDef<KycLogInfo>[] = [
  { header: 'Date', render: (l) => formatDate(l.created) },
  { header: 'Type', align: 'left', render: (l) => l.type },
  {
    header: 'Result',
    align: 'left',
    render: (l) => <span title={l.result}>{l.result || '-'}</span>,
    className: 'max-w-xs truncate',
  },
  { header: 'Comment', align: 'left', render: (l) => l.comment || '-' },
];

export function KycLogsTable({ kycLogs }: { kycLogs: KycLogInfo[] }): JSX.Element {
  return <DataTable data={kycLogs} columns={kycLogsColumns} emptyLabel="No KYC logs" />;
}

const bankDatasColumns: ColumnDef<BankDataInfo>[] = [
  { header: 'ID', render: (b) => b.id },
  { header: 'IBAN', align: 'left', render: (b) => b.iban, className: 'font-mono' },
  { header: 'Name', align: 'left', render: (b) => b.name },
  { header: 'Type', render: (b) => b.type || '-' },
  { header: 'Status', render: (b) => (b.status ? statusBadge(b.status) : '-') },
  { header: 'Approved', render: (b) => boolBadge(b.approved) },
  { header: 'Manual', render: (b) => (b.manualApproved == null ? '-' : boolBadge(b.manualApproved)) },
  { header: 'Active', render: (b) => boolBadge(b.active) },
  {
    header: 'Comment',
    align: 'left',
    render: (b) => <span title={b.comment}>{b.comment || '-'}</span>,
    className: 'max-w-xs truncate',
  },
  { header: 'Created', render: (b) => formatDate(b.created) },
];

export function BankDatasTable({ bankDatas }: { bankDatas: BankDataInfo[] }): JSX.Element {
  return <DataTable data={bankDatas} columns={bankDatasColumns} emptyLabel="No bank data" />;
}

const buyRoutesColumns: ColumnDef<BuyRouteInfo>[] = [
  { header: 'ID', render: (b) => b.id },
  { header: 'IBAN', align: 'left', render: (b) => b.iban || '-', className: 'font-mono' },
  { header: 'Bank Usage', render: (b) => b.bankUsage, className: 'font-mono' },
  { header: 'Asset', render: (b) => b.assetName },
  { header: 'Blockchain', align: 'left', render: (b) => b.blockchain },
  { header: 'Volume', align: 'right', render: (b) => b.volume?.toFixed(2) },
  { header: 'Active', render: (b) => boolBadge(b.active) },
  { header: 'Created', render: (b) => formatDate(b.created) },
];

export function BuyRoutesTable({ buyRoutes }: { buyRoutes: BuyRouteInfo[] }): JSX.Element {
  return <DataTable data={buyRoutes} columns={buyRoutesColumns} emptyLabel="No buy routes" />;
}

const sellRoutesColumns: ColumnDef<SellRouteInfo>[] = [
  { header: 'ID', render: (s) => s.id },
  { header: 'IBAN', align: 'left', render: (s) => s.iban, className: 'font-mono' },
  { header: 'Fiat', render: (s) => s.fiatName || '-' },
  { header: 'Volume', align: 'right', render: (s) => s.volume?.toFixed(2) },
  { header: 'Active', render: (s) => boolBadge(s.active) },
  { header: 'Created', render: (s) => formatDate(s.created) },
];

export function SellRoutesTable({ sellRoutes }: { sellRoutes: SellRouteInfo[] }): JSX.Element {
  return <DataTable data={sellRoutes} columns={sellRoutesColumns} emptyLabel="No sell routes" />;
}
