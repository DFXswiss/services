// usePersonalIban derives the selector fresh on every render — no state, no lifecycle.
// These tests prove the three former blockers are structurally impossible:
// 1. Browser back restores the value because location.search is the source of truth.
// 2. There is no clear function, so cancel/close of an unrelated flow cannot wipe it.
// 3. There is no cached state, so a second buy with the same still-set widget attribute
//    always re-reads the live prop.

// normalizePersonalIban lives in util/personal-iban.ts which imports @dfx.swiss/react at
// module scope; mock the package so Jest does not try to parse its ESM build.
jest.mock('@dfx.swiss/react', () => ({}));

const mockAppHandling = jest.fn();

jest.mock('../contexts/app-handling.context', () => ({
  useAppHandlingContext: () => mockAppHandling(),
}));

import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { usePersonalIban } from '../hooks/personal-iban.hook';

function Probe(): JSX.Element {
  const personalIban = usePersonalIban();
  return <div data-testid="value">{personalIban ?? 'none'}</div>;
}

function ProbeWithNav(): JSX.Element {
  const personalIban = usePersonalIban();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="value">{personalIban ?? 'none'}</div>
      <button type="button" data-testid="go-buy" onClick={() => navigate('/buy')}>
        go buy
      </button>
      <button type="button" data-testid="go-frick" onClick={() => navigate('/buy?personal-iban=frick')}>
        go frick
      </button>
      <button type="button" data-testid="go-back" onClick={() => navigate(-1)}>
        go back
      </button>
    </>
  );
}

function renderAt(initialEntries: string[], element: JSX.Element = <Probe />) {
  const router = createMemoryRouter([{ path: '*', element }], { initialEntries });
  return render(<RouterProvider router={router} />);
}

describe('usePersonalIban', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('standalone / browser (isWidget: false)', () => {
    beforeEach(() => {
      mockAppHandling.mockReturnValue({ isWidget: false });
    });

    it('returns Frick from the personal-iban URL param', () => {
      renderAt(['/buy?personal-iban=frick']);
      expect(screen.getByTestId('value').textContent).toBe('Frick');
    });

    it('returns undefined when the param is absent', () => {
      renderAt(['/buy']);
      expect(screen.getByTestId('value').textContent).toBe('none');
    });

    // Blocker 1 regression: browser back must re-derive from location, not from emptied state.
    it('re-derives after navigate away and back (browser-back regression)', async () => {
      renderAt(['/buy?personal-iban=frick'], <ProbeWithNav />);
      expect(screen.getByTestId('value').textContent).toBe('Frick');

      await act(async () => {
        screen.getByTestId('go-buy').click();
      });
      expect(screen.getByTestId('value').textContent).toBe('none');

      await act(async () => {
        screen.getByTestId('go-back').click();
      });
      expect(screen.getByTestId('value').textContent).toBe('Frick');
    });

    it('depends only on current location — never on call history (blockers 2 & 3 structural)', async () => {
      // No clear function, no cached state: the return value is a pure function of current inputs.
      // Closing an unrelated flow or completing a prior buy cannot affect a subsequent read.
      renderAt(['/buy'], <ProbeWithNav />);
      expect(screen.getByTestId('value').textContent).toBe('none');

      await act(async () => {
        screen.getByTestId('go-frick').click();
      });
      expect(screen.getByTestId('value').textContent).toBe('Frick');

      await act(async () => {
        screen.getByTestId('go-buy').click();
      });
      expect(screen.getByTestId('value').textContent).toBe('none');

      await act(async () => {
        screen.getByTestId('go-frick').click();
      });
      // Same param value as before — reappears purely from location, no "re-sync effect" needed.
      expect(screen.getByTestId('value').textContent).toBe('Frick');
    });
  });

  describe('widget (isWidget: true)', () => {
    it('returns Frick from the live widget prop regardless of location', () => {
      mockAppHandling.mockReturnValue({ isWidget: true, widgetPersonalIban: 'frick' });
      renderAt(['/buy']); // location has no personal-iban
      expect(screen.getByTestId('value').textContent).toBe('Frick');
    });

    it('updates when the mocked widget prop changes (re-render with new inputs)', () => {
      mockAppHandling.mockReturnValue({ isWidget: true, widgetPersonalIban: 'frick' });
      const { rerender } = renderAt(['/buy']);
      expect(screen.getByTestId('value').textContent).toBe('Frick');

      mockAppHandling.mockReturnValue({ isWidget: true, widgetPersonalIban: undefined });
      const router = createMemoryRouter([{ path: '*', element: <Probe /> }], { initialEntries: ['/buy'] });
      rerender(<RouterProvider router={router} />);
      expect(screen.getByTestId('value').textContent).toBe('none');
    });

    it('ignores URL personal-iban when running as widget', () => {
      mockAppHandling.mockReturnValue({ isWidget: true, widgetPersonalIban: undefined });
      renderAt(['/buy?personal-iban=frick']);
      expect(screen.getByTestId('value').textContent).toBe('none');
    });
  });
});
