// jest.mock factories may only reference variables whose name starts with `mock`.
const mockDecideLimitRequest = jest.fn();
const mockToBase64 = jest.fn();

// Mocked wholesale rather than via requireActual: the real module pulls in @dfx.swiss/react, which
// ships ESM that this Jest setup cannot parse. The two exports the component reads at runtime are
// restated here; their values are the API's and are pinned by the hook test next to this one, which
// covers the call sequence itself. This file covers what the form is responsible for: which values
// reach the hook, and what the clerk is shown afterwards.
jest.mock('src/hooks/compliance.hook', () => ({
  LimitRequestDecision: { ACCEPTED: 'Accepted', PARTIALLY_ACCEPTED: 'PartiallyAccepted', REJECTED: 'Rejected' },
  LimitRequestGrantingDecisions: ['Accepted', 'PartiallyAccepted'],
  useCompliance: () => ({ decideLimitRequest: mockDecideLimitRequest }),
}));

// The component reads the picked file through this helper; jsdom's FileReader is stubbed out here so
// the test controls the encoded result.
jest.mock('src/util/utils', () => ({ toBase64: (file: File) => mockToBase64(file) }));

jest.mock('src/components/error-hint', () => {
  // The factory runs before this file's imports, so React has to be required here.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    ErrorHint: ({ message }: { message: string }) =>
      React.createElement('div', { 'data-testid': 'error-hint' }, message),
  };
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { LimitRequestDecisionForm } from 'src/components/compliance/limit-request-decision-form';

const LIMIT_REQUEST_ID = 42;
const USER_DATA_ID = 397328;
const REQUESTED = 500000;
const CURRENT_LIMIT = 100000;
const CONTEXT = { limitRequestId: LIMIT_REQUEST_ID, userDataId: USER_DATA_ID };

function renderForm(overrides: Partial<Parameters<typeof LimitRequestDecisionForm>[0]> = {}) {
  const onDecided = jest.fn();
  render(
    <LimitRequestDecisionForm
      limitRequestId={LIMIT_REQUEST_ID}
      userDataId={USER_DATA_ID}
      requestedLimit={REQUESTED}
      fundOrigin="Savings"
      investmentDate="Now"
      currentDepositLimit={CURRENT_LIMIT}
      clerks={['JR', 'VR']}
      defaultClerk="JR"
      onDecided={onDecided}
      {...overrides}
    />,
  );
  return onDecided;
}

function selectDecision(value: string) {
  fireEvent.change(screen.getByLabelText('Decision', { selector: 'select' }), { target: { value } });
}

function saveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Save decision' }) as HTMLButtonElement;
}

async function clickSave() {
  await act(async () => {
    fireEvent.click(saveButton());
  });
}

describe('LimitRequestDecisionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecideLimitRequest.mockResolvedValue({ success: true, completedSteps: [] });
    mockToBase64.mockImplementation(async (file: File) =>
      file.name === 'Kaufvertrag.pdf' ? 'data:application/pdf;base64,Y29udHJhY3Q=' : 'data:text/plain;base64,eA==',
    );
  });

  it('requires a decision before it can be saved', () => {
    renderForm();

    expect(saveButton()).toBeDisabled();

    selectDecision('Rejected');
    expect(saveButton()).not.toBeDisabled();
  });

  it('submits an acceptance with the requested amount prefilled', async () => {
    const onDecided = renderForm();

    selectDecision('Accepted');
    await clickSave();

    expect(mockDecideLimitRequest).toHaveBeenCalledWith(CONTEXT, 'Accepted', {
      clerk: 'JR',
      requestedLimit: REQUESTED,
      grantedLimit: REQUESTED,
      currentDepositLimit: CURRENT_LIMIT,
      comment: undefined,
      fundOrigin: 'Savings',
      investmentDate: 'Now',
    });
    expect(onDecided).toHaveBeenCalledTimes(1);
  });

  it('submits the edited amount for a partial acceptance', async () => {
    renderForm();

    selectDecision('PartiallyAccepted');
    fireEvent.change(screen.getByLabelText('Accepted limit (CHF)', { selector: 'input' }), {
      target: { value: '200000' },
    });
    await clickSave();

    expect(mockDecideLimitRequest).toHaveBeenCalledWith(
      CONTEXT,
      'PartiallyAccepted',
      expect.objectContaining({ grantedLimit: 200000 }),
    );
  });

  it('blocks an empty or non-positive amount on a granting decision', () => {
    renderForm();
    selectDecision('Accepted');
    const input = screen.getByLabelText('Accepted limit (CHF)', { selector: 'input' });

    fireEvent.change(input, { target: { value: '' } });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(input, { target: { value: '0' } });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(input, { target: { value: '150000' } });
    expect(saveButton()).not.toBeDisabled();
  });

  // A rejection grants nothing, so the amount field has no meaning there and must not travel with it.
  it('hides the amount and grants none on a rejection', async () => {
    renderForm();

    selectDecision('Rejected');
    expect(screen.queryByLabelText('Accepted limit (CHF)', { selector: 'input' })).not.toBeInTheDocument();
    await clickSave();

    expect(mockDecideLimitRequest).toHaveBeenCalledWith(
      CONTEXT,
      'Rejected',
      expect.objectContaining({ grantedLimit: undefined, currentDepositLimit: CURRENT_LIMIT }),
    );
  });

  it('passes the optional file note along', async () => {
    renderForm();

    selectDecision('Rejected');
    fireEvent.change(screen.getByLabelText('Internal file note', { selector: 'input' }), {
      target: { value: 'Unterlagen nicht nachgereicht' },
    });
    await clickSave();

    expect(mockDecideLimitRequest).toHaveBeenCalledWith(
      CONTEXT,
      'Rejected',
      expect.objectContaining({ comment: 'Unterlagen nicht nachgereicht' }),
    );
  });

  // Partial application is the dangerous state: the limit is already raised while the decision is not
  // recorded. The clerk has to see that before retrying, or they raise it a second time blind.
  it('names the steps that already landed when the sequence fails midway', async () => {
    const onDecided = renderForm();
    mockDecideLimitRequest.mockResolvedValue({
      success: false,
      failedStep: 'limitRequest',
      completedSteps: ['depositLimit'],
      message: 'Limit request already final',
    });

    selectDecision('Accepted');
    await clickSave();

    expect(screen.getByTestId('error-hint')).toHaveTextContent('Limit request already final');
    expect(screen.getByTestId('error-hint')).toHaveTextContent('already applied: depositLimit');
    expect(onDecided).not.toHaveBeenCalled();
    // The form stays usable so the clerk can retry or pick another decision.
    expect(saveButton()).not.toBeDisabled();
  });

  it('reports a failure that landed nothing without naming any step', async () => {
    renderForm();
    mockDecideLimitRequest.mockResolvedValue({
      success: false,
      failedStep: 'depositLimit',
      completedSteps: [],
      message: 'nope',
    });

    selectDecision('Accepted');
    await clickSave();

    expect(screen.getByTestId('error-hint')).toHaveTextContent('nope');
    expect(screen.getByTestId('error-hint')).not.toHaveTextContent('already applied');
  });

  it('reads the selected customer document and passes it along', async () => {
    renderForm();

    const file = new File(['contract'], 'Kaufvertrag.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Customer document (optional)', { selector: 'input' }), {
      target: { files: [file] },
    });
    expect(screen.getByText(/Kaufvertrag\.pdf/)).toBeInTheDocument();

    selectDecision('Accepted');
    await clickSave();

    expect(mockDecideLimitRequest).toHaveBeenCalledWith(
      CONTEXT,
      'Accepted',
      expect.objectContaining({
        attachment: { data: 'data:application/pdf;base64,Y29udHJhY3Q=', name: 'Kaufvertrag.pdf' },
      }),
    );
  });

  // A document that cannot be read must stop the decision rather than record it without the proof the
  // clerk meant to file.
  it('reports an unreadable document and decides nothing', async () => {
    mockToBase64.mockResolvedValueOnce(undefined);
    renderForm();

    fireEvent.change(screen.getByLabelText('Customer document (optional)', { selector: 'input' }), {
      target: { files: [new File(['x'], 'broken.pdf', { type: 'application/pdf' })] },
    });
    selectDecision('Accepted');
    await clickSave();

    expect(screen.getByTestId('error-hint')).toHaveTextContent('could not be read');
    expect(mockDecideLimitRequest).not.toHaveBeenCalled();
  });

  it('falls back to a free-text clerk field when no clerk list is available', async () => {
    renderForm({ clerks: [], defaultClerk: undefined });

    expect(saveButton()).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Sign'), { target: { value: 'JR' } });
    selectDecision('Rejected');
    await clickSave();

    expect(mockDecideLimitRequest).toHaveBeenCalledWith(CONTEXT, 'Rejected', expect.objectContaining({ clerk: 'JR' }));
  });
});
