// jest.mock factories may only reference variables whose name starts with `mock`.
const mockUpdateLimitRequest = jest.fn();
const mockGetCallQueueClerks = jest.fn();

// Mocked wholesale rather than via requireActual: the real module pulls in @dfx.swiss/react, which
// ships ESM that this Jest setup cannot parse. The decision enum is restated here because the
// component reads it at runtime; the string values are the API's and are asserted below.
jest.mock('src/hooks/compliance.hook', () => ({
  LimitRequestDecision: { ACCEPTED: 'Accepted', PARTIALLY_ACCEPTED: 'PartiallyAccepted', REJECTED: 'Rejected' },
  useCompliance: () => ({ updateLimitRequest: mockUpdateLimitRequest, getCallQueueClerks: mockGetCallQueueClerks }),
}));

jest.mock('@dfx.swiss/react-components', () => {
  // The factory runs before this file's imports, so React has to be required here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    StyledButtonWidth: { FULL: 'FULL' },
    StyledButton: ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) =>
      React.createElement('button', { onClick, disabled }, label),
  };
});

jest.mock('src/components/error-hint', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    ErrorHint: ({ message }: { message: string }) =>
      React.createElement('div', { 'data-testid': 'error-hint' }, message),
  };
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LimitRequestDecisionForm } from 'src/components/compliance/limit-request-decision-form';
import type { LimitRequestInfo } from 'src/hooks/compliance.hook';

const LIMIT_REQUEST: LimitRequestInfo = { id: 42, limit: 50000, fundOrigin: 'Savings' };

function renderForm(onDecided = jest.fn()) {
  render(<LimitRequestDecisionForm limitRequest={LIMIT_REQUEST} onDecided={onDecided} />);
  return onDecided;
}

function selectDecision(value: string) {
  fireEvent.change(screen.getByLabelText('Decision', { selector: 'select' }), { target: { value } });
}

function getSaveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Save decision' }) as HTMLButtonElement;
}

describe('LimitRequestDecisionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCallQueueClerks.mockResolvedValue(['JR', 'CT']);
    mockUpdateLimitRequest.mockResolvedValue(undefined);
  });

  it('preselects the first clerk and requires a decision before saving', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByDisplayValue('JR')).toBeInTheDocument());

    expect(getSaveButton()).toBeDisabled();

    selectDecision('Rejected');
    expect(getSaveButton()).not.toBeDisabled();
  });

  it('sends a rejection without an accepted limit', async () => {
    const onDecided = renderForm();
    await waitFor(() => expect(mockGetCallQueueClerks).toHaveBeenCalled());

    selectDecision('Rejected');
    // The accepted-limit field only belongs to a decision that grants one.
    expect(screen.queryByLabelText('Accepted limit (CHF)', { selector: 'input' })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getSaveButton());
    });

    expect(mockUpdateLimitRequest).toHaveBeenCalledWith(42, {
      decision: 'Rejected',
      acceptedLimit: undefined,
      clerk: 'JR',
    });
    expect(onDecided).toHaveBeenCalledTimes(1);
  });

  it('defaults the accepted limit to the requested amount when accepting', async () => {
    renderForm();
    await waitFor(() => expect(mockGetCallQueueClerks).toHaveBeenCalled());

    selectDecision('Accepted');

    await act(async () => {
      fireEvent.click(getSaveButton());
    });

    expect(mockUpdateLimitRequest).toHaveBeenCalledWith(42, {
      decision: 'Accepted',
      acceptedLimit: 50000,
      clerk: 'JR',
    });
  });

  it('sends the edited amount for a partial acceptance and blocks an empty one', async () => {
    renderForm();
    await waitFor(() => expect(mockGetCallQueueClerks).toHaveBeenCalled());

    selectDecision('PartiallyAccepted');
    const limitInput = screen.getByLabelText('Accepted limit (CHF)', { selector: 'input' });

    fireEvent.change(limitInput, { target: { value: '' } });
    expect(getSaveButton()).toBeDisabled();

    fireEvent.change(limitInput, { target: { value: '20000' } });
    await act(async () => {
      fireEvent.click(getSaveButton());
    });

    expect(mockUpdateLimitRequest).toHaveBeenCalledWith(42, {
      decision: 'PartiallyAccepted',
      acceptedLimit: 20000,
      clerk: 'JR',
    });
  });

  it('surfaces a failed save and does not report the request as decided', async () => {
    const onDecided = renderForm();
    await waitFor(() => expect(mockGetCallQueueClerks).toHaveBeenCalled());
    mockUpdateLimitRequest.mockRejectedValue(new Error('Limit request already final'));

    selectDecision('Accepted');
    await act(async () => {
      fireEvent.click(getSaveButton());
    });

    expect(screen.getByTestId('error-hint')).toHaveTextContent('Limit request already final');
    expect(onDecided).not.toHaveBeenCalled();
    // The form stays usable so the clerk can retry or pick another decision.
    expect(getSaveButton()).not.toBeDisabled();
  });

  it('falls back to a free-text signature when the clerk list cannot be loaded', async () => {
    mockGetCallQueueClerks.mockRejectedValue(new Error('nope'));
    renderForm();

    const signature = await screen.findByPlaceholderText('Your sign');
    expect(getSaveButton()).toBeDisabled();

    fireEvent.change(signature, { target: { value: 'JR' } });
    selectDecision('Rejected');

    await act(async () => {
      fireEvent.click(getSaveButton());
    });

    expect(mockUpdateLimitRequest).toHaveBeenCalledWith(42, {
      decision: 'Rejected',
      acceptedLimit: undefined,
      clerk: 'JR',
    });
  });
});
