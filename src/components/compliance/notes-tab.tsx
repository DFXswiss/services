import { SupportNoteInfo } from 'src/hooks/compliance.hook';
import { NoteComposer } from './note-composer';
import { NoteList } from './note-list';

interface Props {
  notes: SupportNoteInfo[];
  userDataId: number;
  onChange: () => void;
}

export function NotesTab({ notes, userDataId, onChange }: Readonly<Props>): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <NoteComposer userDataId={userDataId} onCreated={onChange} />
      </div>
      <NoteList notes={notes} onChange={onChange} />
    </div>
  );
}
