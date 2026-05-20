import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { TemplateContents, TemplateLanguage, TEMPLATE_LANGUAGES } from 'src/hooks/templates.hook';

export interface BilingualContentEditorHandle {
  insertAtActive: (text: string) => void;
}

interface Props {
  contents: TemplateContents;
  onChange: (contents: TemplateContents) => void;
  disabled?: boolean;
  placeholderDe?: string;
  placeholderEn?: string;
}

const LANG_LABELS: Record<TemplateLanguage, string> = {
  de: 'Deutsch',
  en: 'English',
};

export const BilingualContentEditor = forwardRef<BilingualContentEditorHandle, Props>(function BilingualContentEditor(
  { contents, onChange, disabled, placeholderDe, placeholderEn },
  ref,
) {
  const refs = useRef<Record<TemplateLanguage, HTMLTextAreaElement | null>>({ de: null, en: null });
  const [activeLang, setActiveLang] = useState<TemplateLanguage>('de');

  function autoResize(ta: HTMLTextAreaElement | null): void {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }

  // Re-fit on every contents change (typing, token insert, external setContents)
  useEffect(() => {
    TEMPLATE_LANGUAGES.forEach((lang) => autoResize(refs.current[lang]));
  }, [contents]);

  useImperativeHandle(
    ref,
    () => ({
      insertAtActive(text: string) {
        const ta = refs.current[activeLang];
        const currentValue = contents[activeLang] ?? '';
        if (!ta) {
          onChange({ ...contents, [activeLang]: currentValue + text });
          return;
        }
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = currentValue.slice(0, start) + text + currentValue.slice(end);
        onChange({ ...contents, [activeLang]: next });
        requestAnimationFrame(() => {
          ta.focus();
          const pos = start + text.length;
          ta.setSelectionRange(pos, pos);
        });
      },
    }),
    [activeLang, contents, onChange],
  );

  function updateLang(lang: TemplateLanguage, value: string): void {
    if (lang === 'de') onChange({ ...contents, de: value });
    else onChange({ ...contents, en: value || undefined });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {TEMPLATE_LANGUAGES.map((lang) => {
        const value = contents[lang] ?? '';
        const isActive = activeLang === lang;
        return (
          <div key={lang} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-semibold ${isActive ? 'text-dfxBlue-800' : 'text-dfxGray-700'}`}
                title={isActive ? 'Aktive Sprache (Platzhalter werden hier eingefügt)' : undefined}
              >
                {LANG_LABELS[lang]}
                {lang === 'en' && <span className="ml-1 text-dfxGray-700 font-normal">(optional)</span>}
              </span>
              {isActive && <span className="text-[10px] text-dfxBlue-800">● aktiv</span>}
            </div>
            <textarea
              ref={(el) => {
                refs.current[lang] = el;
                autoResize(el);
              }}
              className={`w-full px-3 py-2 text-sm border rounded bg-white text-dfxBlue-800 min-h-[200px] resize-none overflow-hidden ${
                isActive ? 'border-dfxBlue-400' : 'border-dfxGray-400'
              }`}
              value={value}
              onChange={(e) => updateLang(lang, e.target.value)}
              onFocus={() => setActiveLang(lang)}
              placeholder={lang === 'de' ? placeholderDe : placeholderEn}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
});
