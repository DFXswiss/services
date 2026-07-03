import { Fragment } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustomerAuthor, SupportIssueListItem } from 'src/hooks/support-dashboard.hook';
import { formatDateTime, statusBadge } from 'src/util/compliance-helpers';
import { reasonLabel, typeLabel } from 'src/util/support-helpers';

// Presentational support-issue table components, extracted verbatim from support-dashboard.screen.tsx so both the
// DFX support dashboard and the RealUnit-scoped support screen can share them. All are pure/prop-driven; only
// IssueRow reads `translate` from context. `onRowClick` and `showDepartment` are props, so each screen controls
// routing target and department visibility itself (RealUnit passes showDepartment={false} + a /realunit/... route).

export function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'text-dfxBlue-800 border-b-2 border-dfxBlue-800' : 'text-dfxGray-700 hover:text-dfxBlue-800'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-dfxGray-700">{label}</label>
      <select
        className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface IssueGroups {
  customerWaiting: SupportIssueListItem[];
  created: SupportIssueListItem[];
  pending: SupportIssueListItem[];
}

const COLUMN_COUNT = 9;

function IssueTableHeader({ showDepartment }: { showDepartment: boolean }): JSX.Element {
  return (
    <thead className="sticky top-0 bg-dfxGray-300">
      <tr>
        <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Type</th>
        <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Reason</th>
        <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Name</th>
        <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Clerk</th>
        {showDepartment && <th className="px-2 py-1.5 text-left text-xs font-semibold text-dfxBlue-800">Dept</th>}
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">State</th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Msgs</th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Created</th>
        <th className="px-2 py-1.5 text-center text-xs font-semibold text-dfxBlue-800">Last Msg</th>
      </tr>
    </thead>
  );
}

function IssueRow({
  issue,
  showDepartment,
  onRowClick,
}: {
  issue: SupportIssueListItem;
  showDepartment: boolean;
  onRowClick: (issue: SupportIssueListItem) => void;
}): JSX.Element {
  const { translate } = useSettingsContext();
  return (
    <tr
      className="border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer group"
      onClick={() => onRowClick(issue)}
    >
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">
        {translate('screens/support', typeLabel(issue.type))}
      </td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">
        {translate('screens/support', reasonLabel(issue.reason))}
      </td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white max-w-[200px] truncate">
        {issue.name}
      </td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">{issue.clerk || '-'}</td>
      {showDepartment && (
        <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">
          {issue.department || '-'}
        </td>
      )}
      <td className="px-2 py-1.5 text-xs text-center">{statusBadge(issue.state)}</td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-center group-hover:text-white">
        <span className="inline-flex items-center gap-1">
          {issue.messageCount}
          {issue.lastMessageAuthor === CustomerAuthor && (
            <span className="w-2 h-2 rounded-full bg-dfxRed-100 inline-block" title="Awaiting reply" />
          )}
        </span>
      </td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-center whitespace-nowrap group-hover:text-white">
        {formatDateTime(issue.created)}
      </td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-center whitespace-nowrap group-hover:text-white">
        {issue.lastMessageDate ? formatDateTime(issue.lastMessageDate) : '-'}
      </td>
    </tr>
  );
}

function SectionHeader({ label, count, colSpan }: { label: string; count: number; colSpan: number }): JSX.Element {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-1.5 bg-dfxGray-400/30 text-xs font-semibold text-dfxGray-700">
        {label} ({count})
      </td>
    </tr>
  );
}

export function GroupedIssueTable({
  groups,
  showDepartment,
  onRowClick,
}: {
  groups: IssueGroups;
  showDepartment: boolean;
  onRowClick: (issue: SupportIssueListItem) => void;
}): JSX.Element {
  const total = groups.customerWaiting.length + groups.created.length + groups.pending.length;
  if (total === 0) return <div className="p-4 text-dfxGray-700 text-sm">No issues found</div>;

  const colSpan = showDepartment ? COLUMN_COUNT + 1 : COLUMN_COUNT;
  const sections: { label: string; issues: SupportIssueListItem[] }[] = [
    { label: 'Created', issues: groups.created },
    { label: 'Pending', issues: groups.pending },
  ];

  return (
    <div className="bg-white shadow-sm flex-1 min-h-0 overflow-auto scroll-shadow">
      <table className="w-full border-collapse">
        <IssueTableHeader showDepartment={showDepartment} />
        <tbody>
          {groups.customerWaiting.length > 0 && (
            <>
              <SectionHeader label="Awaiting reply" count={groups.customerWaiting.length} colSpan={colSpan} />
              {groups.customerWaiting.map((issue) => (
                <IssueRow key={issue.id} issue={issue} showDepartment={showDepartment} onRowClick={onRowClick} />
              ))}
            </>
          )}
          {sections
            .filter((s) => s.issues.length > 0)
            .map((section) => (
              <Fragment key={section.label}>
                <SectionHeader label={section.label} count={section.issues.length} colSpan={colSpan} />
                {section.issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} showDepartment={showDepartment} onRowClick={onRowClick} />
                ))}
              </Fragment>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function IssueTable({
  issues,
  showDepartment,
  onRowClick,
}: {
  issues: SupportIssueListItem[];
  showDepartment: boolean;
  onRowClick: (issue: SupportIssueListItem) => void;
}): JSX.Element {
  if (issues.length === 0) {
    return <div className="p-4 text-dfxGray-700 text-sm">No issues found</div>;
  }

  return (
    <div className="bg-white shadow-sm flex-1 min-h-0 overflow-auto scroll-shadow">
      <table className="w-full border-collapse">
        <IssueTableHeader showDepartment={showDepartment} />
        <tbody>
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} showDepartment={showDepartment} onRowClick={onRowClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
