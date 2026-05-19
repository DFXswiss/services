import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../hooks/store.hook';

// Brand-aligned dark palette tokens for use in inline styles where Tailwind classes are not practical.
// Light tokens mirror the values previously hardcoded throughout dashboard components.
export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textMuted: string;
  border: string;
}

const LIGHT_TOKENS: ThemeTokens = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceMuted: '#f3f4f6',
  textPrimary: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
};

const DARK_TOKENS: ThemeTokens = {
  background: '#072440', // dfxBlue.800
  surface: '#082948', // dfxBlue.700
  surfaceMuted: '#0A355C', // dfxBlue.500
  textPrimary: '#ffffff',
  textMuted: '#9AA5B8', // dfxGray.700
  border: '#0A355C', // dfxBlue.500
};

interface ThemeContextInterface {
  isDark: boolean;
  setDark: (value: boolean) => void;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextInterface>(undefined as any);

export function useThemeContext(): ThemeContextInterface {
  return useContext(ThemeContext);
}

// Reads dark-mode preference from URL (?dark=1, ?dark=0, ?theme=dark, ?theme=light) and persists it.
// Once consumed, the URL param is removed so the rest of the app sees a clean URL.
function readUrlOverride(): boolean | undefined {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  const dark = params.get('dark');
  const theme = params.get('theme');

  let value: boolean | undefined;
  if (dark != null) value = dark === '1' || dark.toLowerCase() === 'true';
  else if (theme != null) value = theme.toLowerCase() === 'dark';

  if (value === undefined) return undefined;

  params.delete('dark');
  params.delete('theme');
  const newSearch = params.toString();
  const newUrl =
    window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
  window.history.replaceState(undefined, '', newUrl);

  return value;
}

export function ThemeContextProvider({ children }: PropsWithChildren): JSX.Element {
  const { darkMode: storedDarkMode } = useStore();

  const [isDark, setIsDark] = useState<boolean>(() => {
    const fromUrl = readUrlOverride();
    if (fromUrl !== undefined) {
      storedDarkMode.set(fromUrl);
      return fromUrl;
    }
    return storedDarkMode.get() ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [isDark]);

  const context = useMemo<ThemeContextInterface>(
    () => ({
      isDark,
      setDark: (value: boolean) => {
        storedDarkMode.set(value);
        setIsDark(value);
      },
      tokens: isDark ? DARK_TOKENS : LIGHT_TOKENS,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>;
}
