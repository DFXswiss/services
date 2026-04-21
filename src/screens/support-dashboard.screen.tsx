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
import { reasonLabel, typeLabel } from 'src/util/support-helpers';

type PagedTab = 'OnHold' | 'Canceled' | 'Completed';
type Tab = 'open' | PagedTab;

const OPEN_STATES = [SupportIssueInternalState.CREATED, SupportIssueInternalState.PENDING];
const PAGED_TABS: PagedTab[] = ['OnHold', 'Canceled', 'Completed'];
const PAGE_SIZE = 20;

interface TabData {
  issues: SupportIssueListItem[];
  total: number;
  loaded: boolean;
  loading: boolean;
}

const emptyTabData: TabData = { issues: [], total: 0, loaded: false, loading: false };

export default function SupportDashboardScreen(): JSX.Element {
  useSupportDashboardGuard();

  const { translate } = useSettingsContext();
  const { session } = useAuthContext();
  const { getIssueList, getIssueCounts } = useSupportDashboard();
  const { navigate } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [openIssues, setOpenIssues] = useState<SupportIssueListItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('open');

  const [typeFilter, setTypeFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  const [tabs, setTabs] = useState<Record<PagedTab, TabData>>({
    OnHold: { ...emptyTabData },
    Canceled: { ...emptyTabData },
    Completed: { ...emptyTabData },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = session?.role === UserRole.ADMIN;

  const loadOpenIssues = useCallback(
    (query: string): void => {
      setIsLoading(true);
      setError(undefined);

      const params: Record<string, string> = { states: OPEN_STATES.join(',') };
      if (typeFilter) params.type = typeFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (query) params.query = query;

      getIssueList(params)
        .then((res) => setOpenIssues(res.data))
        .catch((e: Error) => setError(e.message ?? 'Unknown error'))
        .finally(() => setIsLoading(false));
    },
    [typeFilter, departmentFilter, getIssueList],
  );

  useEffect(() => {
    getIssueCounts()
      .then((counts) =>
        setTabs((prev) => ({
          OnHold: { ...prev.OnHold, total: counts[SupportIssueInternalState.ON_HOLD] ?? 0 },
          Canceled: { ...prev.Canceled, total: counts[SupportIssueInternalState.CANCELED] ?? 0 },
          Completed: { ...prev.Completed, total: counts[SupportIssueInternalState.COMPLETED] ?? 0 },
        })),
      )
      .catch(() => undefined);
  }, [getIssueCounts]);

  const loadPaged = useCallback(
    (state: PagedTab, skip: number, query: string, append: boolean): void => {
      setTabs((prev) => ({ ...prev, [state]: { ...prev[state], loading: true } }));
      setError(undefined);

      getIssueList({ states: state, take: PAGE_SIZE, skip, query: query || undefined })
        .then((res) => {
          setTabs((prev) => ({
            ...prev,
            [state]: {
              issues: append ? [...prev[state].issues, ...res.data] : res.data,
              total: res.total,
              loaded: true,
              loading: false,
            },
          }));
        })
        .catch((e: Error) => {
          setError(e.message ?? 'Unknown error');
          setTabs((prev) => ({ ...prev, [state]: { ...prev[state], loading: false } }));
        });
    },
    [getIssueList],
  );

  useEffect(() => {
    if (activeTab !== 'open' && !tabs[activeTab].loaded) loadPaged(activeTab, 0, '', false);
  }, [activeTab, loadPaged, tabs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (activeTab === 'open') loadOpenIssues(searchQuery);
      else loadPaged(activeTab, 0, searchQuery, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, activeTab, loadPaged, loadOpenIssues]);

  useLayoutOptions({
    title: translate('screens/support', 'Support Dashboard'),
    backButton: true,
    noMaxWidth: true,
    noPadding: true,
  });

  const openIssueGroups = useMemo(() => {
    const filtered = stateFilter ? openIssues.filter((i) => i.state === stateFilter) : openIssues;

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
    };
  }, [openIssues, stateFilter]);

  const openIssueCount =
    openIssueGroups.customerWaiting.length + openIssueGroups.created.length + openIssueGroups.pending.length;

  const currentTab = activeTab === 'open' ? null : tabs[activeTab];
  const displayedIssues = currentTab?.issues ?? [];
  const displayedTotal = currentTab?.total ?? 0;
  const isTabLoading = activeTab === 'open' ? isLoading : (currentTab?.loading ?? false);
  const hasMore = currentTab != null && displayedIssues.length < displayedTotal;

  function handleLoadMore(): void {
    if (activeTab === 'open') return;
    loadPaged(activeTab, displayedIssues.length, searchQuery, true);
  }

  return (
    <div className="w-full flex flex-col gap-3 flex-1 min-h-0 p-3 text-left">
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
          onClick={() => setActiveTab('open')}
        />
        {PAGED_TABS.map((tab) => (
          <TabButton
            key={tab}
            label={`${tab} (${tabs[tab].total})`}
            active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          />
        ))}
      </div>

      {/* Filters - only for Open tab */}
      {activeTab === 'open' && (
        <div className="flex gap-3 flex-wrap items-end">
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={Object.values(SupportIssueType).map((t) => ({
              value: t,
              label: translate('screens/support', typeLabel(t)),
            }))}
          />
          <FilterSelect
            label="State"
            value={stateFilter}
            onChange={setStateFilter}
            options={OPEN_STATES.map((s) => ({ value: s, label: s }))}
          />
          {isAdmin && (
            <FilterSelect
              label="Department"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={Object.values(Department).map((d) => ({ value: d, label: d }))}
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

      {/* Search - all tabs (server-side) */}
      <div className="flex flex-col gap-1">
        <input
          className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by UID, name, clerk, message..."
        />
      </div>

      {/* Content */}
      {error && <ErrorHint message={error} />}
      {isTabLoading && (activeTab === 'open' ? openIssueCount === 0 : displayedIssues.length === 0) ? (
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

interface IssueGroups {
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

function GroupedIssueTable({
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
