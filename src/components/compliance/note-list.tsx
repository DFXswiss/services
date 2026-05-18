import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import { SupportNoteInfo, useCompliance } from 'src/hooks/compliance.hook';
import { formatDateTime } from 'src/util/compliance-helpers';
import { deptBadge } from './note-utils';

interface Props {
  notes: SupportNoteInfo[];
  showUserDataIdLink?: boolean;
  emptyMessage?: string;
  onChange: () => void;
}

export function NoteList({ notes, showUserDataIdLink, emptyMessage, onChange }: Readonly<Props>): JSX.Element {
  const navigate = useNavigate();
  const { updateSupportNote, deleteSupportNote } = useCompliance();

  const [editingId, setEditingId] = useState<number>();
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string>();

  const [deleteId, setDeleteId] = useState<number>();
  const [isDeleting, setIsDeleting] = useState(false);

  function startEdit(note: SupportNoteInfo): void {
    setEditingId(note.id);
    setEditSubject(note.subject ?? '');
    setEditContent(note.content);
  }

  async function handleUpdate(id: number): Promise<void> {
    if (!editContent.trim()) return;
    try {
      await updateSupportNote(id, editContent.trim(), { subject: editSubject.trim() || undefined });
      setEditingId(undefined);
      onChange();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update note');
    }
  }

  async function confirmDelete(): Promise<void> {
    if (deleteId == null) return;
    setIsDeleting(true);
    try {
      await deleteSupportNote(deleteId);
      setDeleteId(undefined);
      onChange();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  }

  if (notes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 text-center text-dfxGray-700 text-sm">
        {emptyMessage ?? 'Keine Notizen vorhanden.'}
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-dfxRed-100">{error}</p>}
      {notes.map((note) => {
        const canModify = note.isOwn || note.isAdmin;
        const isEditing = editingId === note.id;
        return (
          <div key={note.id} className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-dfxGray-700 flex-wrap">
                {deptBadge(note.department)}
                <span>{note.authorMail}</span>
                <span>·</span>
                <span>{formatDateTime(note.created)}</span>
                {note.updated && note.updated !== note.created && (
                  <>
                    <span>·</span>
                    <span title={`Updated: ${formatDateTime(note.updated)}`}>(bearbeitet)</span>
                  </>
                )}
                {showUserDataIdLink && note.userDataId != null && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      className="text-dfxBlue-300 underline hover:text-dfxBlue-800"
                      onClick={() => navigate(`/support/user/${note.userDataId}`)}
                    >
                      UserData #{note.userDataId}
                    </button>
                    {note.userName && <span>({note.userName})</span>}
                  </>
                )}
              </div>
              {canModify && !isEditing && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs text-dfxBlue-800 hover:bg-dfxGray-300 rounded transition-colors"
                    onClick={() => startEdit(note)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs text-dfxBlue-800 hover:bg-dfxRed-100/20 rounded transition-colors"
                    onClick={() => setDeleteId(note.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
            {isEditing ? (
              <>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Betreff (optional)"
                  maxLength={256}
                />
                <textarea
                  className="w-full px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-h-[80px]"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    className="px-3 py-1 text-xs text-dfxBlue-800 bg-dfxGray-300 rounded hover:bg-dfxGray-400 transition-colors"
                    onClick={() => setEditingId(undefined)}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
                    onClick={() => handleUpdate(note.id)}
                    disabled={!editContent.trim()}
                  >
                    Speichern
                  </button>
                </div>
              </>
            ) : (
              <>
                {note.subject && <p className="text-sm font-semibold text-dfxBlue-800 text-left">{note.subject}</p>}
                <p className="text-sm text-dfxBlue-800 whitespace-pre-wrap text-left">{note.content}</p>
              </>
            )}
          </div>
        );
      })}
      <ConfirmDialog
        isOpen={deleteId != null}
        title="Notiz löschen"
        message="Möchtest du diese Notiz wirklich löschen?"
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        destructive
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(undefined)}
      />
    </>
  );
}
