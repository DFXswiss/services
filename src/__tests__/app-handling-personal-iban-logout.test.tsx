const mockUseAuthContext = jest.fn();
const mockAppHandling = jest.fn();
const mockReceiveFor = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  PersonalIbanProvider: { FRICK: 'Frick' },
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => mockAppHandling(),
}));

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX,
  usePersonalIbanConfirmation,
} from '../hooks/personal-iban.hook';

function ConfirmationQuoteProbe(): JSX.Element {
  const confirmation = usePersonalIbanConfirmation();
  const previousQuote = useRef<string>();
  const customer = mockUseAuthContext().session?.account as number | undefined;

  useEffect(() => {
    if (
      customer === undefined ||
      confirmation.requestedPersonalIban === undefined ||
      confirmation.requiresCustomerConfirmation
    ) {
      return;
    }

    const signature = `${customer}:${confirmation.personalIban ?? 'ordinary'}`;
    if (signature === previousQuote.current) return;
    previousQuote.current = signature;
    mockReceiveFor({
      customer,
      ...(confirmation.personalIban
        ? { personalIbanProvider: confirmation.personalIban }
        : {}),
    });
  }, [
    confirmation.personalIban,
    confirmation.requestedPersonalIban,
    confirmation.requiresCustomerConfirmation,
    customer,
  ]);

  return (
    <>
      <div data-testid="requested">{confirmation.requestedPersonalIban ?? 'absent'}</div>
      <div data-testid="quote-selector">{confirmation.personalIban ?? 'absent'}</div>
      <div data-testid="decision">
        {confirmation.requiresCustomerConfirmation ? 'required' : 'not-required'}
      </div>
      <div data-testid="storage-warning">
        {confirmation.hasStorageWarning ? 'warning' : 'none'}
      </div>
      <button type="button" onClick={confirmation.confirmForCurrentCustomer}>
        confirm
      </button>
      <button type="button" onClick={confirmation.declineForCurrentCustomer}>
        decline
      </button>
    </>
  );
}

let renderedSession: { account: number } | undefined;

function token(account: number, expiresAt: number): string {
  const encode = (value: object) =>
    window
      .btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode({
    account,
    exp: expiresAt,
  })}.signature`;
}

function storedUnexpiredSession(): { account: number } | undefined {
  const stored = localStorage.getItem('dfx.authenticationToken');
  if (!stored) return undefined;
  try {
    const payload = JSON.parse(window.atob(stored.split('.')[1])) as {
      account?: unknown;
      exp?: unknown;
    };
    return typeof payload.account === 'number' &&
      typeof payload.exp === 'number' &&
      payload.exp > Date.now() / 1000
      ? { account: payload.account }
      : undefined;
  } catch {
    return undefined;
  }
}

function AuthenticationLifecycleProbe(): JSX.Element {
  const [session, setSession] = useState(storedUnexpiredSession);
  const location = useLocation();
  const navigate = useNavigate();
  renderedSession = session;

  useEffect(() => {
    if (!session && location.pathname.startsWith('/buy')) {
      navigate(`/login${location.search}`);
    }
  }, [location.pathname, location.search, navigate, session]);

  function login(account: number) {
    localStorage.setItem(
      'dfx.authenticationToken',
      token(account, Math.floor(Date.now() / 1000) + 3600),
    );
    setSession({ account });
    navigate(`/buy${location.search}`);
  }

  function logout() {
    localStorage.removeItem('dfx.authenticationToken');
    setSession(undefined);
  }

  return (
    <>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <button type="button" onClick={() => login(42)}>
        login customer 42
      </button>
      <button type="button" onClick={() => login(52)}>
        login customer 52
      </button>
      <button type="button" onClick={logout}>
        log out
      </button>
      <ConfirmationQuoteProbe />
    </>
  );
}

function createFlow(initialEntries = ['/buy?personal-iban=frick']) {
  const router = createMemoryRouter(
    [{ path: '*', element: <ConfirmationQuoteProbe /> }],
    { initialEntries },
  );
  const element = <RouterProvider router={router} />;
  return { router, element, rendered: render(element) };
}

function createAuthenticationFlow(
  initialEntries = ['/buy?personal-iban=frick'],
) {
  const router = createMemoryRouter(
    [{ path: '*', element: <AuthenticationLifecycleProbe /> }],
    { initialEntries },
  );
  const element = <RouterProvider router={router} />;
  return { router, element, rendered: render(element) };
}

function customerStorageKey(customer: number): string {
  return `${PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX}${customer}`;
}

describe('personal-IBAN tab confirmation workflows', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
    renderedSession = undefined;
    mockAppHandling.mockReturnValue({ isWidget: false });
    mockUseAuthContext.mockReturnValue({ session: undefined });
  });

  it('expires the stored token, redirects through login with the selector, then quotes with the provider after login and confirmation', async () => {
    localStorage.setItem(
      'dfx.authenticationToken',
      token(41, Math.floor(Date.now() / 1000) - 60),
    );
    mockUseAuthContext.mockImplementation(() => ({
      session: renderedSession,
    }));
    createAuthenticationFlow();

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/login?personal-iban=frick',
      ),
    );
    expect(mockReceiveFor).not.toHaveBeenCalled();

    await act(async () =>
      screen.getByRole('button', { name: 'login customer 42' }).click(),
    );
    expect(screen.getByTestId('requested')).toHaveTextContent('Frick');
    expect(screen.getByTestId('decision')).toHaveTextContent('required');
    expect(mockReceiveFor).not.toHaveBeenCalled();

    await act(async () => screen.getByRole('button', { name: 'confirm' }).click());
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith({
        customer: 42,
        personalIbanProvider: 'Frick',
      }),
    );
  });

  it('logs out, navigates Back, reloads, then asks a different customer before sending a provider', async () => {
    localStorage.setItem(
      'dfx.authenticationToken',
      token(51, Math.floor(Date.now() / 1000) + 3600),
    );
    mockUseAuthContext.mockImplementation(() => ({
      session: renderedSession,
    }));
    const { router, element } = createAuthenticationFlow();
    await act(async () => screen.getByRole('button', { name: 'confirm' }).click());
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 51, personalIbanProvider: 'Frick' }),
      ),
    );

    await act(async () => router.navigate('/account'));
    await act(async () => screen.getByRole('button', { name: 'log out' }).click());
    await act(async () => router.navigate(-1));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/login?personal-iban=frick',
      ),
    );

    cleanup();
    mockReceiveFor.mockClear();
    render(element);

    await act(async () =>
      screen.getByRole('button', { name: 'login customer 52' }).click(),
    );
    expect(screen.getByTestId('requested')).toHaveTextContent('Frick');
    expect(screen.getByTestId('decision')).toHaveTextContent('required');
    expect(mockReceiveFor).not.toHaveBeenCalled();
  });

  it('confirm drives a request carrying the provider and does not duplicate it after rerender', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 61 } });
    const { element, rendered } = createFlow();

    await act(async () => screen.getByRole('button', { name: 'confirm' }).click());
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith({
        customer: 61,
        personalIbanProvider: 'Frick',
      }),
    );

    rendered.rerender(element);
    expect(mockReceiveFor).toHaveBeenCalledTimes(1);
  });

  it('decline drives a selector-free request and a new selector navigation asks again', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 71 } });
    const { router } = createFlow();

    await act(async () => screen.getByRole('button', { name: 'decline' }).click());
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith({ customer: 71 }),
    );
    expect(mockReceiveFor.mock.calls[0][0]).not.toHaveProperty(
      'personalIbanProvider',
    );

    await act(async () => router.navigate('/buy?personal-iban=frick'));
    expect(screen.getByTestId('decision')).toHaveTextContent('required');
  });

  it('reload after declining keeps the current occurrence selector-free without asking again', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 72 } });
    const { element } = createFlow();

    await act(async () => screen.getByRole('button', { name: 'decline' }).click());
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith({ customer: 72 }),
    );
    cleanup();
    mockReceiveFor.mockClear();

    render(element);

    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith({ customer: 72 }),
    );
  });

  it('reload after confirming reads the tab answer and does not ask again', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 81 } });
    const { element } = createFlow();
    await act(async () => screen.getByRole('button', { name: 'confirm' }).click());
    cleanup();
    mockReceiveFor.mockClear();

    render(element);

    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
    await waitFor(() =>
      expect(mockReceiveFor).toHaveBeenCalledWith({
        customer: 81,
        personalIbanProvider: 'Frick',
      }),
    );
  });

  it('a separate tab storage starts empty and asks again', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 91 } });
    const { element } = createFlow();
    await act(async () => screen.getByRole('button', { name: 'confirm' }).click());
    const firstTabAnswer = sessionStorage.getItem(customerStorageKey(91));
    expect(firstTabAnswer).toBe('{"answer":"confirmed"}');
    cleanup();

    // JSDOM has one Window, so clearing its sessionStorage models the separate
    // per-tab storage namespace while exercising the real storage read in the hook.
    sessionStorage.clear();
    render(element);

    expect(screen.getByTestId('decision')).toHaveTextContent('required');
  });

  it('malformed or incompatible storage asks again instead of treating it as an answer', () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 101 } });
    sessionStorage.setItem(
      customerStorageKey(101),
      JSON.stringify({ answer: 'confirmed', unexpected: true }),
    );

    createFlow();

    expect(screen.getByTestId('decision')).toHaveTextContent('required');
    expect(screen.getByTestId('storage-warning')).toHaveTextContent('warning');
    expect(mockReceiveFor).not.toHaveBeenCalled();
  });

  it('when sessionStorage throws, asks and warns rather than sending a quote', () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 111 } });
    const getItem = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });

    createFlow();

    expect(screen.getByTestId('decision')).toHaveTextContent('required');
    expect(screen.getByTestId('storage-warning')).toHaveTextContent('warning');
    expect(mockReceiveFor).not.toHaveBeenCalled();
    getItem.mockRestore();
  });

  it('without a selector does not access storage or delay the ordinary quote path', () => {
    mockUseAuthContext.mockReturnValue({ session: undefined });
    const getItem = jest.spyOn(Storage.prototype, 'getItem');
    const setItem = jest.spyOn(Storage.prototype, 'setItem');

    createFlow(['/buy']);

    expect(screen.getByTestId('requested')).toHaveTextContent('absent');
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
    expect(
      getItem.mock.calls.some(([key]) =>
        String(key).startsWith(PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX),
      ),
    ).toBe(false);
    expect(
      setItem.mock.calls.some(([key]) =>
        String(key).startsWith(PERSONAL_IBAN_CONFIRMATION_STORAGE_KEY_PREFIX),
      ),
    ).toBe(false);
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('same-value Web Component property occurrence asks again after a decline', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 121 } });
    mockAppHandling.mockReturnValue({
      isWidget: true,
      widgetPersonalIban: 'frick',
      widgetPersonalIbanOccurrence: 1,
    });
    const { element, rendered } = createFlow(['/buy']);

    await act(async () => screen.getByRole('button', { name: 'decline' }).click());
    await waitFor(() =>
      expect(screen.getByTestId('decision')).toHaveTextContent('not-required'),
    );

    mockAppHandling.mockReturnValue({
      isWidget: true,
      widgetPersonalIban: 'frick',
      widgetPersonalIbanOccurrence: 2,
    });
    rendered.rerender(element);

    expect(screen.getByTestId('decision')).toHaveTextContent('required');
  });
});
