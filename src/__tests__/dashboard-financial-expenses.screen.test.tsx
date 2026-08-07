// Component tests for the admin expenses detail screen: the logged-out and loading states, the
// three cumulative expense charts, the referral recipient table and the shared axis/tooltip
// formatters. ApexCharts, the SDK session and the screen's hooks are mocked so the screen renders
// without the app shell; the chart mock records the props so the option formatters can be called.

const mockUseSessionContext = jest.fn();
jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: () => mockUseSessionContext(),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { LG: 'lg' },
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

const mockChartProps: { options: ApexOptions; series: { name: string; data: number[][] }[] }[] = [];
jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: (props: { options: ApexOptions; series: { name: string; data: number[][] }[] }) => {
    mockChartProps.push(props);
    return <div data-testid="chart" />;
  },
}));

const mockGetFinancialChanges = jest.fn();
const mockGetRefRecipients = jest.fn();
jest.mock('src/hooks/dashboard.hook', () => ({
  useDashboard: () => ({
    getFinancialChanges: mockGetFinancialChanges,
    getRefRecipients: mockGetRefRecipients,
  }),
}));

const mockUseAdminGuard = jest.fn();
jest.mock('src/hooks/guard.hook', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

const mockUseLayoutOptions = jest.fn();
jest.mock('src/hooks/layout-config.hook', () => ({
  useLayoutOptions: (options: unknown) => mockUseLayoutOptions(options),
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import { ApexOptions } from 'apexcharts';
import { FinancialChangesEntry, RefRewardRecipient } from 'src/dto/dashboard.dto';
import DashboardFinancialExpensesScreen from 'src/screens/dashboard-financial-expenses.screen';

type Formatter = (val: number) => string;

function entry(timestamp: string, offset: number): FinancialChangesEntry {
  return {
    timestamp,
    total: offset,
    plus: { total: offset, buyCrypto: offset, buyFiat: offset, paymentLink: offset, trading: offset },
    minus: {
      total: offset,
      bank: offset,
      kraken: { total: offset, withdraw: offset, trading: offset },
      ref: { total: offset, amount: offset + 1, fee: offset + 2 },
      binance: { total: offset, withdraw: offset + 3, trading: offset + 4 },
      blockchain: { total: offset, txIn: offset + 5, txOut: offset + 6, trading: offset + 7 },
    },
  };
}

const ENTRIES: FinancialChangesEntry[] = [entry('2026-01-01T00:00:00Z', 100), entry('2026-01-02T00:00:00Z', 200)];

// Recipients are identified by their raw userDataId — the screen must never resolve one to a
// display name (see issue #1281), so the fixture carries nothing but the numbers the API returns.
const RECIPIENTS: RefRewardRecipient[] = [
  { userDataId: 42, count: 3, totalChf: 1234.5 },
  { userDataId: 4711, count: 1, totalChf: 7 },
];

function timestamps(): number[] {
  return ENTRIES.map((e) => new Date(e.timestamp).getTime());
}

describe('DashboardFinancialExpensesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChartProps.length = 0;
    mockUseSessionContext.mockReturnValue({ isLoggedIn: true });
    mockGetFinancialChanges.mockResolvedValue({ entries: ENTRIES });
    mockGetRefRecipients.mockResolvedValue(RECIPIENTS);
  });

  it('guards the screen for admins and keeps the spinner while logged out', async () => {
    mockUseSessionContext.mockReturnValue({ isLoggedIn: false });

    render(<DashboardFinancialExpensesScreen />);

    expect(await screen.findByTestId('loading-spinner')).toBeInTheDocument();
    expect(mockUseAdminGuard).toHaveBeenCalled();
    expect(mockUseLayoutOptions).toHaveBeenCalledWith({ title: 'Expenses Detail', noMaxWidth: true });
    expect(mockGetFinancialChanges).not.toHaveBeenCalled();
    expect(mockGetRefRecipients).not.toHaveBeenCalled();
  });

  it('loads the daily sampled changes and renders one chart per expense group', async () => {
    render(<DashboardFinancialExpensesScreen />);

    await waitFor(() => expect(screen.getAllByTestId('chart')).toHaveLength(3));

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(mockGetFinancialChanges).toHaveBeenCalledWith(undefined, true);
    expect(mockGetRefRecipients).toHaveBeenCalledWith();

    const [ref, binance, blockchain] = mockChartProps.slice(-3);
    const at = timestamps();

    expect(ref.series).toEqual([
      { name: 'Ref Amount', data: [[at[0], 101], [at[1], 201]] },
      { name: 'Ref Fee', data: [[at[0], 102], [at[1], 202]] },
    ]);
    expect(binance.series).toEqual([
      { name: 'Trading', data: [[at[0], 104], [at[1], 204]] },
      { name: 'Withdraw', data: [[at[0], 103], [at[1], 203]] },
    ]);
    expect(blockchain.series).toEqual([
      { name: 'TX Out', data: [[at[0], 106], [at[1], 206]] },
      { name: 'TX In', data: [[at[0], 105], [at[1], 205]] },
      { name: 'Trading', data: [[at[0], 107], [at[1], 207]] },
    ]);

    expect(ref.options.colors).toEqual(['#ef4444', '#f97316']);
    expect(binance.options.colors).toEqual(['#f97316', '#8b5cf6']);
    expect(blockchain.options.colors).toEqual(['#3b82f6', '#ef4444', '#64748b']);
    expect(ref.options.chart?.type).toBe('area');
  });

  it('lists every referral recipient by its raw identifier', async () => {
    render(<DashboardFinancialExpensesScreen />);

    const rows = await screen.findAllByRole('row');

    expect(rows).toHaveLength(RECIPIENTS.length + 1);
    expect(within(rows[0]).getByRole('columnheader', { name: 'UserData ID' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: '42' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: /^1.234\.5 CHF$/ })).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: '4711' })).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: '7 CHF' })).toBeInTheDocument();
  });

  it('abbreviates thousands on the y axis and formats tooltip values as CHF', async () => {
    render(<DashboardFinancialExpensesScreen />);

    await waitFor(() => expect(mockChartProps.length).toBeGreaterThan(0));

    const { yaxis, tooltip } = mockChartProps[0].options;
    const axisFormatter = (yaxis as unknown as { labels: { formatter: Formatter } }).labels.formatter;
    const tooltipFormatter = (tooltip?.y as unknown as { formatter: Formatter }).formatter;

    expect(axisFormatter(1000)).toBe('1k');
    expect(axisFormatter(12500)).toBe('13k');
    expect(axisFormatter(999.6)).toBe('1000');
    expect(axisFormatter(0)).toBe('0');

    expect(tooltipFormatter(1234.5)).toMatch(/^1.235 CHF$/);
    expect(tooltipFormatter(12)).toBe('12 CHF');
  });
});
