import { useEffect, useRef, useState } from 'react';
import { NavigateFunction } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import type { UserInfo } from 'src/hooks/compliance.hook';
import { useStaffVerifiedName } from 'src/hooks/staff-verified-name.hook';
import { USED_REF_PATTERN, useUsedRef } from 'src/hooks/used-ref.hook';
import { DEFAULT_REF } from 'src/util/compliance-helpers';
import { STAFF_NAME_MISSING, staffNameLoadError } from './staff-identity';

interface Props {
  user: UserInfo;
  // Whether the session may change the code (see canEditUsedRef); without it the row is read-only.
  canEdit: boolean;
  navigate: NavigateFunction;
  onSaved: (user: UserInfo) => void;
}

function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-4)}` : address;
}

// One wallet of the account: its referrer in the "Name #id (code)" form the panel always used, and a
// small form to set or change the code. The clerk is shown because the API stores that name with the
// change; without a verified name the API refuses, so the form does not offer to save.
export function UsedRefEditor({ user, canEdit, navigate, onSaved }: Readonly<Props>): JSX.Element {
  const { updateUsedRef } = useUsedRef();
  const { name: clerk, isLoading: isLoadingClerk, error: clerkError } = useStaffVerifiedName();

  const [isEditing, setIsEditing] = useState(false);
  const [usedRef, setUsedRef] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  // Sync guard: isSaving only disables the button after re-render; a second click in the same tick must
  // not start another update. mountedRef keeps a late answer from touching a row that is gone.
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const hasRef = !!user.usedRef && user.usedRef !== DEFAULT_REF;
  const code = usedRef.trim();
  const isCodeValid = USED_REF_PATTERN.test(code);
  const canSubmit = !!clerk && isCodeValid && !!reason.trim() && !isSaving && !isLoadingClerk;

  const usedRefId = `used-ref-${user.id}-code`;
  const reasonId = `used-ref-${user.id}-reason`;

  function open(): void {
    setUsedRef(hasRef ? (user.usedRef as string) : '');
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
    try {
      const updated = await updateUsedRef(user.id, { usedRef: code, reason: reason.trim() });
      if (!mountedRef.current) return;
      setIsEditing(false);
      onSaved(updated);
    } catch (e: unknown) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to save the Ref-Code');
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  }

  return (
    <div className="py-2 border-b border-dfxGray-300 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {hasRef ? (
            <button
              type="button"
              className="block text-dfxBlue-800 hover:underline disabled:cursor-default disabled:no-underline"
              disabled={!user.refUserDataId}
              onClick={() => user.refUserDataId && navigate(`/compliance/user/${user.refUserDataId}`)}
            >
              {user.refUserName ?? '-'} {user.refUserDataId ? `#${user.refUserDataId}` : ''} ({user.usedRef})
            </button>
          ) : (
            <div className="text-dfxGray-700">No Ref-Code</div>
          )}
          <div className="text-xs text-dfxGray-700">
            {user.walletName ?? 'Wallet'}{' '}
            <span className="font-mono" title={user.address}>
              {shortAddress(user.address)}
            </span>
          </div>
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
              <label htmlFor={usedRefId} className="text-xs text-dfxGray-700">
                Ref-Code
              </label>
              <input
                id={usedRefId}
                type="text"
                className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 font-mono w-[110px]"
                value={usedRef}
                onChange={(e) => setUsedRef(e.target.value)}
                placeholder="123-456"
                maxLength={7}
                disabled={isSaving}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label htmlFor={reasonId} className="text-xs text-dfxGray-700">
                Reason
              </label>
              <input
                id={reasonId}
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
