import { useRef, useState } from 'react';
import { ConfirmDialog } from 'src/components/confirm-dialog';
import {
  SupportIssueTemplateInfo,
  TemplateContents,
  TEMPLATE_LANGUAGES,
  TEMPLATE_LANGUAGE_LABELS,
  useTemplates,
} from 'src/hooks/templates.hook';
import { formatDateTime } from 'src/util/compliance-helpers';
import { BilingualContentEditor, BilingualContentEditorHandle } from './bilingual-content-editor';
import { TokenPickerPanel } from './token-picker-panel';

interface Props {
  templates: SupportIssueTemplateInfo[];
  emptyMessage?: string;
  onChange: () => void;
}

const EMPTY_CONTENTS: TemplateContents = { de: '', en: undefined };

export function TemplateList({ templates, emptyMessage, onChange }: Readonly<Props>): JSX.Element {
  const { updateTemplate, deleteTemplate } = useTemplates();
  const editorRef = useRef<BilingualContentEditorHandle>(null);

  const [editingId, setEditingId] = useState<number>();
  const [editName, setEditName] = useState('');
  const [editContents, setEditContents] = useState<TemplateContents>(EMPTY_CONTENTS);
  const [showTokens, setShowTokens] = useState(false);
  const [error, setError] = useState<string>();

  const [deleteId, setDeleteId] = useState<number>();
  const [isDeleting, setIsDeleting] = useState(false);

  function startEdit(template: SupportIssueTemplateInfo): void {
    setEditingId(template.id);
    setEditName(template.name);
    setEditContents({ de: template.contents.de, en: template.contents.en });
    setShowTokens(false);
  }

  function insertToken(key: string): void {
    editorRef.current?.insertAtActive(`$${key}`);
  }

  async function handleUpdate(id: number): Promise<void> {
    if (!editName.trim() || !editContents.de.trim()) return;
    try {
      await updateTemplate(id, {
        name: editName.trim(),
        contents: {
          de: editContents.de.trim(),
          en: editContents.en?.trim() ?? '',
        },
      });
      setEditingId(undefined);
      onChange();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update template');
    }
  }

  async function confirmDelete(): Promise<void> {
    if (deleteId == null) return;
    setIsDeleting(true);
    try {
      await deleteTemplate(deleteId);
      setDeleteId(undefined);
      onChange();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 text-center text-dfxGray-700 text-sm">
        {emptyMessage ?? 'Keine Vorlagen vorhanden.'}
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-dfxRed-100">{error}</p>}
      {templates.map((template) => {
        const canModify = template.isOwn || template.isAdmin;
        const isEditing = editingId === template.id;
        return (
          <div key={template.id} className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-dfxGray-700 flex-wrap">
                <span className="font-semibold text-dfxBlue-800">{template.name}</span>
                <span>·</span>
                <span>{template.authorMail}</span>
                <span>·</span>
                <span>
                  {formatDateTime(template.updated ?? template.created)}
                  {template.updated && template.updated !== template.created && ' (bearbeitet)'}
                </span>
              </div>
              {canModify && !isEditing && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs text-dfxBlue-800 hover:bg-dfxGray-300 rounded transition-colors"
                    onClick={() => startEdit(template)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs text-dfxBlue-800 hover:bg-dfxRed-100/20 rounded transition-colors"
                    onClick={() => setDeleteId(template.id)}
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name der Vorlage"
                  maxLength={256}
                />
                <BilingualContentEditor ref={editorRef} contents={editContents} onChange={setEditContents} />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs text-dfxBlue-800 bg-dfxGray-300 rounded hover:bg-dfxGray-400 transition-colors"
                    onClick={() => setShowTokens((v) => !v)}
                  >
                    {showTokens ? '× Schließen' : '+ Platzhalter einfügen'}
                  </button>
                  <div className="flex gap-2">
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
                      onClick={() => handleUpdate(template.id)}
                      disabled={!editName.trim() || !editContents.de.trim()}
                    >
                      Speichern
                    </button>
                  </div>
                </div>
                {showTokens && <TokenPickerPanel onInsert={insertToken} />}
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TEMPLATE_LANGUAGES.map((lang) => {
                  const value = template.contents[lang];
                  if (!value) return null;
                  return (
                    <div key={lang} className="flex flex-col gap-1">
                      <div className="text-xs font-semibold text-dfxGray-700">{TEMPLATE_LANGUAGE_LABELS[lang]}</div>
                      <p className="text-sm text-dfxBlue-800 whitespace-pre-wrap text-left">{value}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <ConfirmDialog
        isOpen={deleteId != null}
        title="Vorlage löschen"
        message={`Möchtest Du die Vorlage '${templates.find((t) => t.id === deleteId)?.name ?? ''}' wirklich löschen?`}
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
