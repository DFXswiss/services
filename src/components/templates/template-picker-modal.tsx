import { useEffect, useMemo, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { Modal } from 'src/components/modal';
import {
  SupportIssueTemplateInfo,
  TEMPLATE_LANGUAGES,
  TEMPLATE_LANGUAGE_LABELS,
  TemplateLanguage,
  useTemplates,
} from 'src/hooks/templates.hook';
import {
  getNonArrayMissingPlaceholders,
  requiresArraySelection,
  resolvePlaceholders,
  TokenContext,
} from 'src/util/template-placeholders';

interface Props {
  isOpen: boolean;
  context: TokenContext;
  onClose: () => void;
  onInsert: (text: string) => void;
}

const ARRAY_MARKER_VALUE = '[Auswahl beim Einfügen]';
// Matches selector-less transaction tokens only (those with :selector are resolved directly)
const ARRAY_TOKEN_REGEX = /\$transaction\.[a-zA-Z]+/g;

function detectCustomerLanguage(context: TokenContext): TemplateLanguage {
  // Prefer the language on the issue's account (always available with issueData),
  // fall back to the lazy-loaded full userData for completeness.
  const sym = (context.issue?.account?.language?.symbol ?? context.userData?.language?.symbol)?.toLowerCase();
  if (sym === 'en') return 'en';
  return 'de';
}

function pickContent(
  template: SupportIssueTemplateInfo,
  lang: TemplateLanguage,
): { text: string; usedFallback: boolean } {
  const direct = template.contents[lang];
  if (direct) return { text: direct, usedFallback: false };
  // Fallback to DE if requested variant is missing
  return { text: template.contents.de, usedFallback: lang !== 'de' };
}

export function TemplatePickerModal({ isOpen, context, onClose, onInsert }: Readonly<Props>): JSX.Element {
  const { listTemplates } = useTemplates();

  const [templates, setTemplates] = useState<SupportIssueTemplateInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const customerLang = detectCustomerLanguage(context);
  const [activeLang, setActiveLang] = useState<TemplateLanguage>(customerLang);

  useEffect(() => {
    if (isOpen) setActiveLang(customerLang);
  }, [isOpen, customerLang]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(undefined);
    listTemplates()
      .then((items) => {
        setTemplates(items);
        if (items.length > 0 && selectedId == null) setSelectedId(items[0].id);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load templates'))
      .finally(() => setIsLoading(false));
  }, [isOpen, listTemplates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.contents.de.toLowerCase().includes(q) ||
        (t.contents.en?.toLowerCase().includes(q) ?? false),
    );
  }, [templates, search]);

  const selected = templates.find((t) => t.id === selectedId);
  const picked = selected ? pickContent(selected, activeLang) : undefined;
  const effectiveContent = picked?.text ?? '';

  const needsArraySelection = selected ? requiresArraySelection(effectiveContent, context) : false;

  const preview = selected ? resolvePlaceholders(effectiveContent, context) : '';
  const previewWithMarker = needsArraySelection ? preview.replace(ARRAY_TOKEN_REGEX, ARRAY_MARKER_VALUE) : preview;

  const nonArrayMissing = selected ? getNonArrayMissingPlaceholders(effectiveContent, context) : [];

  function handleInsert(): void {
    if (!selected || !picked) return;
    onInsert(picked.text);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="dialog" maxWidthClass="max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg flex flex-col max-h-[85vh] w-full">
        <div className="flex items-center justify-between p-4 border-b border-dfxGray-300">
          <h2 className="text-dfxBlue-800 font-semibold">Vorlage auswählen</h2>
          <button
            type="button"
            className="text-dfxGray-700 hover:text-dfxBlue-800 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-3 border-b border-dfxGray-300 flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 flex-1 min-w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Vorlage suchen..."
            autoFocus
          />
          <div className="flex border border-dfxGray-400 rounded overflow-hidden">
            {TEMPLATE_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                className={`px-3 py-1 text-xs transition-colors ${
                  activeLang === lang ? 'bg-dfxBlue-800 text-white' : 'bg-white text-dfxBlue-800 hover:bg-dfxGray-300'
                }`}
                onClick={() => setActiveLang(lang)}
                title={lang === customerLang ? 'Sprache des Kunden' : undefined}
              >
                {TEMPLATE_LANGUAGE_LABELS[lang]}
                {lang === customerLang && <span className="ml-1">●</span>}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3">
            <ErrorHint message={error} />
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-1/4 min-w-[200px] max-w-[280px] border-r border-dfxGray-300 overflow-auto">
            {isLoading ? (
              <div className="p-4 text-sm text-dfxGray-700 text-center">Lade...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-dfxGray-700 text-center">Keine Vorlagen gefunden</div>
            ) : (
              <ul>
                {filtered.map((t) => {
                  const hasActive = !!t.contents[activeLang];
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm border-b border-dfxGray-300 transition-colors ${
                          selectedId === t.id
                            ? 'bg-dfxBlue-300/20 text-dfxBlue-800 font-semibold'
                            : 'text-dfxBlue-800 hover:bg-dfxGray-300'
                        }`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <div className="truncate flex items-center gap-1">
                          {t.name}
                          {!hasActive && (
                            <span className="text-[10px] text-dfxGray-700" title="Variante in dieser Sprache fehlt">
                              (kein {activeLang.toUpperCase()})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-dfxGray-700 truncate">
                          {t.contents[activeLang] ?? t.contents.de}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex-1 min-w-0 p-4 overflow-auto">
            {selected && picked ? (
              <>
                <div className="text-xs text-dfxGray-700 mb-2 flex items-center gap-2">
                  Vorschau ({TEMPLATE_LANGUAGE_LABELS[activeLang]}):
                  {picked.usedFallback && (
                    <span className="text-dfxRed-150">
                      ⚠ Variante in {TEMPLATE_LANGUAGE_LABELS[activeLang]} fehlt – Deutsch wird verwendet.
                    </span>
                  )}
                </div>
                <div className="text-sm text-dfxBlue-800 whitespace-pre-wrap bg-dfxGray-300/30 rounded p-3 min-h-[150px]">
                  {previewWithMarker}
                </div>
                {needsArraySelection && (
                  <div className="text-xs text-dfxGray-700 mt-2">
                    Diese Vorlage referenziert eine Transaktion – beim Einfügen wird ein Auswahl-Dialog geöffnet.
                  </div>
                )}
                {nonArrayMissing.length > 0 && (
                  <div className="text-xs text-dfxGray-800 mt-2 p-2 border border-dashed border-dfxGray-700 rounded bg-dfxGray-300/30">
                    <div className="font-semibold mb-1">Es fehlen Werte für:</div>
                    <div className="flex flex-wrap gap-1">
                      {nonArrayMissing.map((t) => (
                        <span
                          key={t.fullKey}
                          className="font-mono px-1 py-0.5 bg-white rounded border border-dfxGray-400"
                        >
                          ${t.fullKey}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1">
                      Diese Platzhalter bleiben im eingefügten Text und müssen manuell ersetzt werden.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-dfxGray-700">Bitte links eine Vorlage auswählen.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-3 border-t border-dfxGray-300">
          <button
            type="button"
            className="px-3 py-1.5 text-xs text-dfxBlue-800 bg-dfxGray-300 rounded hover:bg-dfxGray-400 transition-colors"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors disabled:opacity-50"
            onClick={handleInsert}
            disabled={!selected}
          >
            Einfügen
          </button>
        </div>
      </div>
    </Modal>
  );
}
