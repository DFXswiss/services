import { Department, SupportIssueInternalState, SupportIssueType, useAuthContext, UserRole } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useSupportDashboardGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { CustomerAuthor, SupportIssueListItem, useSupportDashboard } from 'src/hooks/support-dashboard.hook';
import { formatDateTime, statusBadge } from 'src/util/compliance-helpers';

type Tab = 'open' | 'canceled' | 'completed';

const OPEN_STATES = [
  SupportIssueInternalState.CREATED,
  SupportIssueInternalState.PENDING,
  SupportIssueInternalState.ON_HOLD,
];
const PAGE_SIZE = 20;

export default function SupportDashboardScreen(): JSX.Element {
  useSupportDashboardGuard();

  const { translate } = useSettingsContext();
  const { session } = useAuthContext();
  const { getIssueList } = useSupportDashboard();
  const { navigate } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [openIssuesRaw, setOpenIssuesRaw] = useState<SupportIssueListItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('open');

  // Filters (only apply to Open tab)
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Canceled/Completed paging state
  const [canceledIssues, setCanceledIssues] = useState<SupportIssueListItem[]>([]);
  const [canceledTotal, setCanceledTotal] = useState(0);
  const [canceledLoaded, setCanceledLoaded] = useState(false);
  const [canceledLoading, setCanceledLoading] = useState(false);

  const [completedIssues, setCompletedIssues] = useState<SupportIssueListItem[]>([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const [completedLoading, setCompletedLoading] = useState(false);

  // Search (server-side for canceled/completed)
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = session?.role === UserRole.ADMIN;

  // Load open issues (all, no paging)
  const loadOpenIssues = useCallback((): void => {
    setIsLoading(true);
    setError(undefined);

    const params: Record<string, string> = {};
    if (typeFilter) params.type = typeFilter;
    if (departmentFilter) params.department = departmentFilter;

    getIssueList(params)
      .then((res) => setOpenIssuesRaw(res.data))
      .catch((e: Error) => setError(e.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [typeFilter, departmentFilter, getIssueList]);

  useEffect(() => {
    loadOpenIssues();
  }, [loadOpenIssues]);

  // Load counts for canceled/completed tabs on mount
  useEffect(() => {
    getIssueList({ state: 'Canceled', take: 1, skip: 0 }).then((res) => setCanceledTotal(res.total));
    getIssueList({ state: 'Completed', take: 1, skip: 0 }).then((res) => setCompletedTotal(res.total));
  }, [getIssueList]);

  // Load canceled/completed (paged, server-side search)
  const loadPaged = useCallback(
    (state: 'Canceled' | 'Completed', skip: number, query: string, append: boolean): void => {
      const setLoading = state === 'Canceled' ? setCanceledLoading : setCompletedLoading;
      const setIssues = state === 'Canceled' ? setCanceledIssues : setCompletedIssues;
      const setTotal = state === 'Canceled' ? setCanceledTotal : setCompletedTotal;
      const setLoaded = state === 'Canceled' ? setCanceledLoaded : setCompletedLoaded;

      setLoading(true);
      setError(undefined);

      getIssueList({ state, take: PAGE_SIZE, skip, query: query || undefined })
        .then((res) => {
          setIssues((prev) => (append ? [...prev, ...res.data] : res.data));
          setTotal(res.total);
          setLoaded(true);
        })
        .catch((e: Error) => setError(e.message ?? 'Unknown error'))
        .finally(() => setLoading(false));
    },
    [getIssueList],
  );

  // Lazy load on tab switch
  useEffect(() => {
    if (activeTab === 'canceled' && !canceledLoaded) {
      loadPaged('Canceled', 0, '', false);
    }
    if (activeTab === 'completed' && !completedLoaded) {
      loadPaged('Completed', 0, '', false);
    }
  }, [activeTab, loadPaged, canceledLoaded, completedLoaded]);

  // Debounced search for canceled/completed
  useEffect(() => {
    if (activeTab === 'open') return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const state = activeTab === 'canceled' ? 'Canceled' : 'Completed';
      loadPaged(state, 0, searchQuery, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, activeTab, loadPaged]);

  useLayoutOptions({ title: translate('screens/support', 'Support Dashboard'), backButton: true, noMaxWidth: true });

  const openIssueGroups = useMemo(() => {
    let filtered = openIssuesRaw.filter((i) => (OPEN_STATES as string[]).includes(i.state));
    if (stateFilter) filtered = filtered.filter((i) => i.state === stateFilter);

    const customerWaiting = filtered
      .filter((i) => i.lastMessageAuthor === CustomerAuthor)
      .sort((a, b) => new Date(b.lastMessageDate ?? 0).getTime() - new Date(a.lastMessageDate ?? 0).getTime());

    const rest = filtered.filter((i) => i.lastMessageAuthor !== CustomerAuthor);
    const byCreated = (a: SupportIssueListItem, b: SupportIssueListItem): number =>
      new Date(b.created).getTime() - new Date(a.created).getTime();

    return {
      customerWaiting,
      created: rest.filter((i) => i.state === SupportIssueInternalState.CREATED).sort(byCreated),
      pending: rest.filter((i) => i.state === SupportIssueInternalState.PENDING).sort(byCreated),
      onHold: rest.filter((i) => i.state === SupportIssueInternalState.ON_HOLD).sort(byCreated),
    };
  }, [openIssuesRaw, stateFilter]);

  const openIssueCount =
    openIssueGroups.customerWaiting.length +
    openIssueGroups.created.length +
    openIssueGroups.pending.length +
    openIssueGroups.onHold.length;

  const displayedIssues = activeTab === 'canceled' ? canceledIssues : completedIssues;
  const displayedTotal = activeTab === 'canceled' ? canceledTotal : completedTotal;
  const isTabLoading = activeTab === 'open' ? isLoading : activeTab === 'canceled' ? canceledLoading : completedLoading;
  const hasMore = activeTab !== 'open' && displayedIssues.length < displayedTotal;

  function handleLoadMore(): void {
    const state = activeTab === 'canceled' ? 'Canceled' : 'Completed';
    loadPaged(state, displayedIssues.length, searchQuery, true);
  }

  function handleTabChange(tab: Tab): void {
    setActiveTab(tab);
    if (tab === 'open') setSearchQuery('');
  }

  return (
    <div className="w-full flex flex-col gap-4 max-w-6xl text-left">
      {/* Stats & Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="bg-white rounded-lg shadow-sm p-3 flex-1 min-w-[150px]">
          <div className="text-xs text-dfxGray-700">Open Issues</div>
          <div className="text-2xl font-bold text-dfxBlue-800">{openIssueCount}</div>
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            className="px-4 py-2 bg-dfxBlue-400 text-white rounded-lg text-sm hover:bg-dfxBlue-800 transition-colors"
            onClick={() => navigate('/support/dashboard/create')}
          >
            + {translate('screens/support', 'Create Issue')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dfxGray-400">
        <TabButton
          label={`Open (${openIssueCount})`}
          active={activeTab === 'open'}
          onClick={() => handleTabChange('open')}
        />
        <TabButton
          label={`Canceled (${canceledTotal})`}
          active={activeTab === 'canceled'}
          onClick={() => handleTabChange('canceled')}
        />
        <TabButton
          label={`Completed (${completedTotal})`}
          active={activeTab === 'completed'}
          onClick={() => handleTabChange('completed')}
        />
      </div>

      {/* Filters - only for Open tab */}
      {activeTab === 'open' && (
        <div className="flex gap-3 flex-wrap items-end">
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={Object.values(SupportIssueType)}
          />
          <FilterSelect label="State" value={stateFilter} onChange={setStateFilter} options={OPEN_STATES} />
          {isAdmin && (
            <FilterSelect
              label="Department"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={Object.values(Department)}
            />
          )}
          <button
            className="px-3 py-1.5 text-xs text-dfxGray-700 hover:text-dfxBlue-800 transition-colors"
            onClick={() => {
              setTypeFilter('');
              setStateFilter('');
              setDepartmentFilter('');
            }}
          >
            Reset
          </button>
        </div>
      )}

      {/* Search - for Canceled and Completed tabs */}
      {(activeTab === 'canceled' || activeTab === 'completed') && (
        <div className="flex flex-col gap-1">
          <input
            className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by UID, name, clerk, message..."
          />
        </div>
      )}

      {/* Content */}
      {error && <ErrorHint message={error} />}
      {isTabLoading && (activeTab !== 'open' ? displayedIssues.length === 0 : openIssueCount === 0) ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : activeTab === 'open' ? (
        <GroupedIssueTable
          groups={openIssueGroups}
          showDepartment={isAdmin}
          onRowClick={(issue) => navigate(`/support/dashboard/issue/${issue.id}`)}
        />
      ) : (
        <>
          <IssueTable
            issues={displayedIssues}
            showDepartment={isAdmin}
            onRowClick={(issue) => navigate(`/support/dashboard/issue/${issue.id}`)}
          />
          {hasMore && (
            <button
              className="px-4 py-2 text-sm text-dfxBlue-400 hover:text-dfxBlue-800 transition-colors self-center disabled:opacity-50"
              onClick={handleLoadMore}
              disabled={isTabLoading}
            >
              {isTabLoading ? 'Loading...' : `Load more (${displayedIssues.length} / ${displayedTotal})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): JSX.Element {
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
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
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

interface IssueGroups {
  customerWaiting: SupportIssueListItem[];
  created: SupportIssueListItem[];
  pending: SupportIssueListItem[];
  onHold: SupportIssueListItem[];
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
  return (
    <tr
      className="border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer group"
      onClick={() => onRowClick(issue)}
    >
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">{issue.type}</td>
      <td className="px-2 py-1.5 text-xs text-dfxBlue-800 text-left group-hover:text-white">{issue.reason}</td>
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

function GroupedIssueTable({
  groups,
  showDepartment,
  onRowClick,
}: {
  groups: IssueGroups;
  showDepartment: boolean;
  onRowClick: (issue: SupportIssueListItem) => void;
}): JSX.Element {
  const total = groups.customerWaiting.length + groups.created.length + groups.pending.length + groups.onHold.length;
  if (total === 0) return <div className="p-4 text-dfxGray-700 text-sm">No issues found</div>;

  const colSpan = showDepartment ? COLUMN_COUNT + 1 : COLUMN_COUNT;
  const sections: { label: string; issues: SupportIssueListItem[] }[] = [
    { label: 'Created', issues: groups.created },
    { label: 'Pending', issues: groups.pending },
    { label: 'OnHold', issues: groups.onHold },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm max-h-[60vh] overflow-auto scroll-shadow">
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
              <React.Fragment key={section.label}>
                <SectionHeader label={section.label} count={section.issues.length} colSpan={colSpan} />
                {section.issues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} showDepartment={showDepartment} onRowClick={onRowClick} />
                ))}
              </React.Fragment>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueTable({
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
    <div className="bg-white rounded-lg shadow-sm max-h-[60vh] overflow-auto scroll-shadow">
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
