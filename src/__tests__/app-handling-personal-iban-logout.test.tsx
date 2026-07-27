// Customer-facing regression coverage for durable selector identity binding.

const mockUseAuthContext = jest.fn();
const mockAppHandling = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  PersonalIbanProvider: { FRICK: 'Frick' },
  TransactionError: {
    PAYMENT_METHOD_NOT_ALLOWED: 'PaymentMethodNotAllowed',
    KYC_REQUIRED: 'KycRequired',
  },
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => mockAppHandling(),
}));

import { act, cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import {
  PERSONAL_IBAN_BINDINGS_STORAGE_KEY,
  usePersonalIbanIdentityBinding,
} from '../hooks/personal-iban.hook';

function BindingProbe(): JSX.Element {
  const binding = usePersonalIbanIdentityBinding();

  return (
    <>
      <div data-testid="requested">{binding.requestedPersonalIban ?? 'absent'}</div>
      <div data-testid="quote-selector">{binding.personalIban ?? 'absent'}</div>
      <div data-testid="decision">{binding.requiresCustomerDecision ? 'required' : 'not-required'}</div>
      <button type="button" onClick={binding.recordApplicationForCurrentCustomer}>
        request quote
      </button>
      <button type="button" onClick={binding.confirmForCurrentCustomer}>
        use personal IBAN
      </button>
      <button type="button" onClick={binding.declineForCurrentCustomer}>
        use ordinary details
      </button>
    </>
  );
}

function renderStandalone(path = '/buy?personal-iban=frick') {
  const router = createMemoryRouter([{ path: '*', element: <BindingProbe /> }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

function storedBinding() {
  return JSON.parse(localStorage.getItem(PERSONAL_IBAN_BINDINGS_STORAGE_KEY) ?? '{}').Frick;
}

describe('personal-IBAN identity binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    localStorage.clear();
    mockAppHandling.mockReturnValue({ isWidget: false });
    mockUseAuthContext.mockReturnValue({ session: undefined });
  });

  it('applies on first use and records the authenticated identity', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 41 } });
    renderStandalone();

    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');

    await act(async () => screen.getByRole('button', { name: 'request quote' }).click());

    expect(storedBinding()).toEqual({ customerIdentity: 41, usePersonalIban: true });
  });

  it('keeps an expired-token arrival selector through login and records it only when applied', async () => {
    const router = createMemoryRouter([{ path: '*', element: <BindingProbe /> }], {
      initialEntries: ['/login?personal-iban=frick'],
    });
    const rendered = render(<RouterProvider router={router} />);

    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');
    expect(localStorage.getItem(PERSONAL_IBAN_BINDINGS_STORAGE_KEY)).toBeNull();

    mockUseAuthContext.mockReturnValue({ session: { account: 42 } });
    await act(async () => router.navigate('/buy?personal-iban=frick'));
    rendered.rerender(<RouterProvider router={router} />);

    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');
    await act(async () => screen.getByRole('button', { name: 'request quote' }).click());
    expect(storedBinding()).toEqual({ customerIdentity: 42, usePersonalIban: true });
  });

  it('after logout, Back and reload ask the next customer instead of applying silently', async () => {
    mockUseAuthContext.mockReturnValue({ session: { account: 51 } });
    renderStandalone();
    await act(async () => screen.getByRole('button', { name: 'request quote' }).click());
    cleanup();

    // This fresh render models Back to the older URL followed by a full reload.
    mockUseAuthContext.mockReturnValue({ session: { account: 52 } });
    renderStandalone();

    expect(screen.getByTestId('requested')).toHaveTextContent('Frick');
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');
    expect(screen.getByTestId('decision')).toHaveTextContent('required');
  });

  it('records the next customer confirmation and applies the selector', async () => {
    localStorage.setItem(
      PERSONAL_IBAN_BINDINGS_STORAGE_KEY,
      JSON.stringify({ Frick: { customerIdentity: 61, usePersonalIban: true } }),
    );
    mockUseAuthContext.mockReturnValue({ session: { account: 62 } });
    renderStandalone();

    await act(async () => screen.getByRole('button', { name: 'use personal IBAN' }).click());

    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
    expect(storedBinding()).toEqual({ customerIdentity: 62, usePersonalIban: true });
  });

  it('records the next customer decline and keeps selector-free details after reload', async () => {
    localStorage.setItem(
      PERSONAL_IBAN_BINDINGS_STORAGE_KEY,
      JSON.stringify({ Frick: { customerIdentity: 71, usePersonalIban: true } }),
    );
    mockUseAuthContext.mockReturnValue({ session: { account: 72 } });
    renderStandalone();

    await act(async () => screen.getByRole('button', { name: 'use ordinary details' }).click());
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
    expect(storedBinding()).toEqual({ customerIdentity: 72, usePersonalIban: false });

    cleanup();
    renderStandalone();
    expect(screen.getByTestId('quote-selector')).toHaveTextContent('absent');
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
  });

  it('ignores malformed binding storage so the customer can continue', () => {
    localStorage.setItem(PERSONAL_IBAN_BINDINGS_STORAGE_KEY, '{not-json');
    mockUseAuthContext.mockReturnValue({ session: { account: 81 } });
    renderStandalone();

    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');
    expect(screen.getByTestId('decision')).toHaveTextContent('not-required');
  });

  it('uses the same identity comparison for a live Web Component selector', async () => {
    mockAppHandling.mockReturnValue({ isWidget: true, widgetPersonalIban: 'frick' });
    mockUseAuthContext.mockReturnValue({ session: { account: 91 } });
    renderStandalone('/buy');

    expect(screen.getByTestId('quote-selector')).toHaveTextContent('Frick');
    await act(async () => screen.getByRole('button', { name: 'request quote' }).click());
    expect(storedBinding()).toEqual({ customerIdentity: 91, usePersonalIban: true });
  });
});
