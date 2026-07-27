// Customer-boundary regression coverage for standalone and embedded selectors. These tests
// exercise the quote-facing hook so they assert what the next customer actually sends.

const mockNavigate = jest.fn();
const mockUseSessionContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockReceiveQuote = jest.fn();

function sessionToken(account: number): string {
  const encode = (value: object) =>
    window
      .btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    account,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.signature`;
}

jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {},
  PersonalIbanProvider: { FRICK: 'Frick' },
  useAuthContext: () => mockUseAuthContext(),
  useSessionContext: () => mockUseSessionContext(),
}));

jest.mock('../contexts/balance.context', () => ({
  useBalanceContext: () => ({ readBalances: jest.fn(), getBalances: () => [], hasBalance: false }),
}));

import { act, render, screen, waitFor } from '@testing-library/react';
import { Router } from '@remix-run/router';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import {
  AppHandlingContextProvider,
  useAppHandlingContext,
} from '../contexts/app-handling.context';
import { usePersonalIban } from '../hooks/personal-iban.hook';

function fakeRouter(pathname: string): Router {
  return {
    state: { location: { pathname } },
    navigate: mockNavigate,
  } as unknown as Router;
}

function WidgetSelectorProbe(): JSX.Element {
  const { widgetPersonalIban } = useAppHandlingContext();
  return <div data-testid="widget-selector">{widgetPersonalIban === undefined ? 'absent' : widgetPersonalIban}</div>;
}

function CustomerQuoteProbe(): JSX.Element {
  const personalIban = usePersonalIban();
  const customer = mockUseAuthContext().session?.account as number | undefined;

  useEffect(() => {
    if (customer != null) {
      mockReceiveQuote({
        customer,
        ...(personalIban ? { personalIbanProvider: personalIban } : {}),
      });
    }
  }, [customer, personalIban]);

  return <div data-testid="quote-selector">{personalIban ?? 'absent'}</div>;
}

describe('personal-iban logout cleanup (B2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/');
    mockUseAuthContext.mockReturnValue({ session: undefined });
  });

  it('strips personal-iban from router and browser URL on logout', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick&asset-in=EUR');
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });

    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });

    // Still logged in — personal-iban must remain.
    expect(window.location.search).toContain('personal-iban=frick');

    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });

    await act(async () => {
      rerender!(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
    });

    expect(mockNavigate).toHaveBeenCalled();
    const navigatedTo = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][0] as string;
    expect(navigatedTo).not.toContain('personal-iban=');
    expect(window.location.search).not.toContain('personal-iban=');
  });

  it('does not strip personal-iban during initial unauthenticated setup', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick');
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });

    await act(async () => {
      render(
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <div>probe</div>
        </AppHandlingContextProvider>,
      );
    });

    expect(window.location.search).toContain('personal-iban=frick');
  });

  it('preserves an explicit arrival selector through expired-token login into the customer quote (B1)', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick');
    localStorage.setItem('dfx.authenticationToken', 'persisted-expired-token');
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });

    const router = createMemoryRouter(
      [{ path: '*', element: <CustomerQuoteProbe /> }],
      { initialEntries: ['/buy?personal-iban=frick'] },
    );
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider isWidget={false} router={router}>
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });

    expect(window.location.search).toContain('personal-iban=frick');

    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 41 } });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider isWidget={false} router={router}>
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });

    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 41,
        personalIbanProvider: 'Frick',
      }),
    );
  });

  it('keeps the incoming session and selector pending while valid persisted customer A is observed (B1)', async () => {
    const customerASession = sessionToken(51);
    const customerBSession = sessionToken(52);
    localStorage.setItem('dfx.authenticationToken', customerASession);
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 51 } });

    const router = createMemoryRouter(
      [{ path: '*', element: <CustomerQuoteProbe /> }],
      { initialEntries: ['/buy'] },
    );
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider
          isWidget
          params={{
            session: customerBSession,
            personalIban: 'frick',
          }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });

    // B's pending selector must not be consumed by or exposed to persisted customer A.
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');

    mockUseAuthContext.mockReturnValue({ session: { account: 52 } });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{
            session: customerBSession,
            personalIban: 'frick',
          }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });

    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 52,
        personalIbanProvider: 'Frick',
      }),
    );
    expect(mockReceiveQuote).not.toHaveBeenCalledWith({ customer: 52 });
  });

  it('keeps standalone suppression through Back and the next customer login (B2)', async () => {
    window.history.pushState({}, '', '/buy?personal-iban=frick');
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 61 } });

    const router = createMemoryRouter(
      [{ path: '*', element: <CustomerQuoteProbe /> }],
      {
        initialEntries: ['/login?personal-iban=frick', '/buy?personal-iban=frick'],
        initialIndex: 1,
      },
    );
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider isWidget={false} router={router}>
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });

    mockReceiveQuote.mockClear();
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: undefined });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider isWidget={false} router={router}>
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });

    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');

    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 62 } });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider isWidget={false} router={router}>
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });

    await waitFor(() => expect(mockReceiveQuote).toHaveBeenCalledWith({ customer: 62 }));
    expect(mockReceiveQuote).not.toHaveBeenCalledWith(
      expect.objectContaining({ personalIbanProvider: expect.anything() }),
    );

    mockReceiveQuote.mockClear();
    await act(async () => {
      await router.navigate('/buy');
    });
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');
    await act(async () => {
      await router.navigate('/buy?personal-iban=frick');
    });
    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 62,
        personalIbanProvider: 'Frick',
      }),
    );
  });

  it('suppresses immediately when the observed authenticated account changes', async () => {
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 71 } });

    const router = createMemoryRouter(
      [{ path: '*', element: <CustomerQuoteProbe /> }],
      { initialEntries: ['/buy'] },
    );
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick', personalIbanRevision: 1 }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });

    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 71,
        personalIbanProvider: 'Frick',
      }),
    );
    mockReceiveQuote.mockClear();
    mockUseAuthContext.mockReturnValue({ session: { account: 72 } });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick', personalIbanRevision: 1 }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });

    await waitFor(() => expect(mockReceiveQuote).toHaveBeenCalledWith({ customer: 72 }));
    expect(mockReceiveQuote).not.toHaveBeenCalledWith(
      expect.objectContaining({ personalIbanProvider: expect.anything() }),
    );
  });

  it('restores a Web Component selector after logout when its internal write revision changes', async () => {
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });

    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick', personalIbanRevision: 1 }}
          router={fakeRouter('/buy')}
        >
          <WidgetSelectorProbe />
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });
    expect(screen.getByTestId('widget-selector')).toHaveTextContent('frick');

    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick', personalIbanRevision: 1 }}
          router={fakeRouter('/buy')}
        >
          <WidgetSelectorProbe />
        </AppHandlingContextProvider>,
      );
    });
    expect(screen.getByTestId('widget-selector')).toHaveTextContent('absent');

    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick', personalIbanRevision: 2 }}
          router={fakeRouter('/buy')}
        >
          <WidgetSelectorProbe />
        </AppHandlingContextProvider>,
      );
    });
    expect(screen.getByTestId('widget-selector')).toHaveTextContent('frick');
  });

  it('treats changed React credentials plus the same selector as customer B intent after logout (A1)', async () => {
    const customerBSession = sessionToken(82);
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 81 } });

    const router = createMemoryRouter(
      [{ path: '*', element: <CustomerQuoteProbe /> }],
      { initialEntries: ['/buy'] },
    );
    let rerender: (ui: React.ReactElement) => void;
    await act(async () => {
      const result = render(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick' }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
      rerender = result.rerender;
    });
    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 81,
        personalIbanProvider: 'Frick',
      }),
    );

    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: false,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: undefined });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{ personalIban: 'frick' }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');

    // The React host changes credentials and supplies its unchanged selector in the same params.
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{ session: customerBSession, personalIban: 'frick' }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');

    mockReceiveQuote.mockClear();
    mockUseSessionContext.mockReturnValue({
      isInitialized: true,
      isLoggedIn: true,
      availableBlockchains: [],
    });
    mockUseAuthContext.mockReturnValue({ session: { account: 82 } });
    await act(async () => {
      rerender!(
        <AppHandlingContextProvider
          isWidget
          params={{ session: customerBSession, personalIban: 'frick' }}
          router={router}
        >
          <RouterProvider router={router} />
        </AppHandlingContextProvider>,
      );
    });

    await waitFor(() =>
      expect(mockReceiveQuote).toHaveBeenCalledWith({
        customer: 82,
        personalIbanProvider: 'Frick',
      }),
    );
    expect(mockReceiveQuote).not.toHaveBeenCalledWith({ customer: 82 });
  });
});
