import { useRef, useState } from 'react';
import { TemplateContents, useTemplates } from 'src/hooks/templates.hook';
import { BilingualContentEditor, BilingualContentEditorHandle } from './bilingual-content-editor';
import { TokenPickerPanel } from './token-picker-panel';

interface Props {
  onCreated: () => void;
}

const EMPTY_CONTENTS: TemplateContents = { de: '', en: undefined };

export function TemplateComposer({ onCreated }: Readonly<Props>): JSX.Element {
  const { createTemplate } = useTemplates();
  const editorRef = useRef<BilingualContentEditorHandle>(null);

  const [name, setName] = useState('');
  const [contents, setContents] = useState<TemplateContents>(EMPTY_CONTENTS);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  function insertToken(key: string): void {
    editorRef.current?.insertAtActive(`$${key}`);
  }

  async function handleSubmit(): Promise<void> {
    if (!name.trim() || !contents.de.trim()) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await createTemplate(name.trim(), {
        de: contents.de.trim(),
        en: contents.en?.trim() || undefined,
      });
      setName('');
      setContents(EMPTY_CONTENTS);
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        className="w-full px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name der Vorlage"
        maxLength={256}
        disabled={isSubmitting}
      />
      <BilingualContentEditor
        ref={editorRef}
        contents={contents}
        onChange={setContents}
        disabled={isSubmitting}
        placeholderDe="Inhalt auf Deutsch – Platzhalter wie $userData.firstname einfügen"
        placeholderEn="Optional: Inhalt auf Englisch"
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="px-2 py-1 text-xs text-dfxBlue-800 bg-dfxGray-300 rounded hover:bg-dfxGray-400 transition-colors"
          onClick={() => setShowTokens((v) => !v)}
        >
          {showTokens ? '× Schließen' : '+ Platzhalter einfügen'}
        </button>
        <span className="text-xs text-dfxGray-700">Syntax: $tabelle.feld</span>
      </div>
      {showTokens && <TokenPickerPanel onInsert={insertToken} />}
      {error && <p className="text-sm text-dfxRed-100">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-1.5 text-sm font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim() || !contents.de.trim()}
        >
          {isSubmitting ? 'Speichern...' : 'Vorlage speichern'}
        </button>
      </div>
    </div>
  );
}
