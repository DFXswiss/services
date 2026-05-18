import { Department, useAuthContext, UserRole } from '@dfx.swiss/react';
import { useState } from 'react';
import { useCompliance } from 'src/hooks/compliance.hook';
import { adminDeptOptions } from './note-utils';

interface Props {
  // Fixed user data id (NotesTab). Ignored when allowUserDataIdInput is true.
  userDataId?: number;
  allowUserDataIdInput?: boolean;
  // Pre-fills the user data id input when allowUserDataIdInput is true (e.g. deep link from a user).
  initialUserDataId?: string;
  submitLabel?: string;
  contentPlaceholder?: string;
  onCreated: () => void;
}

export function NoteComposer({
  userDataId,
  allowUserDataIdInput,
  initialUserDataId,
  submitLabel,
  contentPlaceholder,
  onCreated,
}: Readonly<Props>): JSX.Element {
  const { session } = useAuthContext();
  const role = session?.role;
  const isAdmin = role === UserRole.ADMIN;
  const adminOptions = adminDeptOptions(role);

  const { createSupportNote } = useCompliance();

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [department, setDepartment] = useState<Department | ''>('');
  const [userDataIdInput, setUserDataIdInput] = useState(initialUserDataId ?? '');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resolveUserDataId(): { value?: number; error?: string } {
    if (!allowUserDataIdInput) return { value: userDataId };
    const trimmed = userDataIdInput.trim();
    if (!trimmed) return { value: undefined };
    const n = Number(trimmed);
    if (Number.isNaN(n) || n < 1) return { error: 'Invalid user data id' };
    return { value: n };
  }

  async function handleSubmit(): Promise<void> {
    if (!content.trim()) return;
    if (isAdmin && !department) {
      setError('Please select a department');
      return;
    }
    const resolved = resolveUserDataId();
    if (resolved.error) {
      setError(resolved.error);
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      await createSupportNote(content.trim(), {
        userDataId: resolved.value,
        subject: subject.trim() || undefined,
        department: department || undefined,
      });
      setSubject('');
      setContent('');
      setDepartment('');
      setUserDataIdInput('');
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save note');
    } finally {
      setIsSubmitting(false);
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
        disabled={isSubmitting}
      />
      {error && <p className="text-sm text-dfxRed-100">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-1.5 text-sm font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim() || (isAdmin && !department)}
        >
          {isSubmitting ? 'Speichern...' : (submitLabel ?? 'Notiz hinzufügen')}
        </button>
      </div>
    </div>
  );
}
