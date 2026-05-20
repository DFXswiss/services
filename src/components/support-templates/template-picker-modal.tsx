import { useEffect, useMemo, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { Modal } from 'src/components/modal';
import {
  SupportIssueTemplateInfo,
  TEMPLATE_LANGUAGES,
  TEMPLATE_LANGUAGE_LABELS,
  TemplateLanguage,
  useTemplateOnlyOwn,
  useTemplates,
} from 'src/hooks/support-templates.hook';
import {
  DetectedToken,
  detectPlaceholders,
  getNonArrayMissingPlaceholders,
  requiresArraySelection,
  resolvePlaceholders,
  TokenContext,
} from 'src/util/template-placeholders';
import { TemplateArrayPickerModal } from './template-array-picker-modal';

interface Props {
  isOpen: boolean;
  context: TokenContext;
  onClose: () => void;
  onInsert: (text: string) => void;
  /** Override für das Action-Button-Label. Wird im copyMode ignoriert. */
  actionLabel?: string;
  /** Aktiviert die State-Machine für den Copy-Workflow (Customer-Search). */
  copyMode?: boolean;
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

export function TemplatePickerModal({
  isOpen,
  context,
  onClose,
  onInsert,
  actionLabel,
  copyMode = false,
}: Readonly<Props>): JSX.Element {
  const { listTemplates } = useTemplates();

  const [templates, setTemplates] = useState<SupportIssueTemplateInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const customerLang = detectCustomerLanguage(context);
  const [activeLang, setActiveLang] = useState<TemplateLanguage>(customerLang);

  const [onlyOwn, setOnlyOwn] = useTemplateOnlyOwn();

  // --- copyMode state machine ---
  const [selections, setSelections] = useState<{ transactionId?: number }>({});
  const [editedText, setEditedText] = useState<string>();
  const [arrayPickerOpen, setArrayPickerOpen] = useState(false);

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

  // Reset transient copyMode state when template or language changes
  useEffect(() => {
    setSelections({});
    setEditedText(undefined);
    setArrayPickerOpen(false);
  }, [selectedId, activeLang]);

  // On close: reset transient state so a fresh open starts clean.
  // `onlyOwn` is intentionally kept across openings — it's a user preference.
  useEffect(() => {
    if (isOpen) return;
    setSelectedId(undefined);
    setSearch('');
    setSelections({});
    setEditedText(undefined);
    setArrayPickerOpen(false);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const scoped = onlyOwn ? templates.filter((t) => t.isOwn) : templates;
    if (!q) return scoped;
    return scoped.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.contents.de.toLowerCase().includes(q) ||
        (t.contents.en?.toLowerCase().includes(q) ?? false),
    );
  }, [templates, search, onlyOwn]);

  const selected = templates.find((t) => t.id === selectedId);
  const picked = selected ? pickContent(selected, activeLang) : undefined;
  const pickedText = picked?.text ?? '';

  // --- Insert-mode (default) computed values ---
  const needsArraySelection = picked ? requiresArraySelection(pickedText, context) : false;
  const insertPreview = picked ? resolvePlaceholders(pickedText, context) : '';
  const insertPreviewWithMarker = needsArraySelection
    ? insertPreview.replace(ARRAY_TOKEN_REGEX, ARRAY_MARKER_VALUE)
    : insertPreview;
  const nonArrayMissing = picked ? getNonArrayMissingPlaceholders(pickedText, context) : [];

  // --- copyMode computed values ---
  const baseResolved = useMemo(
    () => (picked ? resolvePlaceholders(picked.text, context, selections) : ''),
    [picked?.text, context, selections],
  );
  const currentText = editedText ?? baseResolved;
  const remainingTokens = useMemo(() => detectPlaceholders(currentText), [currentText]);
  const hasArrayTokens = remainingTokens.some((t) => t.source === 'transaction' && !t.selector);
  // Array-Pick nur anbieten, solange keine TX gewählt wurde — sonst nützt eine erneute Auswahl nichts.
  const canPickArray = hasArrayTokens && (context.transactions?.length ?? 0) > 1 && selections.transactionId == null;
  const inEditMode = editedText !== undefined || (remainingTokens.length > 0 && !canPickArray);

  function handleAction(): void {
    if (!picked) return;
    if (copyMode) {
      if (canPickArray && !inEditMode) {
        setArrayPickerOpen(true);
        return;
      }
      if (remainingTokens.length > 0) return; // safety — button is disabled
      onInsert(currentText);
      onClose();
      return;
    }
    onInsert(picked.text);
    onClose();
  }

  const copyButtonLabel = canPickArray && !inEditMode ? 'Ausfüllen' : 'Kopieren';
  const copyButtonDisabled = !(canPickArray && !inEditMode) && remainingTokens.length > 0;
  const insertButtonLabel = actionLabel ?? (needsArraySelection ? 'Ausfüllen' : 'Einfügen');
  const finalButtonLabel = copyMode ? copyButtonLabel : insertButtonLabel;
  const finalButtonDisabled = !selected || (copyMode && copyButtonDisabled);

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="dialog" maxWidthClass="max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg flex flex-col max-h-[85vh] w-full">
        <div className="flex items-center justify-between p-4 border-b border-dfxGray-300">
          <h2 className="text-dfxBlue-800 font-semibold flex items-center gap-2">
            <span>Vorlage auswählen</span>
            <label className="flex items-center gap-1 text-xs font-normal text-dfxBlue-800 cursor-pointer select-none">
              <span>(</span>
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={onlyOwn}
                onChange={(e) => setOnlyOwn(e.target.checked)}
              />
              <span>Nur eigene)</span>
            </label>
          </h2>
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
            <TemplateListSection
              isLoading={isLoading}
              templates={filtered}
              selectedId={selectedId}
              activeLang={activeLang}
              onSelect={setSelectedId}
            />
          </div>
          <div className="flex-1 min-w-0 p-4 overflow-auto">
            {picked ? (
              <PreviewSection
                picked={picked}
                activeLang={activeLang}
                copyMode={copyMode}
                inEditMode={inEditMode}
                editedText={editedText}
                onEditChange={setEditedText}
                currentText={currentText}
                previewWithMarker={insertPreviewWithMarker}
                remainingTokens={remainingTokens}
                needsArraySelection={needsArraySelection}
                nonArrayMissing={nonArrayMissing}
                canPickArray={canPickArray}
                hasTxSelection={selections.transactionId != null}
              />
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
            onClick={handleAction}
            disabled={finalButtonDisabled}
          >
            {finalButtonLabel}
          </button>
        </div>
      </div>

      {copyMode && (
        <TemplateArrayPickerModal
          isOpen={arrayPickerOpen}
          transactions={context.transactions ?? []}
          onSelect={(transactionId) => {
            setSelections({ transactionId });
            setArrayPickerOpen(false);
          }}
          onCancel={() => setArrayPickerOpen(false)}
        />
      )}
    </Modal>
  );
}

// ----- Sub-components -----

interface TemplateListSectionProps {
  isLoading: boolean;
  templates: SupportIssueTemplateInfo[];
  selectedId: number | undefined;
  activeLang: TemplateLanguage;
  onSelect: (id: number) => void;
}

function TemplateListSection({
  isLoading,
  templates,
  selectedId,
  activeLang,
  onSelect,
}: Readonly<TemplateListSectionProps>): JSX.Element {
  if (isLoading) {
    return <div className="p-4 text-sm text-dfxGray-700 text-center">Lade...</div>;
  }
  if (templates.length === 0) {
    return <div className="p-4 text-sm text-dfxGray-700 text-center">Keine Vorlagen gefunden</div>;
  }
  return (
    <ul>
      {templates.map((t) => {
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
              onClick={() => onSelect(t.id)}
            >
              <div className="truncate flex items-center gap-1">
                {t.name}
                {!hasActive && (
                  <span className="text-[10px] text-dfxGray-700" title="Variante in dieser Sprache fehlt">
                    (kein {activeLang.toUpperCase()})
                  </span>
                )}
              </div>
              <div className="text-xs text-dfxGray-700 truncate">{t.contents[activeLang] ?? t.contents.de}</div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface PreviewSectionProps {
  picked: { text: string; usedFallback: boolean };
  activeLang: TemplateLanguage;
  copyMode: boolean;
  inEditMode: boolean;
  editedText: string | undefined;
  onEditChange: (text: string) => void;
  currentText: string;
  previewWithMarker: string;
  remainingTokens: DetectedToken[];
  needsArraySelection: boolean;
  nonArrayMissing: DetectedToken[];
  canPickArray: boolean;
  hasTxSelection: boolean;
}

function PreviewSection(props: Readonly<PreviewSectionProps>): JSX.Element {
  const { picked, activeLang, copyMode } = props;
  return (
    <>
      <div className="text-xs text-dfxGray-700 mb-2 flex items-center gap-2">
        Vorschau ({TEMPLATE_LANGUAGE_LABELS[activeLang]}):
        {picked.usedFallback && (
          <span className="text-dfxRed-150">
            ⚠ Variante in {TEMPLATE_LANGUAGE_LABELS[activeLang]} fehlt – Deutsch wird verwendet.
          </span>
        )}
      </div>
      {copyMode ? <CopyModeContent {...props} /> : <InsertModeContent {...props} />}
    </>
  );
}

function CopyModeContent({
  inEditMode,
  editedText,
  onEditChange,
  currentText,
  remainingTokens,
  canPickArray,
  hasTxSelection,
}: Readonly<PreviewSectionProps>): JSX.Element {
  return (
    <>
      {inEditMode && remainingTokens.length > 0 && (
        <div className="text-xs text-dfxRed-150 mb-2 p-2 border border-dashed border-dfxRed-150 rounded bg-dfxRed-100/10">
          <div className="font-semibold mb-1">
            {hasTxSelection && editedText === undefined
              ? 'Die gewählte Transaktion enthält keinen Wert für folgende Platzhalter:'
              : `Noch ${remainingTokens.length} Platzhalter offen:`}
          </div>
          <div className="flex flex-wrap gap-1">
            {remainingTokens.map((t) => (
              <span key={t.fullKey} className="font-mono px-1 py-0.5 bg-white rounded border border-dfxRed-150">
                ${t.fullKey}
              </span>
            ))}
          </div>
          <div className="mt-1">Bitte unten manuell mit echten Werten ersetzen.</div>
        </div>
      )}
      {inEditMode ? (
        <textarea
          className="w-full text-sm text-dfxBlue-800 whitespace-pre-wrap bg-white border border-dfxGray-400 rounded p-3 min-h-[200px] resize-y"
          value={currentText}
          onChange={(e) => onEditChange(e.target.value)}
        />
      ) : (
        <div className="text-sm text-dfxBlue-800 whitespace-pre-wrap bg-dfxGray-300/30 rounded p-3 min-h-[150px]">
          {currentText}
        </div>
      )}
      {canPickArray && !inEditMode && (
        <div className="text-xs text-dfxGray-700 mt-2">
          Diese Vorlage referenziert eine Transaktion – beim Ausfüllen wird ein Auswahl-Dialog geöffnet.
        </div>
      )}
    </>
  );
}

function InsertModeContent({
  previewWithMarker,
  needsArraySelection,
  nonArrayMissing,
}: Readonly<PreviewSectionProps>): JSX.Element {
  return (
    <>
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
              <span key={t.fullKey} className="font-mono px-1 py-0.5 bg-white rounded border border-dfxGray-400">
                ${t.fullKey}
              </span>
            ))}
          </div>
          <div className="mt-1">Diese Platzhalter bleiben im eingefügten Text und müssen manuell ersetzt werden.</div>
        </div>
      )}
    </>
  );
}
