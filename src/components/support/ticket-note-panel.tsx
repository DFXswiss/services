import { useState } from 'react';
import { NoteComposer } from 'src/components/compliance/note-composer';

export interface TicketNoteDraft {
  text: string;
}

// Lets a clerk file an internal note about the customer straight from a ticket. The note is a regular
// support note bound to the customer (notes area and the customer's Notes tab), never a message to
// the customer. Rendered inside the "Update Issue" row: a toggle button as its own column and the
// composer on a full-width line below while a draft exists. The draft is owned by the screen, so it
// survives the screen's reload spinner.
export function TicketNotePanel({
  userDataId,
  issueId,
  draft,
  onDraftChange,
}: Readonly<{
  userDataId: number;
  issueId: number;
  draft?: TicketNoteDraft;
  onDraftChange: (draft: TicketNoteDraft | undefined) => void;
}>): JSX.Element {
  const [isSaved, setIsSaved] = useState(false);
  const isOpen = draft != null;

  function handleCreated(): void {
    onDraftChange(undefined);
    setIsSaved(true);
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-dfxGray-700">Kundennotiz</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-1.5 border border-dfxBlue-400 text-dfxBlue-400 rounded text-xs hover:bg-dfxBlue-400 hover:text-white transition-colors"
            onClick={() => {
              setIsSaved(false);
              onDraftChange(isOpen ? undefined : { text: '' });
            }}
          >
            {isOpen ? 'Abbrechen' : 'Notiz hinzufügen'}
          </button>
          {isSaved && <span className="text-xs text-dfxGray-700">Gespeichert, in den Notizen des Kunden.</span>}
        </div>
      </div>
      {draft && (
        <div className="basis-full border-t border-dfxGray-300 pt-3">
          <p className="text-xs text-dfxGray-700 mb-2">
            Interne Notiz zu diesem Kunden. Wird bei den Notizen des Kunden abgelegt, nicht an den Kunden gesendet.
          </p>
          <NoteComposer
            userDataId={userDataId}
            initialSubject={`Support-Ticket ${issueId}`}
            content={draft.text}
            onContentChange={(text) => onDraftChange({ text })}
            contentPlaceholder="Was Compliance über diesen Kunden wissen sollte..."
            onCreated={handleCreated}
          />
        </div>
      )}
    </>
  );
}
