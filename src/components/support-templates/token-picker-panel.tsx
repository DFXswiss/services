import { COMPOSER_SECTIONS, TokenSource } from 'src/util/template-placeholders';

interface Props {
  onInsert: (key: string) => void;
}

const SOURCE_LABELS: Record<TokenSource, string> = {
  userData: 'User Data',
  transaction: 'Transaction',
  issue: 'Issue',
};

export function TokenPickerPanel({ onInsert }: Readonly<Props>): JSX.Element {
  return (
    <div className="border border-dfxGray-400 rounded bg-white p-2 text-xs max-h-60 overflow-auto">
      {(Object.keys(COMPOSER_SECTIONS) as TokenSource[]).map((source) => (
        <div key={source} className="mb-3 last:mb-0">
          <div className="text-dfxGray-700 font-semibold mb-1">{SOURCE_LABELS[source]}</div>
          {COMPOSER_SECTIONS[source].map((group, idx) => (
            <div key={group.label ?? `__nolabel-${idx}`} className="mb-2 last:mb-0">
              {group.label && <div className="text-dfxGray-700 text-[11px] mb-1 pl-1">{group.label}</div>}
              <div className="flex flex-wrap gap-1">
                {group.tokens.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`px-2 py-0.5 rounded transition-colors font-mono ${
                      t.isArraySource
                        ? 'border border-dashed border-dfxBlue-400 bg-dfxBlue-300/10 text-dfxBlue-800 hover:bg-dfxBlue-300/30'
                        : 'border border-transparent bg-dfxBlue-300/20 text-dfxBlue-800 hover:bg-dfxBlue-300/40'
                    }`}
                    onClick={() => onInsert(t.key)}
                    title={t.isArraySource ? `${t.label} (Liste – Auswahl beim Einfügen)` : t.label}
                  >
                    ${t.key}
                    {t.isArraySource && <span className="ml-1 text-[10px]">[ ]</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
