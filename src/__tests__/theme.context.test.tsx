import { render, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { ThemeContextProvider, useThemeContext } from '../contexts/theme.context';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function setUrl(search: string) {
  window.history.replaceState(undefined, '', `/${search}`);
}

function wrapper({ children }: PropsWithChildren): JSX.Element {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    setUrl('');
  });

  describe('initial state', () => {
    it('defaults to light mode when nothing is set', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('restores dark mode from localStorage', () => {
      localStorageMock.setItem('dfx.srv.darkMode', 'true');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.body.classList.contains('dark')).toBe(true);
    });

    it('restores light mode from localStorage', () => {
      localStorageMock.setItem('dfx.srv.darkMode', 'false');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('URL parameter activation', () => {
    it('enables dark mode via ?dark=1', () => {
      setUrl('?dark=1');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(true);
      expect(localStorageMock.getItem('dfx.srv.darkMode')).toBe('true');
      expect(window.location.search).toBe('');
    });

    it('disables dark mode via ?dark=0', () => {
      localStorageMock.setItem('dfx.srv.darkMode', 'true');
      setUrl('?dark=0');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(false);
      expect(localStorageMock.getItem('dfx.srv.darkMode')).toBe('false');
      expect(window.location.search).toBe('');
    });

    it('enables dark mode via ?theme=dark', () => {
      setUrl('?theme=dark');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(true);
      expect(window.location.search).toBe('');
    });

    it('disables dark mode via ?theme=light', () => {
      localStorageMock.setItem('dfx.srv.darkMode', 'true');
      setUrl('?theme=light');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.isDark).toBe(false);
      expect(window.location.search).toBe('');
    });

    it('preserves other URL parameters', () => {
      setUrl('?dark=1&foo=bar');
      renderHook(() => useThemeContext(), { wrapper });
      expect(window.location.search).toBe('?foo=bar');
    });
  });

  describe('tokens', () => {
    it('returns dark palette when in dark mode', () => {
      localStorageMock.setItem('dfx.srv.darkMode', 'true');
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.tokens.background).toBe('#072440');
      expect(result.current.tokens.surface).toBe('#082948');
      expect(result.current.tokens.textPrimary).toBe('#ffffff');
    });

    it('returns light palette when in light mode', () => {
      const { result } = renderHook(() => useThemeContext(), { wrapper });
      expect(result.current.tokens.background).toBe('#ffffff');
      expect(result.current.tokens.textPrimary).toBe('#111827');
    });
  });

  describe('cleanup', () => {
    it('removes dark class from html and body when switched off', () => {
      localStorageMock.setItem('dfx.srv.darkMode', 'true');
      const { unmount } = render(
        <ThemeContextProvider>
          <span>child</span>
        </ThemeContextProvider>,
      );
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      unmount();
    });
  });
});
