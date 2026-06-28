import { render, screen, waitFor, within } from '@testing-library/react';
import { AccountReconResultDto, ReconStatusResponseDto } from 'src/dto/ledger.dto';

const mockUseAdminGuard = jest.fn();
const mockUseLayoutOptions = jest.fn();
const mockGetReconStatus = jest.fn<Promise<ReconStatusResponseDto>, []>();
let mockIsLoggedIn = true;

jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { LG: 'lg', SM: 'sm' },
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_scope: string, key: string) => key }),
}));

jest.mock('src/hooks/guard.hook', () => ({ useAdminGuard: () => mockUseAdminGuard() }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: (opts: unknown) => mockUseLayoutOptions(opts) }));
jest.mock('src/hooks/ledger.hook', () => ({ useLedger: () => ({ getReconStatus: mockGetReconStatus }) }));

import LedgerReconciliationScreen from 'src/screens/ledger-reconciliation.screen';

function recon(overrides: Partial<AccountReconResultDto>): AccountReconResultDto {
  return {
    accountId: 1,
    accountName: 'BTC Wallet',
    ledgerBalance: 1.5,
    externalFeedBalance: 1.5,
    difference: 0,
    feedTimestamp: '2026-06-01T00:00:00.000Z',
    staleness: 'fresh',
    status: 'ok',
    ...overrides,
  };
}

const response: ReconStatusResponseDto = {
  runAt: '2026-06-10T08:00:00.000Z',
  accounts: [recon({})],
};

describe('LedgerReconciliationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it('invokes the admin guard and registers the Reconciliation layout', () => {
    mockGetReconStatus.mockReturnValue(new Promise(() => undefined));
    render(<LedgerReconciliationScreen />);
    expect(mockUseAdminGuard).toHaveBeenCalledTimes(1);
    expect(mockUseLayoutOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Reconciliation', backButton: true }),
    );
  });

  it('shows the loading spinner while pending', () => {
    mockGetReconStatus.mockReturnValue(new Promise(() => undefined));
    render(<LedgerReconciliationScreen />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('does not fetch when the user is not logged in', () => {
    mockIsLoggedIn = false;
    mockGetReconStatus.mockReturnValue(new Promise(() => undefined));
    render(<LedgerReconciliationScreen />);
    expect(mockGetReconStatus).not.toHaveBeenCalled();
  });

  it('renders the run timestamp and the account row on success', async () => {
    mockGetReconStatus.mockResolvedValue(response);
    render(<LedgerReconciliationScreen />);
    expect(await screen.findByText('BTC Wallet')).toBeInTheDocument();
    // runAt is formatted via formatDate (de-CH, UTC): includes the date 10.06.2026.
    expect(screen.getByText(/10\.06\.2026/)).toBeInTheDocument();
  });

  it('renders the table column headers', async () => {
    mockGetReconStatus.mockResolvedValue(response);
    render(<LedgerReconciliationScreen />);
    await screen.findByText('BTC Wallet');
    expect(screen.getByText('Ledger (native)')).toBeInTheDocument();
    expect(screen.getByText('Feed (native)')).toBeInTheDocument();
    expect(screen.getByText('Difference')).toBeInTheDocument();
  });

  it('formats native balances with 8 decimals (no sub-unit truncation)', async () => {
    mockGetReconStatus.mockResolvedValue({
      runAt: response.runAt,
      accounts: [recon({ ledgerBalance: 1.50000123, externalFeedBalance: 1.5, difference: 0.00000123, status: 'diff' })],
    });
    render(<LedgerReconciliationScreen />);
    await screen.findByText('BTC Wallet');
    // A diff that only lives in decimals 3-8 must not collapse to 0.00000000.
    expect(screen.getByText('0.00000123')).toBeInTheDocument();
  });

  it('highlights the difference cell in red for a non-ok status', async () => {
    mockGetReconStatus.mockResolvedValue({
      runAt: response.runAt,
      accounts: [recon({ difference: 0.5, status: 'diff' })],
    });
    render(<LedgerReconciliationScreen />);
    const nameCell = await screen.findByText('BTC Wallet');
    const row = nameCell.closest('tr') as HTMLElement;
    const redCell = within(row).getByText('0.50000000').closest('td') as HTMLElement;
    expect(redCell.className).toContain('text-dfxRed-150');
  });

  it('keeps the difference cell blue for an ok status', async () => {
    mockGetReconStatus.mockResolvedValue(response);
    const { container } = render(<LedgerReconciliationScreen />);
    await screen.findByText('BTC Wallet');
    const diffCell = within(container.querySelector('tbody') as HTMLElement)
      .getByText('0.00000000')
      .closest('td') as HTMLElement;
    expect(diffCell.className).not.toContain('text-dfxRed-150');
    expect(diffCell.className).toContain('text-dfxBlue-800');
  });

  it('renders a red status dot for a suspense_alarm account', async () => {
    mockGetReconStatus.mockResolvedValue({
      runAt: response.runAt,
      accounts: [recon({ status: 'suspense_alarm', staleness: 'fresh' })],
    });
    const { container } = render(<LedgerReconciliationScreen />);
    await screen.findByText('BTC Wallet');
    const dot = container.querySelector('span.rounded-full') as HTMLElement;
    // reconStatusAmpel(suspense_alarm) === red #ef4444.
    expect(dot.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('builds the staleness tooltip on the status dot', async () => {
    mockGetReconStatus.mockResolvedValue({
      runAt: response.runAt,
      accounts: [recon({ staleness: 'stale' })],
    });
    const { container } = render(<LedgerReconciliationScreen />);
    await screen.findByText('BTC Wallet');
    const dot = container.querySelector('span.rounded-full') as HTMLElement;
    expect(dot.getAttribute('title')).toBe('Staleness: stale');
  });

  it('shows the error message when the request rejects', async () => {
    mockGetReconStatus.mockRejectedValue(new Error('fail'));
    render(<LedgerReconciliationScreen />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders an empty table body when there are no accounts', async () => {
    mockGetReconStatus.mockResolvedValue({ runAt: response.runAt, accounts: [] });
    const { container } = render(<LedgerReconciliationScreen />);
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
    const tbody = container.querySelector('tbody') as HTMLElement;
    expect(tbody.querySelectorAll('tr')).toHaveLength(0);
  });
});
