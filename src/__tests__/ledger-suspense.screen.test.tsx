import { render, screen, waitFor } from '@testing-library/react';
import { SuspenseLegDto, SuspenseResponseDto } from 'src/dto/ledger.dto';

const mockUseAdminGuard = jest.fn();
const mockUseLayoutOptions = jest.fn();
const mockGetSuspense = jest.fn<Promise<SuspenseResponseDto>, []>();
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
jest.mock('src/hooks/ledger.hook', () => ({ useLedger: () => ({ getSuspense: mockGetSuspense }) }));

import LedgerSuspenseScreen from 'src/screens/ledger-suspense.screen';

function suspenseLeg(overrides: Partial<SuspenseLegDto>): SuspenseLegDto {
  return {
    legId: 1,
    txId: 1,
    bookingDate: '2026-05-01T10:00:00.000Z',
    sourceType: 'BankTx',
    sourceId: 'src-1',
    amountNative: 100,
    amountChf: 100,
    currency: 'CHF',
    age: 3,
    ...overrides,
  };
}

describe('LedgerSuspenseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it('invokes the admin guard and registers the Suspense Account layout', () => {
    mockGetSuspense.mockReturnValue(new Promise(() => undefined));
    render(<LedgerSuspenseScreen />);
    expect(mockUseAdminGuard).toHaveBeenCalledTimes(1);
    expect(mockUseLayoutOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Suspense Account', backButton: true }),
    );
  });

  it('shows the loading spinner while pending', () => {
    mockGetSuspense.mockReturnValue(new Promise(() => undefined));
    render(<LedgerSuspenseScreen />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('does not fetch when the user is not logged in', () => {
    mockIsLoggedIn = false;
    mockGetSuspense.mockReturnValue(new Promise(() => undefined));
    render(<LedgerSuspenseScreen />);
    expect(mockGetSuspense).not.toHaveBeenCalled();
  });

  it('renders the summary cards with total CHF and open item count', async () => {
    mockGetSuspense.mockResolvedValue({
      totalChf: 1500.5,
      legs: [suspenseLeg({ legId: 1 }), suspenseLeg({ legId: 2 })],
    });
    render(<LedgerSuspenseScreen />);
    // The summary labels render immediately (outside the loading branch); wait for the resolved
    // total value, which only appears once getSuspense resolves. de-CH grouping ('.' = wildcard).
    expect(await screen.findByText(/^1.500\.50$/)).toBeInTheDocument();
    expect(screen.getByText('Total Suspense (CHF)')).toBeInTheDocument();
    expect(screen.getByText('Open Items')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('sorts legs by age descending (oldest first)', async () => {
    mockGetSuspense.mockResolvedValue({
      totalChf: 300,
      legs: [
        suspenseLeg({ legId: 1, age: 2, sourceId: 'young' }),
        suspenseLeg({ legId: 2, age: 10, sourceId: 'old' }),
        suspenseLeg({ legId: 3, age: 5, sourceId: 'middle' }),
      ],
    });
    render(<LedgerSuspenseScreen />);
    await screen.findByText('old');
    const table = screen.getByText('old').closest('table') as HTMLElement;
    const text = table.textContent ?? '';
    expect(text.indexOf('old')).toBeLessThan(text.indexOf('middle'));
    expect(text.indexOf('middle')).toBeLessThan(text.indexOf('young'));
  });

  it('highlights legs older than seven days with a red age cell', async () => {
    mockGetSuspense.mockResolvedValue({
      totalChf: 100,
      legs: [suspenseLeg({ legId: 1, age: 10, sourceId: 'old-item' })],
    });
    render(<LedgerSuspenseScreen />);
    const sourceCell = await screen.findByText('old-item');
    const row = sourceCell.closest('tr') as HTMLElement;
    expect(row.className).toContain('bg-dfxRed-100/10');
    const ageCell = row.querySelector('td:last-child') as HTMLElement;
    expect(ageCell.className).toContain('text-dfxRed-150');
  });

  it('does not highlight legs at or under seven days', async () => {
    mockGetSuspense.mockResolvedValue({
      totalChf: 100,
      legs: [suspenseLeg({ legId: 1, age: 7, sourceId: 'fresh-item' })],
    });
    render(<LedgerSuspenseScreen />);
    const sourceCell = await screen.findByText('fresh-item');
    const row = sourceCell.closest('tr') as HTMLElement;
    expect(row.className).not.toContain('bg-dfxRed-100/10');
  });

  it('renders native amount with currency and a dash for missing description', async () => {
    mockGetSuspense.mockResolvedValue({
      totalChf: 100,
      legs: [suspenseLeg({ legId: 1, amountNative: 1234.5, currency: 'CHF', description: undefined, sourceId: 'x' })],
    });
    render(<LedgerSuspenseScreen />);
    await screen.findByText('x');
    // "1'234.50 CHF" — native amount followed by the currency code.
    expect(screen.getByText(/1.234\.50/)).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows the empty state row when there are no open items', async () => {
    mockGetSuspense.mockResolvedValue({ totalChf: 0, legs: [] });
    render(<LedgerSuspenseScreen />);
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument());
    expect(screen.getByText(/No open suspense items/)).toBeInTheDocument();
    // Open Items count is 0.
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows the error message when the request rejects', async () => {
    mockGetSuspense.mockRejectedValue(new Error('fail'));
    render(<LedgerSuspenseScreen />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
  });
});
