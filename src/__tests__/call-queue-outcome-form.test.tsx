// Component tests for the call-queue outcome form: the AmlCheck action must be offered for
// transaction-based queue items on ALL outcomes (queues like ManualCheckIpCountryPhone are excluded
// from the AML recheck cron, so a completed call has to act on the transaction explicitly) and must
// default to Reset when the call was completed (clears amlCheck/amlReason so the cron re-runs the
// full AML check instead of force-passing). Heavy transitive deps are mocked so the form can
// render under @testing-library/react without the full app shell.

jest.mock('@dfx.swiss/react-components', () => ({
  StyledButton: ({ label, onClick, disabled }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
  StyledButtonWidth: { FULL: 'full' },
}));
jest.mock('src/components/error-hint', () => ({ ErrorHint: () => null }));
jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_ns: string, key: string) => key }),
}));

const mockSaveCallOutcome = jest.fn();
jest.mock('src/hooks/compliance.hook', () => ({
  CallOutcome: {
    COMPLETED: 'Completed',
    UNAVAILABLE: 'Unavailable',
    SUSPICIOUS: 'Suspicious',
    FAILED: 'Failed',
    REPEAT: 'Repeat',
  },
  useCompliance: () => ({ saveCallOutcome: mockSaveCallOutcome }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CallQueueOutcomeForm } from 'src/components/compliance/call-queue/call-queue-outcome-form';
import { CallOutcome } from 'src/hooks/compliance.hook';

const OUTCOMES = [
  CallOutcome.COMPLETED,
  CallOutcome.UNAVAILABLE,
  CallOutcome.SUSPICIOUS,
  CallOutcome.FAILED,
  CallOutcome.REPEAT,
];

const TX_CONTEXT = { queue: 'ManualCheckIpCountryPhone', userDataId: 1, txId: 42, sourceType: 'BuyCrypto' } as any;
const USER_CONTEXT = { queue: 'UnavailableSuspicious', userDataId: 1 } as any;

function renderForm(context: any) {
  return render(
    <CallQueueOutcomeForm
      context={context}
      availableOutcomes={OUTCOMES}
      clerks={['JR']}
      onSaved={jest.fn()}
      title="Save Outcome"
    />,
  );
}

function fillAndSubmit(outcome: CallOutcome, amlAction?: string) {
  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[1], { target: { value: outcome } });
  if (amlAction !== undefined) fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: amlAction } });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'called' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Outcome' }));
}

describe('CallQueueOutcomeForm AmlCheck action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveCallOutcome.mockResolvedValue({ success: true, completedSteps: ['transaction', 'userData', 'log'] });
  });

  it('offers the AmlCheck action for transaction items and defaults to Reset on Completed', async () => {
    renderForm(TX_CONTEXT);
    expect(screen.getAllByRole('combobox')).toHaveLength(3);

    fillAndSubmit(CallOutcome.COMPLETED);

    await waitFor(() => expect(mockSaveCallOutcome).toHaveBeenCalledTimes(1));
    expect(mockSaveCallOutcome).toHaveBeenCalledWith(TX_CONTEXT, CallOutcome.COMPLETED, {
      signature: 'JR',
      comment: 'called',
      amlAction: 'Reset',
    });
  });

  it('keeps the Reset default overridable', async () => {
    renderForm(TX_CONTEXT);

    fillAndSubmit(CallOutcome.COMPLETED, '');

    await waitFor(() => expect(mockSaveCallOutcome).toHaveBeenCalledTimes(1));
    expect(mockSaveCallOutcome.mock.calls[0][2].amlAction).toBeUndefined();
  });

  it('resets the AmlCheck action to no change for other outcomes', async () => {
    renderForm(TX_CONTEXT);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: CallOutcome.COMPLETED } });
    expect((screen.getAllByRole('combobox')[2] as HTMLSelectElement).value).toBe('Reset');

    fillAndSubmit(CallOutcome.UNAVAILABLE);

    await waitFor(() => expect(mockSaveCallOutcome).toHaveBeenCalledTimes(1));
    expect(mockSaveCallOutcome.mock.calls[0][1]).toBe(CallOutcome.UNAVAILABLE);
    expect(mockSaveCallOutcome.mock.calls[0][2].amlAction).toBeUndefined();
  });

  it('does not offer an AmlCheck action for user-based queue items', async () => {
    renderForm(USER_CONTEXT);
    expect(screen.getAllByRole('combobox')).toHaveLength(2);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: CallOutcome.COMPLETED } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'called' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Outcome' }));

    await waitFor(() => expect(mockSaveCallOutcome).toHaveBeenCalledTimes(1));
    expect(mockSaveCallOutcome.mock.calls[0][2].amlAction).toBeUndefined();
  });
});
