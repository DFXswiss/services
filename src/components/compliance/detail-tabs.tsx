import {
  BankDataInfo,
  BuyRouteInfo,
  KycLogInfo,
  KycStepInfo,
  SellRouteInfo,
  UserInfo,
} from 'src/hooks/compliance.hook';
import { boolBadge, formatDate, statusBadge } from 'src/util/compliance-helpers';

export function UsersTable({ users }: { users: UserInfo[] }): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Address</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Role</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Status</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
        </tr>
      </thead>
      <tbody>
        {users?.length > 0 ? (
          users.map((user) => (
            <tr key={user.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{user.id}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono text-left">{user.address}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{user.role}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{user.status}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(user.created)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="px-3 py-4 text-center text-dfxGray-700">
              No users
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function KycStepsTable({ kycSteps }: { kycSteps: KycStepInfo[] }): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Status</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Sequence</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Comment</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
        </tr>
      </thead>
      <tbody>
        {kycSteps?.length > 0 ? (
          kycSteps.map((step) => (
            <tr key={step.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{step.id}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{step.name}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{step.type || '-'}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{statusBadge(step.status)}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{step.sequenceNumber}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left max-w-xs truncate" title={step.comment}>
                {step.comment || '-'}
              </td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(step.created)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={7} className="px-3 py-4 text-center text-dfxGray-700">
              No KYC steps
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function KycLogsTable({ kycLogs }: { kycLogs: KycLogInfo[] }): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Date</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Comment</th>
        </tr>
      </thead>
      <tbody>
        {kycLogs?.length > 0 ? (
          kycLogs.map((log) => (
            <tr key={log.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(log.created)}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{log.type}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{log.comment || '-'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3} className="px-3 py-4 text-center text-dfxGray-700">
              No KYC logs
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function BankDatasTable({ bankDatas }: { bankDatas: BankDataInfo[] }): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">IBAN</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Type</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Status</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Approved</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Manual</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Active</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Comment</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
        </tr>
      </thead>
      <tbody>
        {bankDatas?.length > 0 ? (
          bankDatas.map((bankData) => (
            <tr key={bankData.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{bankData.id}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono text-left">{bankData.iban}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{bankData.name}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{bankData.type || '-'}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">
                {bankData.status ? statusBadge(bankData.status) : '-'}
              </td>
              <td className="px-3 py-2 text-sm">{boolBadge(bankData.approved)}</td>
              <td className="px-3 py-2 text-sm">
                {bankData.manualApproved != null ? boolBadge(bankData.manualApproved) : '-'}
              </td>
              <td className="px-3 py-2 text-sm">{boolBadge(bankData.active)}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left max-w-xs truncate" title={bankData.comment}>
                {bankData.comment || '-'}
              </td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(bankData.created)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={10} className="px-3 py-4 text-center text-dfxGray-700">
              No bank data
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function BuyRoutesTable({ buyRoutes }: { buyRoutes: BuyRouteInfo[] }): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">IBAN</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Bank Usage</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Asset</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Blockchain</th>
          <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Volume</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Active</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
        </tr>
      </thead>
      <tbody>
        {buyRoutes?.length > 0 ? (
          buyRoutes.map((buy) => (
            <tr key={buy.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{buy.id}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono text-left">{buy.iban || '-'}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono">{buy.bankUsage}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{buy.assetName}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-left">{buy.blockchain}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">{buy.volume?.toFixed(2)}</td>
              <td className="px-3 py-2 text-sm">{boolBadge(buy.active)}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(buy.created)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8} className="px-3 py-4 text-center text-dfxGray-700">
              No buy routes
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export function SellRoutesTable({ sellRoutes }: { sellRoutes: SellRouteInfo[] }): JSX.Element {
  return (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 bg-dfxGray-300">
        <tr>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">ID</th>
          <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">IBAN</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Fiat</th>
          <th className="px-3 py-2 text-right text-sm font-semibold text-dfxBlue-800">Volume</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Active</th>
          <th className="px-3 py-2 text-center text-sm font-semibold text-dfxBlue-800">Created</th>
        </tr>
      </thead>
      <tbody>
        {sellRoutes?.length > 0 ? (
          sellRoutes.map((sell) => (
            <tr key={sell.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{sell.id}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono text-left">{sell.iban}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{sell.fiatName || '-'}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800 text-right">{sell.volume?.toFixed(2)}</td>
              <td className="px-3 py-2 text-sm">{boolBadge(sell.active)}</td>
              <td className="px-3 py-2 text-sm text-dfxBlue-800">{formatDate(sell.created)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className="px-3 py-4 text-center text-dfxGray-700">
              No sell routes
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
