jest.mock('@dfx.swiss/react', () => ({}));

const mockAppHandling: { redirectPath?: string; setRedirectPath: jest.Mock } = {
  redirectPath: undefined,
  setRedirectPath: jest.fn(),
};

jest.mock('src/contexts/app-handling.context', () => ({
  useAppHandlingContext: () => mockAppHandling,
}));

import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useNavigation } from 'src/hooks/navigation.hook';

let navigation: ReturnType<typeof useNavigation>;

function Harness(): JSX.Element {
  const { pathname, search } = useLocation();
  navigation = useNavigation();
  return (
    <>
      <div data-testid="pathname">{pathname}</div>
      <div data-testid="search">{search}</div>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

describe('useNavigation', () => {
  beforeEach(() => {
    mockAppHandling.redirectPath = undefined;
    mockAppHandling.setRedirectPath.mockReset();
    sessionStorage.removeItem('dfx.kyc.redirect');
  });

  it('stores the kyc location when setRedirect leaves a query', () => {
    renderAt('/kyc?wallet=RealUnit&client=Aktionariat');
    act(() => {
      navigation.navigate('/login', { setRedirect: true });
    });
    expect(mockAppHandling.setRedirectPath).toHaveBeenCalledWith('/kyc?wallet=RealUnit&client=Aktionariat');
    expect(sessionStorage.getItem('dfx.kyc.redirect')).toBe('/kyc?wallet=RealUnit&client=Aktionariat');
  });

  it('stores only the buy pathname and does not write the redirect key', () => {
    renderAt('/buy?x=1');
    act(() => {
      navigation.navigate('/login', { setRedirect: true });
    });
    expect(mockAppHandling.setRedirectPath).toHaveBeenCalledWith('/buy');
    expect(sessionStorage.getItem('dfx.kyc.redirect')).toBeNull();
  });

  it('stores /kyc without a search and does not write the redirect key', () => {
    renderAt('/kyc');
    act(() => {
      navigation.navigate('/login', { setRedirect: true });
    });
    expect(mockAppHandling.setRedirectPath).toHaveBeenCalledWith('/kyc');
    expect(sessionStorage.getItem('dfx.kyc.redirect')).toBeNull();
  });

  it('goes back to the stored kyc query and clears it', () => {
    mockAppHandling.redirectPath = '/kyc?wallet=RealUnit';
    sessionStorage.setItem('dfx.kyc.redirect', '/kyc?wallet=RealUnit');
    renderAt('/login');
    act(() => {
      navigation.goBack();
    });
    expect(screen.getByTestId('pathname').textContent).toBe('/kyc');
    expect(screen.getByTestId('search').textContent).toBe('?wallet=RealUnit');
    expect(mockAppHandling.setRedirectPath).toHaveBeenCalledWith(undefined);
    expect(sessionStorage.getItem('dfx.kyc.redirect')).toBeNull();
  });

  it('goes back to a stored path without a query', () => {
    mockAppHandling.redirectPath = '/sell';
    renderAt('/login');
    act(() => {
      navigation.goBack();
    });
    expect(screen.getByTestId('pathname').textContent).toBe('/sell');
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('still sets the redirect path when sessionStorage.setItem throws', () => {
    const original = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => original.getItem(key),
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: (key: string) => original.removeItem(key),
        clear: () => original.clear(),
        key: (index: number) => original.key(index),
        get length() {
          return original.length;
        },
      },
    });
    try {
      renderAt('/kyc?wallet=RealUnit&client=Aktionariat');
      expect(() => {
        act(() => {
          navigation.navigate('/login', { setRedirect: true });
        });
      }).not.toThrow();
      expect(mockAppHandling.setRedirectPath).toHaveBeenCalledWith('/kyc?wallet=RealUnit&client=Aktionariat');
    } finally {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, value: original });
    }
  });

  it('still leaves the stored query when sessionStorage.removeItem throws', () => {
    mockAppHandling.redirectPath = '/kyc?wallet=RealUnit';
    sessionStorage.setItem('dfx.kyc.redirect', '/kyc?wallet=RealUnit');
    renderAt('/login');
    const original = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => original.getItem(key),
        setItem: (key: string, value: string) => original.setItem(key, value),
        removeItem: () => {
          throw new Error('blocked');
        },
        clear: () => original.clear(),
        key: (index: number) => original.key(index),
        get length() {
          return original.length;
        },
      },
    });
    try {
      expect(() => {
        act(() => {
          navigation.goBack();
        });
      }).not.toThrow();
      expect(screen.getByTestId('pathname').textContent).toBe('/kyc');
      expect(screen.getByTestId('search').textContent).toBe('?wallet=RealUnit');
    } finally {
      Object.defineProperty(window, 'sessionStorage', { configurable: true, value: original });
    }
  });
});
