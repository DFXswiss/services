import { useEffect, useRef, useState } from 'react';
import { NavigateFunction } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import type { UserInfo } from 'src/hooks/compliance.hook';
import { useStaffVerifiedName } from 'src/hooks/staff-verified-name.hook';
import { USED_REF_PATTERN, useUsedRef } from 'src/hooks/used-ref.hook';
import { usedRefGroups } from 'src/util/used-ref.util';
import { STAFF_NAME_MISSING, staffNameLoadError } from './staff-identity';

interface Props {
  userDataId: string;
  users: UserInfo[];
  // Whether the session may change the code (see canEditUsedRef); without it the box is read-only.
  canEdit: boolean;
  navigate: NavigateFunction;
  // Called with the PUT response after the API accepted the change (caller applies it locally).
  onSaved: (users: UserInfo[]) => void;
}

// The referrer of the account in the "Name #id (code)" form the panel always used, and a small form to
// set or change the code for the whole account. An account normally has one referrer; when its wallets
// carry different codes, every code is listed with its wallet count and a change unifies them. The clerk
// is shown because the API stores that name with the change; without a verified name the API refuses,
// so the form does not offer to save.
export function UsedRefEditor({ userDataId, users, canEdit, navigate, onSaved }: Readonly<Props>): JSX.Element {
  const { updateUsedRef } = useUsedRef();
  const { name: clerk, isLoading: isLoadingClerk, error: clerkError } = useStaffVerifiedName();

  const [isEditing, setIsEditing] = useState(false);
  const [usedRef, setUsedRef] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Sync guard: isSaving only disables the button after re-render; a second click in the same tick must
  // not start another update. mountedRef keeps a late answer from touching a box that is gone.
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The screen keeps this box mounted while the clerk moves to another account (same route, new id).
  // The form belongs to the account it was opened for: it closes on the switch, and an answer that
  // arrives for the previous account is not reported as a change of the current one.
  const userDataIdRef = useRef(userDataId);
  userDataIdRef.current = userDataId;
  useEffect(() => {
    savingRef.current = false;
    setIsSaving(false);
    setIsEditing(false);
    setError(undefined);
  }, [userDataId]);

  const groups = usedRefGroups(users);
  const referred = groups.filter((g) => g.usedRef);
  const hasRef = referred.length > 0;
  const code = usedRef.trim();
  const isCodeValid = USED_REF_PATTERN.test(code);
  const canSubmit = !!clerk && isCodeValid && !!reason.trim() && !isSaving && !isLoadingClerk;

  function open(): void {
    // Prefill only an unambiguous code; with mixed codes the clerk picks the one that should stay.
    setUsedRef(referred.length === 1 ? (referred[0].usedRef as string) : '');
    setReason('');
    setError(undefined);
    setIsEditing(true);
  }

  function close(): void {
    setIsEditing(false);
    setError(undefined);
  }

  // Only reachable through the Save button, which is disabled until canSubmit holds.
  async function handleSubmit(): Promise<void> {
    if (savingRef.current) return;
    savingRef.current = true;

    setIsSaving(true);
    setError(undefined);
    const requestedId = userDataId;
    try {
      const updated = await updateUsedRef(requestedId, { usedRef: code, reason: reason.trim() });
      if (!mountedRef.current || userDataIdRef.current !== requestedId) return;
      setIsEditing(false);
      onSaved(updated);
    } catch (e: unknown) {
      if (mountedRef.current && userDataIdRef.current === requestedId)
        setError(e instanceof Error ? e.message : 'Failed to save the Ref-Code');
    } finally {
      if (userDataIdRef.current === requestedId) {
        savingRef.current = false;
        if (mountedRef.current) setIsSaving(false);
      }
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {groups.map((g) => (
            <div key={g.usedRef ?? 'none'} className="flex items-baseline gap-2">
              {g.usedRef ? (
                <button
                  type="button"
                  className="block text-dfxBlue-800 hover:underline disabled:cursor-default disabled:no-underline"
                  disabled={!g.refUserDataId}
                  onClick={() => g.refUserDataId && navigate(`/compliance/user/${g.refUserDataId}`)}
                >
                  {g.refUserName ?? '-'} {g.refUserDataId ? `#${g.refUserDataId}` : ''} ({g.usedRef})
                </button>
              ) : (
                <div className="text-dfxGray-700">No Ref-Code</div>
              )}
              {groups.length > 1 && (
                <span className="text-xs text-dfxGray-700">
                  {g.walletCount} {g.walletCount === 1 ? 'wallet' : 'wallets'}
                </span>
              )}
            </div>
          ))}
        </div>
        {canEdit && !isEditing && (
          <button type="button" className="text-xs text-dfxBlue-800 hover:underline shrink-0" onClick={open}>
            {hasRef ? 'Change' : 'Set'}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor="used-ref-code" className="text-xs text-dfxGray-700">
                Ref-Code
              </label>
              <input
                id="used-ref-code"
                type="text"
                className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 font-mono w-[110px]"
                value={usedRef}
                onChange={(e) => setUsedRef(e.target.value.trim())}
                placeholder="123-456"
                maxLength={7}
                disabled={isSaving}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label htmlFor="used-ref-reason" className="text-xs text-dfxGray-700">
                Reason
              </label>
              <input
                id="used-ref-reason"
                type="text"
                className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 w-full"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                disabled={isSaving}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-dfxGray-700">Clerk</span>
              <p className="px-2 py-1.5 text-xs text-dfxBlue-800">{isLoadingClerk ? '…' : (clerk ?? '—')}</p>
            </div>
          </div>
          {groups.length > 1 && (
            <p className="text-xs text-dfxGray-700">The code is set on all {users.length} wallets of the account.</p>
          )}
          {code !== '' && !isCodeValid && (
            <p className="text-xs text-dfxRed-100">Enter the Ref-Code in the format 123-456.</p>
          )}
          {!isLoadingClerk && !clerk && (
            <ErrorHint message={clerkError ? staffNameLoadError(clerkError) : STAFF_NAME_MISSING} />
          )}
          {error && <p className="text-xs text-dfxRed-100">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1 text-xs text-dfxBlue-800 hover:underline"
              onClick={close}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
