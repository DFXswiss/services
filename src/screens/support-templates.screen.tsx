import { useCallback, useEffect, useState } from 'react';
import { TemplateComposer } from 'src/components/support-templates/template-composer';
import { TemplateList } from 'src/components/support-templates/template-list';
import { ErrorHint } from 'src/components/error-hint';
import { useSupportDashboardGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { SupportIssueTemplateInfo, useTemplateOnlyOwn, useTemplates } from 'src/hooks/support-templates.hook';

export default function TemplatesScreen(): JSX.Element {
  useSupportDashboardGuard();
  const { listTemplates } = useTemplates();

  const [templates, setTemplates] = useState<SupportIssueTemplateInfo[]>([]);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [onlyOwn, setOnlyOwn] = useTemplateOnlyOwn();

  const visibleTemplates = onlyOwn ? templates.filter((t) => t.isOwn) : templates;

  useLayoutOptions({ title: 'Vorlagen', backButton: true, noMaxWidth: true });

  const loadTemplates = useCallback(() => {
    setIsLoading(true);
    setError(undefined);
    listTemplates(submittedSearch || undefined)
      .then(setTemplates)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load templates'))
      .finally(() => setIsLoading(false));
  }, [listTemplates, submittedSearch]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function submitSearch(): void {
    setSubmittedSearch(search.trim());
  }

  function resetSearch(): void {
    setSearch('');
    setSubmittedSearch('');
  }

  function handleCreated(): void {
    setShowCompose(false);
    loadTemplates();
  }

  return (
    <div className="w-full flex flex-col gap-4 text-left">
      <div className="bg-white rounded-lg shadow-sm p-3">
        <button
          type="button"
          className="text-xs text-dfxBlue-800 hover:text-dfxBlue-400 transition-colors font-medium"
          onClick={() => setShowHelp((v) => !v)}
        >
          {showHelp ? '▼' : '▶'} Hilfe zur Platzhalter-Syntax
        </button>
        {showHelp && (
          <div className="mt-3 flex flex-col gap-3 text-sm text-dfxBlue-800">
            <div>
              <div className="font-semibold mb-1">Grundsyntax</div>
              <div className="text-xs text-dfxGray-800">
                <span className="font-mono">$tabelle.feld</span> – wird beim Einfügen mit dem Wert aus dem aktuellen
                Issue ersetzt.
              </div>
              <div className="text-xs text-dfxGray-700 mt-1">
                Beispiel: <span className="font-mono">$userData.firstname</span> →{' '}
                <span className="font-mono">Max</span>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">Listen-Quellen (Transaction)</div>
              <div className="text-xs text-dfxGray-800">
                Tokens mit gestricheltem Rand und{' '}
                <span className="font-mono bg-dfxBlue-300/10 border border-dashed border-dfxBlue-400 rounded px-1">
                  [ ]
                </span>
                -Marker öffnen beim Einfügen einen Auswahl-Dialog, wenn der Kunde mehrere Transaktionen hat.
              </div>
              <div className="text-xs text-dfxGray-700 mt-1">
                Beispiel: <span className="font-mono">$transaction.uid</span> → Auswahl-Dialog → konkrete UID
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">Selektoren (kein Dialog nötig)</div>
              <div className="text-xs text-dfxGray-800 mb-2">
                <span className="font-mono">$tabelle:selektor.feld</span> – fixiert direkt, welcher Eintrag verwendet
                wird.
              </div>
              <table className="text-xs text-dfxBlue-800 border-collapse">
                <thead>
                  <tr className="text-dfxGray-700">
                    <th className="text-left pr-3 py-0.5 font-medium">Selektor</th>
                    <th className="text-left pr-3 py-0.5 font-medium">Bedeutung</th>
                    <th className="text-left py-0.5 font-medium">Beispiel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-3 py-0.5 font-mono">:last</td>
                    <td className="pr-3 py-0.5">neueste Transaktion</td>
                    <td className="py-0.5 font-mono">$transaction:last.id</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-0.5 font-mono">:first</td>
                    <td className="pr-3 py-0.5">älteste Transaktion</td>
                    <td className="py-0.5 font-mono">$transaction:first.id</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-0.5 font-mono">:issue</td>
                    <td className="pr-3 py-0.5">die im aktuellen Issue verknüpfte Tx</td>
                    <td className="py-0.5 font-mono">$transaction:issue.uid</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="font-semibold mb-1">Sprach-Varianten</div>
              <div className="text-xs text-dfxGray-800">
                Jede Vorlage hat einen deutschen Inhalt (Pflicht) und optional einen englischen. Beim Einfügen im
                Support-Issue wird automatisch die Variante in der Sprache des Kunden gewählt; der Clerk kann die
                Sprache im Picker manuell umschalten. Fehlt die englische Variante, wird Deutsch als Fallback verwendet.
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">Fehlende Werte</div>
              <div className="text-xs text-dfxGray-800">
                Wenn ein Platzhalter im aktuellen Kontext keinen Wert hat (z. B.{' '}
                <span className="font-mono">$transaction:issue.id</span> bei einem Issue ohne verknüpfte Tx), bleibt der
                Token unverändert im Text. Der Send-Button blockt, bis er manuell ersetzt ist.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-dfxBlue-800 cursor-pointer select-none">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={onlyOwn}
              onChange={(e) => setOnlyOwn(e.target.checked)}
            />
            Nur eigene
          </label>
          <input
            type="text"
            className="px-3 py-1.5 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800 flex-1 min-w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            placeholder="Name oder Inhalt durchsuchen"
          />
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
            onClick={submitSearch}
          >
            Suchen
          </button>
          {submittedSearch && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium bg-dfxGray-300 text-dfxBlue-800 rounded hover:bg-dfxGray-400 transition-colors"
              onClick={resetSearch}
            >
              ✕
            </button>
          )}
          <button
            type="button"
            className="ml-auto px-3 py-1.5 text-sm font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
            onClick={() => setShowCompose((v) => !v)}
          >
            {showCompose ? '× Abbrechen' : '+ Neue Vorlage'}
          </button>
        </div>

        {showCompose && (
          <div className="border-t border-dfxGray-300 pt-2">
            <TemplateComposer onCreated={handleCreated} />
          </div>
        )}
      </div>

      {error && <ErrorHint message={error} />}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-4 text-center text-dfxGray-700 text-sm">Lade...</div>
      ) : (
        <TemplateList
          templates={visibleTemplates}
          emptyMessage={onlyOwn ? 'Du hast noch keine eigenen Vorlagen.' : 'Keine Vorlagen gefunden'}
          onChange={loadTemplates}
        />
      )}
    </div>
  );
}
