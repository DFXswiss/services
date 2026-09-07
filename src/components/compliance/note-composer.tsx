import { Department, useAuthContext, UserRole } from '@dfx.swiss/react';
import { useEffect, useRef, useState } from 'react';
import { useCompliance } from 'src/hooks/compliance.hook';
import { adminDeptOptions } from './note-utils';

// Mirrors CreateSupportNoteDto @MaxLength(8000) in DFXswiss/backend. The textarea caps typing at this
// length; pre-filled content (a customer message) can exceed it and then blocks the submit instead.
export const MAX_CONTENT_LENGTH = 8000;

interface Props {
  // Fixed user data id (NotesTab). Ignored when allowUserDataIdInput is true.
  userDataId?: number;
  allowUserDataIdInput?: boolean;
  // Pre-fills the user data id input when allowUserDataIdInput is true (e.g. deep link from a user).
  initialUserDataId?: string;
  // Pre-fills the subject on mount (e.g. the ticket a note belongs to). Like the other initial*
  // props it is read once; a caller that needs a fresh seed remounts the composer.
  initialSubject?: string;
  // Controlled content: when both are given the caller owns the text (and keeps it across remounts);
  // otherwise the composer keeps it itself. Cleared after a successful save either way.
  content?: string;
  onContentChange?: (content: string) => void;
  submitLabel?: string;
  contentPlaceholder?: string;
  onCreated: () => void;
  // Notifies the parent when a submit is in flight (true at start, false in finally).
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

export function NoteComposer({
  userDataId,
  allowUserDataIdInput,
  initialUserDataId,
  initialSubject,
  content: controlledContent,
  onContentChange,
  submitLabel,
  contentPlaceholder,
  onCreated,
  onSubmittingChange,
}: Readonly<Props>): JSX.Element {
  const { session } = useAuthContext();
  const role = session?.role;
  const isAdmin = role === UserRole.ADMIN;
  const adminOptions = adminDeptOptions(role);

  const { createSupportNote } = useCompliance();

  const [subject, setSubject] = useState(initialSubject ?? '');
  const [ownContent, setOwnContent] = useState('');
  const content = controlledContent ?? ownContent;
  const setContent = (value: string): void => {
    if (onContentChange) onContentChange(value);
    else setOwnContent(value);
  };
  const isTooLong = content.length > MAX_CONTENT_LENGTH;
  const [department, setDepartment] = useState<Department | ''>('');
  const [userDataIdInput, setUserDataIdInput] = useState(initialUserDataId ?? '');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function resolveUserDataId(): { value?: number; error?: string } {
    if (!allowUserDataIdInput) return { value: userDataId };
    const trimmed = userDataIdInput.trim();
    if (!trimmed) return { value: undefined };
    const n = Number(trimmed);
    if (Number.isNaN(n) || n < 1) return { error: 'Invalid user data id' };
    return { value: n };
  }

  // Content, its length and (for admins) the department are enforced by the disabled submit button.
  async function handleSubmit(): Promise<void> {
    const resolved = resolveUserDataId();
    if (resolved.error) {
      setError(resolved.error);
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    onSubmittingChange?.(true);
    try {
      await createSupportNote(content.trim(), {
        userDataId: resolved.value,
        subject: subject.trim() || undefined,
        department: department || undefined,
      });
      if (!mountedRef.current) return;
      setSubject('');
      setContent('');
      setDepartment('');
      setUserDataIdInput('');
      onCreated();
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'Failed to save note');
    } finally {
      if (!mountedRef.current) return;
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {isAdmin && (
        <select
          className="px-2 py-1 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 self-start"
          value={department}
          onChange={(e) => setDepartment(e.target.value as Department | '')}
          disabled={isSubmitting}
        >
          <option value="">— Department —</option>
          {adminOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}
      {allowUserDataIdInput && (
        <input
          type="text"
          className="w-full px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
          value={userDataIdInput}
          onChange={(e) => setUserDataIdInput(e.target.value)}
          placeholder="User Data ID (optional)"
          inputMode="numeric"
          disabled={isSubmitting}
        />
      )}
      <input
        type="text"
        className="w-full px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Betreff (optional)"
        maxLength={256}
        disabled={isSubmitting}
      />
      <textarea
        className="w-full px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-h-[80px]"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={contentPlaceholder ?? 'Neue Notiz...'}
        maxLength={MAX_CONTENT_LENGTH}
        disabled={isSubmitting}
      />
      {isTooLong && (
        <p className="text-sm text-dfxRed-100">
          Notiz zu lang: {content.length} / {MAX_CONTENT_LENGTH} Zeichen
        </p>
      )}
      {error && <p className="text-sm text-dfxRed-100">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-1.5 text-sm font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim() || isTooLong || (isAdmin && !department)}
        >
          {isSubmitting ? 'Speichern...' : (submitLabel ?? 'Notiz hinzufügen')}
        </button>
      </div>
    </div>
  );
}
