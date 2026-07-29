// Wiring test: usePersonalIbanSelection (the real hook, unmocked) against a real
// AppHandlingContextProvider and a real react-router-dom location. This is the only remaining
// gate before Bank Frick issues a real, irreversible personal IBAN, so its derivation is pinned
// directly here rather than only through call sites that mock this hook wholesale. Harness
// pattern (real AppHandlingContextProvider + fakeRouter + minimal @dfx.swiss/react /
// balance.context mocks) reused from app-handling-personal-iban-url-survival.test.tsx. The
// synthetic-session encode/decode helpers are reused from the now-deleted
// app-handling-personal-iban-logout.test.tsx (its confirm/decline assertions no longer apply,
// but its session harness still does).

const mockUseAuthContext = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  Blockchain: {},
  PersonalIbanProvider: { FRICK: 'Frick' },
  useAuthContext: () => mockUseAuthContext(),
  useSessionContext: () => ({ isInitialized: true, isLoggedIn: false, availableBlockchains: [] }),
}));

jest.mock('../contexts/balance.context', () => ({
  useBalanceContext: () => ({ readBalances: jest.fn(), getBalances: () => [], hasBalance: false }),
}));

import { act, cleanup, render, screen } from '@testing-library/react';
import { Router } from '@remix-run/router';
import { MemoryRouter } from 'react-router-dom';
import { AppHandlingContextProvider } from '../contexts/app-handling.context';
import { usePersonalIbanSelection } from '../hooks/personal-iban.hook';

function fakeRouter(pathname: string): Router {
  return {
    state: { location: { pathname } },
    navigate: jest.fn(),
  } as unknown as Router;
}

function encodeSessionToken(payload: { account: number; exp: number }): string {
  const encode = (value: object) =>
    window
      .btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

function decodeSessionToken(token: string): { account: number } | undefined {
  const payload = JSON.parse(window.atob(token.split('.')[1])) as {
    account?: unknown;
    exp?: unknown;
  };
  return typeof payload.account === 'number' &&
    typeof payload.exp === 'number' &&
    payload.exp > Date.now() / 1000
    ? { account: payload.account }
    : undefined;
}

function SelectionProbe(): JSX.Element {
  const selection = usePersonalIbanSelection();
  return (
    <>
      <div data-testid="requested">{selection.requestedPersonalIban ?? 'absent'}</div>
      <div data-testid="personal-iban">{selection.personalIban ?? 'absent'}</div>
      <div data-testid="authenticated">{selection.hasAuthenticatedCustomer ? 'yes' : 'no'}</div>
    </>
  );
}

async function renderStandalone(path: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppHandlingContextProvider isWidget={false} router={fakeRouter('/buy')}>
          <SelectionProbe />
        </AppHandlingContextProvider>
      </MemoryRouter>,
    );
  });
}

async function renderWidget(path: string, widgetPersonalIban: string | undefined) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppHandlingContextProvider isWidget params={{ personalIban: widgetPersonalIban }} router={fakeRouter('/buy')}>
          <SelectionProbe />
        </AppHandlingContextProvider>
      </MemoryRouter>,
    );
  });
}

describe('usePersonalIbanSelection (real hook, real AppHandlingContextProvider, real router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    localStorage.clear();
    mockUseAuthContext.mockReturnValue({ session: undefined });
  });

  it('derives requestedPersonalIban from the URL query in standalone mode', async () => {
    await renderStandalone('/buy?personal-iban=frick');

    expect(screen.getByTestId('requested')).toHaveTextContent('Frick');
    expect(screen.getByTestId('personal-iban')).toHaveTextContent('Frick');
  });

  it('derives requestedPersonalIban from the widget property in widget mode, not the URL', async () => {
    await renderWidget('/buy?personal-iban=something-else', 'frick');

    expect(screen.getByTestId('requested')).toHaveTextContent('Frick');
    expect(screen.getByTestId('personal-iban')).toHaveTextContent('Frick');
  });

  it('does not turn an unrecognized selector into a Frick request', async () => {
    await renderStandalone('/buy?personal-iban=not-a-real-provider');

    expect(screen.getByTestId('requested')).toHaveTextContent('not-a-real-provider');
    expect(screen.getByTestId('personal-iban')).toHaveTextContent('absent');
  });

  it('hasAuthenticatedCustomer is true for a valid decoded session', async () => {
    const token = encodeSessionToken({ account: 42, exp: Math.floor(Date.now() / 1000) + 3600 });
    mockUseAuthContext.mockReturnValue({ session: decodeSessionToken(token), isLoggedIn: true });

    await renderStandalone('/buy');

    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
  });

  it('hasAuthenticatedCustomer is false without a session', async () => {
    mockUseAuthContext.mockReturnValue({ session: undefined });

    await renderStandalone('/buy');

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
  });

  it('hasAuthenticatedCustomer is false when the session is valid but the token is expired (isLoggedIn false)', async () => {
    const token = encodeSessionToken({ account: 42, exp: Math.floor(Date.now() / 1000) + 3600 });
    mockUseAuthContext.mockReturnValue({ session: decodeSessionToken(token), isLoggedIn: false });

    await renderStandalone('/buy');

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
  });

  it('hasAuthenticatedCustomer is false when the session has no account field', async () => {
    mockUseAuthContext.mockReturnValue({ session: {}, isLoggedIn: true });

    await renderStandalone('/buy');

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
  });

  it('hasAuthenticatedCustomer is false when session.account is not a number', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: '42' }, isLoggedIn: true });

    await renderStandalone('/buy');

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
  });
});
