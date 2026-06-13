import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LedgerLegEntryDto, LedgerLegsResponseDto } from 'src/dto/ledger.dto';

const mockUseAdminGuard = jest.fn();
const mockUseLayoutOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGetAccountDetail = jest.fn<Promise<LedgerLegsResponseDto>, [number, string?, string?, number?]>();
let mockIsLoggedIn = true;
let mockAccountId: string | undefined = '5';

jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { LG: 'lg', SM: 'sm' },
  StyledButtonColor: { GRAY_OUTLINE: 'gray-outline' },
  StyledButtonSize: { SMALL: 'small' },
  StyledLoadingSpinner: ({ size }: { size: string }) => <div data-testid={`loading-spinner-${size}`} />,
  StyledButton: ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid={`btn-${label}`}>
      {label}
    </button>
  ),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ accountId: mockAccountId }),
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_scope: string, key: string) => key }),
}));

jest.mock('src/hooks/guard.hook', () => ({ useAdminGuard: () => mockUseAdminGuard() }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: (opts: unknown) => mockUseLayoutOptions(opts) }));
jest.mock('src/hooks/navigation.hook', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('src/hooks/ledger.hook', () => ({ useLedger: () => ({ getAccountDetail: mockGetAccountDetail }) }));

import LedgerAccountDetailScreen from 'src/screens/ledger-account-detail.screen';

function leg(overrides: Partial<LedgerLegEntryDto>): LedgerLegEntryDto {
  return {
    legId: 1,
    txId: 1,
    bookingDate: '2026-05-01T10:00:00.000Z',
    valueDate: '2026-05-01T10:00:00.000Z',
    sourceType: 'BuyCrypto',
    sourceId: 'tx-1',
    seq: 0,
    amountNative: 100,
    amountChf: 100,
    ...overrides,
  };
}

function response(overrides: Partial<LedgerLegsResponseDto>): LedgerLegsResponseDto {
  return {
    accountId: 5,
    accountName: 'Bank CHF',
    currency: 'CHF',
    period: { from: '2026-01-01', to: '2026-06-01' },
    openingBalance: 0,
    closingBalance: 100,
    legs: [],
    total: 0,
    ...overrides,
  };
}

describe('LedgerAccountDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = true;
    mockAccountId = '5';
  });

  it('invokes the admin guard', () => {
    mockGetAccountDetail.mockReturnValue(new Promise(() => undefined));
    render(<LedgerAccountDetailScreen />);
    expect(mockUseAdminGuard).toHaveBeenCalledTimes(1);
  });

  it('shows the full-screen spinner on the initial load', () => {
    mockGetAccountDetail.mockReturnValue(new Promise(() => undefined));
    render(<LedgerAccountDetailScreen />);
    expect(screen.getByTestId('loading-spinner-lg')).toBeInTheDocument();
  });

  it('requests the first page for the numeric account id', async () => {
    mockGetAccountDetail.mockResolvedValue(response({}));
    render(<LedgerAccountDetailScreen />);
    await waitFor(() => expect(mockGetAccountDetail).toHaveBeenCalledWith(5, undefined, undefined, 0));
  });

  it('does not fetch for a non-numeric account id', async () => {
    mockAccountId = 'abc';
    mockGetAccountDetail.mockResolvedValue(response({}));
    render(<LedgerAccountDetailScreen />);
    // NaN guard: the effect must bail; spinner stays because isLoading was never resolved.
    expect(mockGetAccountDetail).not.toHaveBeenCalled();
    expect(screen.getByTestId('loading-spinner-lg')).toBeInTheDocument();
  });

  it('does not fetch when no account id is present in the route', async () => {
    mockAccountId = undefined;
    mockGetAccountDetail.mockResolvedValue(response({}));
    render(<LedgerAccountDetailScreen />);
    expect(mockGetAccountDetail).not.toHaveBeenCalled();
  });

  it('does not fetch when the user is not logged in', () => {
    mockIsLoggedIn = false;
    mockGetAccountDetail.mockReturnValue(new Promise(() => undefined));
    render(<LedgerAccountDetailScreen />);
    expect(mockGetAccountDetail).not.toHaveBeenCalled();
  });

  it('renders the balance summary cards', async () => {
    mockGetAccountDetail.mockResolvedValue(response({ openingBalance: 1000, closingBalance: 2500, total: 0 }));
    render(<LedgerAccountDetailScreen />);
    expect(await screen.findByText('Opening Balance')).toBeInTheDocument();
    expect(screen.getByText('Closing Balance')).toBeInTheDocument();
    // de-CH grouping: '.' in the regex is a wildcard for the group separator.
    expect(screen.getByText(/^1.000\.00$/)).toBeInTheDocument();
    expect(screen.getByText(/^2.500\.00$/)).toBeInTheDocument();
  });

  it('shows the empty-period message when there are no entries', async () => {
    mockGetAccountDetail.mockResolvedValue(response({ legs: [], total: 0 }));
    render(<LedgerAccountDetailScreen />);
    expect(await screen.findByText('No entries in this period')).toBeInTheDocument();
  });

  it('groups legs by counter account and splits debit vs credit by sign', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({
        total: 2,
        legs: [
          leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income', amountNative: 50, amountChf: 50 }),
          leg({ legId: 2, counterAccountId: 9, counterAccountName: 'Fee Income', amountNative: -20, amountChf: -20 }),
        ],
      }),
    );
    render(<LedgerAccountDetailScreen />);

    const groupButton = await screen.findByRole('button', { name: 'Fee Income' });
    const card = groupButton.closest('div.bg-white') as HTMLElement;
    // Debit total 50.00 (positive leg), credit total 20.00 (magnitude of the negative leg).
    expect(within(card).getByText(/Debit 50\.00/)).toBeInTheDocument();
    expect(within(card).getByText(/Credit 20\.00/)).toBeInTheDocument();
  });

  it('navigates to a counter account when its header button is clicked', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({
        total: 1,
        legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income' })],
      }),
    );
    render(<LedgerAccountDetailScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fee Income' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ledger/accounts/9');
  });

  it('renders an unassigned group label (no link) for legs without a counter account', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({
        total: 1,
        legs: [leg({ legId: 1, counterAccountId: undefined, counterAccountName: undefined })],
      }),
    );
    render(<LedgerAccountDetailScreen />);
    const label = await screen.findByText('Unassigned');
    // No counterAccountId => a plain span, not a clickable button.
    expect(label.tagName).toBe('SPAN');
  });

  it('renders a reversal badge for reversal legs', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({
        total: 1,
        legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income', reversalOf: 42 })],
      }),
    );
    render(<LedgerAccountDetailScreen />);
    expect(await screen.findByText('Reversal')).toBeInTheDocument();
  });

  it('renders a dash for legs without a description', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({
        total: 1,
        legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income', description: undefined })],
      }),
    );
    render(<LedgerAccountDetailScreen />);
    await screen.findByRole('button', { name: 'Fee Income' });
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders the pagination footer with the page range and total page count', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({ total: 250, legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income' })] }),
    );
    render(<LedgerAccountDetailScreen />);
    await screen.findByRole('button', { name: 'Fee Income' });
    // ceil(250/100) = 3 pages, page 1 of 3.
    expect(screen.getByText(/Page/)).toHaveTextContent('1/3');
  });

  it('disables Previous on the first page and enables Next when more entries exist', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({ total: 250, legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income' })] }),
    );
    render(<LedgerAccountDetailScreen />);
    await screen.findByRole('button', { name: 'Fee Income' });
    expect(screen.getByTestId('btn-Previous')).toBeDisabled();
    expect(screen.getByTestId('btn-Next')).not.toBeDisabled();
  });

  it('advances to the next page and refetches with the incremented page index', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({ total: 250, legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income' })] }),
    );
    render(<LedgerAccountDetailScreen />);
    await screen.findByRole('button', { name: 'Fee Income' });

    fireEvent.click(screen.getByTestId('btn-Next'));
    await waitFor(() => expect(mockGetAccountDetail).toHaveBeenLastCalledWith(5, undefined, undefined, 1));
  });

  it('goes back a page and refetches with the decremented page index after advancing', async () => {
    mockGetAccountDetail.mockResolvedValue(
      response({ total: 250, legs: [leg({ legId: 1, counterAccountId: 9, counterAccountName: 'Fee Income' })] }),
    );
    render(<LedgerAccountDetailScreen />);
    await screen.findByRole('button', { name: 'Fee Income' });

    // Advance to page 1, then back to page 0: exercises the Math.max(0, p-1) decrement path.
    fireEvent.click(screen.getByTestId('btn-Next'));
    await waitFor(() => expect(mockGetAccountDetail).toHaveBeenLastCalledWith(5, undefined, undefined, 1));
    // Previous is disabled while the page-1 fetch is in flight; wait until it settles (isLoading false).
    await waitFor(() => expect(screen.getByTestId('btn-Previous')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('btn-Previous'));
    await waitFor(() => expect(mockGetAccountDetail).toHaveBeenLastCalledWith(5, undefined, undefined, 0));
  });

  it('shows the error message when loading fails', async () => {
    mockGetAccountDetail.mockRejectedValue(new Error('fail'));
    render(<LedgerAccountDetailScreen />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
  });

  it('uses the account name as the layout title once loaded', async () => {
    mockGetAccountDetail.mockResolvedValue(response({ accountName: 'Bank EUR' }));
    render(<LedgerAccountDetailScreen />);
    await waitFor(() =>
      expect(mockUseLayoutOptions).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bank EUR' })),
    );
  });
});
