jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { SM: 'sm', LG: 'lg' },
  StyledButtonWidth: { MIN: 'min' },
  StyledLoadingSpinner: () => null,
  StyledButton: ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));
jest.mock('src/components/error-hint', () => ({
  ErrorHint: ({ message }: { message: string }) => <div data-testid="error-hint">{message}</div>,
}));

const mockGetPromoCodes = jest.fn();
const mockCreatePromoCode = jest.fn();
const mockDeactivatePromoCode = jest.fn();
jest.mock('src/hooks/realunit-referral.hook', () => ({
  useRealunitReferral: () => ({
    getPromoCodes: (...args: unknown[]) => mockGetPromoCodes(...args),
    createPromoCode: (...args: unknown[]) => mockCreatePromoCode(...args),
    deactivatePromoCode: (...args: unknown[]) => mockDeactivatePromoCode(...args),
  }),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RealunitPromoPanel } from 'src/components/realunit/promo-panel';

const translate = (_ns: string, key: string) => key;

const ACTIVE = {
  id: 3,
  code: 'START2026',
  minBuyRealu: 200,
  redemptionCap: 50,
  validFrom: '2026-09-09T00:00:00.000Z',
  validUntil: '2026-12-31T23:59:59.000Z',
};

describe('RealunitPromoPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPromoCodes.mockResolvedValue([]);
    mockCreatePromoCode.mockResolvedValue(ACTIVE);
    mockDeactivatePromoCode.mockResolvedValue(undefined);
  });

  it('shows a loading spinner while promo codes load', () => {
    mockGetPromoCodes.mockImplementation(() => new Promise(() => undefined));
    render(<RealunitPromoPanel translate={translate} />);
    expect(screen.getByText('Promo codes')).toBeInTheDocument();
  });

  it('shows the empty promo list', async () => {
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByText('No promo codes yet')).toBeInTheDocument());
    expect(mockGetPromoCodes).toHaveBeenCalled();
  });

  it('starts a promo code with day-bounded ISO dates', async () => {
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(mockGetPromoCodes).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Code'), { target: { value: ' START2026 ' } });
    fireEvent.change(screen.getByLabelText('Redemption cap'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Minimum buy (REALU)'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Valid from'), { target: { value: '2026-09-09' } });
    fireEvent.change(screen.getByLabelText('Valid until'), { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(mockCreatePromoCode).toHaveBeenCalled());
    expect(mockCreatePromoCode).toHaveBeenCalledWith({
      code: 'START2026',
      redemptionCap: 50,
      minBuyRealu: 200,
      validFrom: '2026-09-09T00:00:00.000Z',
      validUntil: '2026-12-31T23:59:59.000Z',
    });
    await waitFor(() => expect(screen.getByText('START2026')).toBeInTheDocument());
  });

  it('keeps Start disabled until the form is complete', async () => {
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(mockGetPromoCodes).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('shows a form error when create fails', async () => {
    mockCreatePromoCode.mockRejectedValue(new Error('taken'));
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(mockGetPromoCodes).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Redemption cap'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Valid from'), { target: { value: '2026-09-09' } });
    fireEvent.change(screen.getByLabelText('Valid until'), { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(screen.getByTestId('error-hint')).toHaveTextContent('taken'));
  });

  it('shows a loaded promo as already deactivated', async () => {
    mockGetPromoCodes.mockResolvedValue([{ ...ACTIVE, deactivatedAt: '2026-09-01T00:00:00.000Z' }]);
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByText('Deactivated')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });

  it('shows a list error when promo codes fail to load', async () => {
    mockGetPromoCodes.mockRejectedValue(new Error('list-fail'));
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByTestId('error-hint')).toHaveTextContent('list-fail'));
  });

  it('falls back to Unknown error when the promo list rejects without a message', async () => {
    mockGetPromoCodes.mockRejectedValue({ message: undefined });
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByTestId('error-hint')).toHaveTextContent('Unknown error'));
  });

  it('deactivates an active promo code', async () => {
    mockGetPromoCodes.mockResolvedValue([ACTIVE]);
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByText('START2026')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(mockDeactivatePromoCode).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.getByText('Deactivated')).toBeInTheDocument());
  });

  it('keeps Start disabled when until is before from', async () => {
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(mockGetPromoCodes).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Redemption cap'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Valid from'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Valid until'), { target: { value: '2026-09-09' } });

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('falls back to Unknown error when create rejects without a message', async () => {
    mockCreatePromoCode.mockRejectedValue({ message: undefined });
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(mockGetPromoCodes).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Redemption cap'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Valid from'), { target: { value: '2026-09-09' } });
    fireEvent.change(screen.getByLabelText('Valid until'), { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(screen.getByTestId('error-hint')).toHaveTextContent('Unknown error'));
  });

  it('shows a list error when deactivate fails', async () => {
    mockGetPromoCodes.mockResolvedValue([ACTIVE]);
    mockDeactivatePromoCode.mockRejectedValue(new Error('nope'));
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByText('START2026')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(screen.getByTestId('error-hint')).toHaveTextContent('nope'));
  });

  it('falls back to Unknown error when deactivate rejects without a message', async () => {
    mockGetPromoCodes.mockResolvedValue([ACTIVE]);
    mockDeactivatePromoCode.mockRejectedValue({ message: undefined });
    render(<RealunitPromoPanel translate={translate} />);
    await waitFor(() => expect(screen.getByText('START2026')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(screen.getByTestId('error-hint')).toHaveTextContent('Unknown error'));
  });
});
