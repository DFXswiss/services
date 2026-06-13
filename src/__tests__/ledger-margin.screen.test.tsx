import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MarginResponseDto } from 'src/dto/ledger.dto';

const mockUseAdminGuard = jest.fn();
const mockUseLayoutOptions = jest.fn();
const mockGetMargin = jest.fn<Promise<MarginResponseDto>, [string?, string?, boolean?]>();
let mockIsLoggedIn = true;

// Captures the props the chart was last rendered with, so the series mapping is asserted on real data.
type AxisFormatter = (val: number) => string;
interface CapturedOptions {
  yaxis?: { labels?: { formatter?: AxisFormatter } };
  tooltip?: { y?: { formatter?: AxisFormatter } };
}
const mockChartProps: {
  series?: { name: string; data: number[][] }[];
  type?: string;
  options?: CapturedOptions;
} = {};

jest.mock('@dfx.swiss/react', () => ({
  useSessionContext: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

jest.mock('@dfx.swiss/react-components', () => ({
  SpinnerSize: { LG: 'lg', SM: 'sm' },
  StyledLoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

jest.mock('react-apexcharts', () => ({
  __esModule: true,
  default: (props: { series: { name: string; data: number[][] }[]; type: string; options: CapturedOptions }) => {
    mockChartProps.series = props.series;
    mockChartProps.type = props.type;
    mockChartProps.options = props.options;
    return <div data-testid="margin-chart" />;
  },
}));

jest.mock('src/contexts/settings.context', () => ({
  useSettingsContext: () => ({ translate: (_scope: string, key: string) => key }),
}));

jest.mock('src/hooks/guard.hook', () => ({ useAdminGuard: () => mockUseAdminGuard() }));
jest.mock('src/hooks/layout-config.hook', () => ({ useLayoutOptions: (opts: unknown) => mockUseLayoutOptions(opts) }));
jest.mock('src/hooks/ledger.hook', () => ({ useLedger: () => ({ getMargin: mockGetMargin }) }));

import LedgerMarginScreen from 'src/screens/ledger-margin.screen';

const response: MarginResponseDto = {
  periods: [
    {
      date: '2026-05-01T00:00:00.000Z',
      feeIncome: 1234.567,
      executionCosts: 200,
      otherOpex: 50,
      realizedMargin: 984.567,
      fxPnl: -10,
    },
  ],
  totalFeeIncome: 1234.567,
  totalExecutionCosts: 200,
  totalOtherOpex: 50,
  totalRealizedMargin: 984.567,
};

describe('LedgerMarginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoggedIn = true;
    delete mockChartProps.series;
    delete mockChartProps.type;
    delete mockChartProps.options;
  });

  it('invokes the admin guard and registers the Realized Margin layout', () => {
    mockGetMargin.mockReturnValue(new Promise(() => undefined));
    render(<LedgerMarginScreen />);
    expect(mockUseAdminGuard).toHaveBeenCalledTimes(1);
    expect(mockUseLayoutOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Realized Margin', backButton: true }),
    );
  });

  it('shows the loading spinner while pending', () => {
    mockGetMargin.mockReturnValue(new Promise(() => undefined));
    render(<LedgerMarginScreen />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('defaults to the MONTH timeframe with daily sampling on first load', async () => {
    mockGetMargin.mockResolvedValue(response);
    render(<LedgerMarginScreen />);
    await screen.findByTestId('margin-chart');
    // MONTH => isDailySample true, and a non-undefined ISO `from`.
    const [from, to, dailySample] = mockGetMargin.mock.calls[0];
    expect(typeof from).toBe('string');
    expect(to).toBeUndefined();
    expect(dailySample).toBe(true);
  });

  it('does not fetch when the user is not logged in', () => {
    mockIsLoggedIn = false;
    mockGetMargin.mockReturnValue(new Promise(() => undefined));
    render(<LedgerMarginScreen />);
    expect(mockGetMargin).not.toHaveBeenCalled();
  });

  it('renders the four total summary cards', async () => {
    mockGetMargin.mockResolvedValue(response);
    render(<LedgerMarginScreen />);
    await screen.findByTestId('margin-chart');
    expect(screen.getByText('Total Fee Income')).toBeInTheDocument();
    expect(screen.getByText('Total Execution Costs')).toBeInTheDocument();
    expect(screen.getByText('Total Other Opex')).toBeInTheDocument();
    expect(screen.getByText('Total Realized Margin')).toBeInTheDocument();
    // 1234.567 -> de-CH 2-decimal rounding = 1'234.57 ('.' = wildcard group separator).
    expect(screen.getByText(/^1.234\.57$/)).toBeInTheDocument();
  });

  it('maps API periods into five named, 2-decimal-rounded chart series', async () => {
    mockGetMargin.mockResolvedValue(response);
    render(<LedgerMarginScreen />);
    await screen.findByTestId('margin-chart');

    expect(mockChartProps.type).toBe('area');
    const names = mockChartProps.series?.map((s) => s.name);
    expect(names).toEqual(['Fee Income', 'Execution Costs', 'Other Opex', 'Realized Margin', 'FX P&L']);

    const feeSeries = mockChartProps.series?.find((s) => s.name === 'Fee Income');
    // [timestamp, rounded value]; 1234.567 -> Math.round(*100)/100 = 1234.57.
    expect(feeSeries?.data[0][0]).toBe(new Date('2026-05-01T00:00:00.000Z').getTime());
    expect(feeSeries?.data[0][1]).toBe(1234.57);

    const fxSeries = mockChartProps.series?.find((s) => s.name === 'FX P&L');
    expect(fxSeries?.data[0][1]).toBe(-10);
  });

  it('formats the y-axis as k for >=1000 and plain integers below, and the tooltip as CHF', async () => {
    mockGetMargin.mockResolvedValue(response);
    render(<LedgerMarginScreen />);
    await screen.findByTestId('margin-chart');

    const yFormatter = mockChartProps.options?.yaxis?.labels?.formatter;
    expect(yFormatter).toBeDefined();
    // >= 1000 -> thousands abbreviation; below -> integer (no decimals).
    expect(yFormatter?.(15000)).toBe('15k');
    expect(yFormatter?.(-15000)).toBe('-15k'); // abs >= 1000 path also handles negatives
    expect(yFormatter?.(750)).toBe('750');

    const tooltipFormatter = mockChartProps.options?.tooltip?.y?.formatter;
    expect(tooltipFormatter).toBeDefined();
    // de-CH locale, max 2 fraction digits, suffixed with ' CHF'.
    expect(tooltipFormatter?.(1234.5)).toMatch(/^1.234.5 CHF$/);
  });

  it('refetches when a different timeframe button is selected', async () => {
    mockGetMargin.mockResolvedValue(response);
    render(<LedgerMarginScreen />);
    await screen.findByTestId('margin-chart');
    mockGetMargin.mockClear();

    // The ALL button maps to from === undefined (getFromDateByTimeframe(ALL) === 0).
    fireEvent.click(screen.getByText('All'));
    await waitFor(() => expect(mockGetMargin).toHaveBeenCalledTimes(1));
    const [from] = mockGetMargin.mock.calls[0];
    expect(from).toBeUndefined();
  });

  it('shows the error message when the request rejects', async () => {
    mockGetMargin.mockRejectedValue(new Error('fail'));
    render(<LedgerMarginScreen />);
    expect(await screen.findByText('Failed to load data')).toBeInTheDocument();
    expect(screen.queryByTestId('margin-chart')).not.toBeInTheDocument();
  });

  it('renders dash totals when the response has undefined totals', async () => {
    mockGetMargin.mockResolvedValue({
      periods: [],
      totalFeeIncome: undefined as unknown as number,
      totalExecutionCosts: undefined as unknown as number,
      totalOtherOpex: undefined as unknown as number,
      totalRealizedMargin: undefined as unknown as number,
    });
    render(<LedgerMarginScreen />);
    await screen.findByTestId('margin-chart');
    // formatChf2OrDash(undefined) => '-' for each of the four cards.
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(4);
  });
});
