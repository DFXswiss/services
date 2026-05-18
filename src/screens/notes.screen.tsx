import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NoteComposer } from 'src/components/compliance/note-composer';
import { NoteList } from 'src/components/compliance/note-list';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { SupportNoteInfo, SupportNoteScope, SupportNoteUser, useCompliance } from 'src/hooks/compliance.hook';
import { useSupportDashboardGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

type Scope = Extract<SupportNoteScope, 'All' | 'Free'>;

export default function NotesScreen(): JSX.Element {
  useSupportDashboardGuard();
  const { translate } = useSettingsContext();

  const { listSupportNotes, listSupportNoteUsers } = useCompliance();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notes, setNotes] = useState<SupportNoteInfo[]>([]);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [scope, setScope] = useState<Scope>('All');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  // Customer filter (autocomplete)
  const [users, setUsers] = useState<SupportNoteUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SupportNoteUser>();
  const [customerQuery, setCustomerQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerBoxRef = useRef<HTMLDivElement>(null);

  const [showCompose, setShowCompose] = useState(searchParams.get('compose') === '1');
  const [initialUserDataId] = useState(searchParams.get('userDataId') ?? '');

  useLayoutOptions({ title: translate('screens/compliance', 'Notes'), backButton: true, noMaxWidth: true });

  const loadNotes = useCallback(() => {
    setIsLoading(true);
    setError(undefined);
    const effectiveScope = selectedUser || scope === 'All' ? undefined : scope;
    listSupportNotes({
      search: submittedSearch || undefined,
      scope: effectiveScope,
      userDataId: selectedUser?.userDataId,
    })
      .then(setNotes)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load notes'))
      .finally(() => setIsLoading(false));
  }, [listSupportNotes, submittedSearch, scope, selectedUser]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const loadUsers = useCallback(() => {
    listSupportNoteUsers()
      .then((fetched) => {
        setUsers(fetched);
        // Reset filter if selected user no longer has notes
        setSelectedUser((prev) => (prev && fetched.some((u) => u.userDataId === prev.userDataId) ? prev : undefined));
      })
      .catch(() => undefined);
  }, [listSupportNoteUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshAll = useCallback(() => {
    loadNotes();
    loadUsers();
  }, [loadNotes, loadUsers]);

  // Drop compose/userDataId params from the URL after they have been consumed
  // so that a reload does not re-open the compose dialog. Only runs once on mount.
  useEffect(() => {
    if (searchParams.has('compose') || searchParams.has('userDataId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('compose');
      next.delete('userDataId');
      setSearchParams(next, { replace: true });
    }
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (!customerBoxRef.current?.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 20);
  }, [users, customerQuery]);

  function submitSearch(): void {
    setSubmittedSearch(search.trim());
  }

  function resetSearch(): void {
    setSearch('');
    setSubmittedSearch('');
  }

  function handleCreated(): void {
    setShowCompose(false);
    refreshAll();
  }

  function selectUser(user: SupportNoteUser): void {
    setSelectedUser(user);
    setCustomerQuery('');
    setShowSuggestions(false);
    if (scope === 'Free') setScope('All');
  }

  function clearUser(): void {
    setSelectedUser(undefined);
    setCustomerQuery('');
  }

  function handleScopeChange(next: Scope): void {
    setScope(next);
    if (next === 'Free' && selectedUser) clearUser();
  }

  return (
    <div className="w-full flex flex-col gap-4 text-left">
      <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 flex-1 min-w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            placeholder={translate('screens/compliance', 'Search subject, content or name')}
          />
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
            onClick={submitSearch}
          >
            {translate('general/actions', 'Search')}
          </button>
          {submittedSearch && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium bg-dfxGray-300 text-dfxBlue-800 rounded hover:bg-dfxGray-400 transition-colors"
              onClick={resetSearch}
            >
              ✕
            </button>
          )}
          <select
            className="px-2 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
            value={scope}
            onChange={(e) => handleScopeChange(e.target.value as Scope)}
            disabled={selectedUser != null}
            title={selectedUser ? 'Filter ist auf einen Kunden eingeschränkt' : undefined}
          >
            <option value="All">Alle</option>
            <option value="Free">Ohne Kundenbezug</option>
          </select>

          <div ref={customerBoxRef} className="relative min-w-[220px]">
            {selectedUser ? (
              <div className="flex items-center gap-1 px-2 py-1 text-sm border border-dfxGray-400 rounded bg-dfxBlue-300/20 text-dfxBlue-800">
                <span className="truncate">
                  {selectedUser.name} <span className="text-dfxGray-700">({selectedUser.count})</span>
                </span>
                <button
                  type="button"
                  className="ml-auto px-1 text-xs hover:text-dfxRed-100"
                  onClick={clearUser}
                  title="Filter zurücksetzen"
                >
                  ✕
                </button>
              </div>
            ) : (
              <input
                type="text"
                className="w-full px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Kunden Notes filtern"
              />
            )}
            {!selectedUser && showSuggestions && filteredUsers.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-auto bg-white border border-dfxGray-400 rounded shadow-lg text-sm">
                {filteredUsers.map((u) => (
                  <li key={u.userDataId}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-1.5 hover:bg-dfxGray-300 text-dfxBlue-800 flex justify-between items-center gap-2"
                      onClick={() => selectUser(u)}
                    >
                      <span className="truncate">
                        {u.name || `UserData #${u.userDataId}`}{' '}
                        <span className="text-dfxGray-700">#{u.userDataId}</span>
                      </span>
                      <span className="text-xs text-dfxGray-700">{u.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!selectedUser && showSuggestions && filteredUsers.length === 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-dfxGray-400 rounded shadow-lg p-2 text-sm text-dfxGray-700">
                Keine Kunden Notes gefunden
              </div>
            )}
          </div>

          <button
            type="button"
            className="ml-auto px-3 py-1.5 text-sm font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
            onClick={() => setShowCompose((v) => !v)}
          >
            {showCompose ? '× Abbrechen' : '+ Neue Notiz'}
          </button>
        </div>

        {showCompose && (
          <div className="border-t border-dfxGray-300 pt-2">
            <NoteComposer
              allowUserDataIdInput
              initialUserDataId={selectedUser ? String(selectedUser.userDataId) : initialUserDataId}
              submitLabel="Notiz speichern"
              contentPlaceholder="Neue Notiz..."
              onCreated={handleCreated}
            />
          </div>
        )}
      </div>

      {error && <ErrorHint message={error} />}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-4 text-center text-dfxGray-700 text-sm">
          {translate('screens/compliance', 'Loading...')}
        </div>
      ) : (
        <NoteList
          notes={notes}
          showUserDataIdLink
          emptyMessage={translate('screens/compliance', 'No entries found')}
          onChange={refreshAll}
        />
      )}
    </div>
  );
}
