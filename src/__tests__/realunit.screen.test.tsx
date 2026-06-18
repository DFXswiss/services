import { render, screen } from '@testing-library/react';
import { RealunitStats } from 'src/dto/realunit.dto';
import { realunitStatsFixture } from '../test-fixtures/realunit-stats.fixture';

const mockContext: {
  holders: unknown[];
  totalCount: number;
  tokenInfo: unknown;
  isLoading: boolean;
  priceHistory: unknown[];
  timeframe: string;
  quotes: unknown[];
  transactions: unknown[];
  quotesLoading: boolean;
  transactionsLoading: boolean;
  stats?: RealunitStats;
  fetchStats: jest.Mock;
  fetchHolders: jest.Mock;
  fetchPriceHistory: jest.Mock;
  fetchTokenInfo: jest.Mock;
  fetchQuotes: jest.Mock;
  fetchTransactions: jest.Mock;
} = {
  holders: [{ address: '0xabc', balance: '10', percentage: 1 }],
  totalCount: 1,
  tokenInfo: undefined,
  isLoading: false,
  priceHistory: [],
  timeframe: 'all',
  quotes: [],
  transactions: [],
  quotesLoading: false,
  transactionsLoading: false,
  stats: realunitStatsFixture,
  fetchStats: jest.fn(),
  fetchHolders: jest.fn(),
  fetchPriceHistory: jest.fn(),
  fetchTokenInfo: jest.fn(),
  fetchQuotes: jest.fn(),
  fetchTransactions: jest.fn(),
};

jest.mock('../contexts/realunit.context', () => ({
  useRealunitContext: () => mockContext,
}));

jest.mock('../contexts/settings.context', () => ({
  useSettingsContext: () => ({
    translate: (_scope: string, key: string) => key,
  }),
}));

jest.mock('../hooks/guard.hook', () => ({ useRealunitGuard: jest.fn() }));
jest.mock('../hooks/layout-config.hook', () => ({ useLayoutOptions: jest.fn() }));
jest.mock('../hooks/navigation.hook', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../hooks/clipboard.hook', () => ({ useClipboard: () => ({ copy: jest.fn() }) }));

jest.mock('../components/realunit/price-history-chart', () => ({
  PriceHistoryChart: () => <div data-testid="price-history-chart" />,
}));
jest.mock('../components/realunit/kpi-funnel-chart', () => ({
  KpiFunnelChart: () => <div data-testid="kpi-funnel-chart" />,
}));

jest.mock('@dfx.swiss/react-components', () => ({
  CopyButton: () => <button>copy</button>,
  IconColor: { GRAY: 'gray' },
  SpinnerSize: { SM: 'sm', MD: 'md', LG: 'lg' },
  StyledButton: ({ label }: { label: string }) => <button>{label}</button>,
  StyledButtonColor: { STURDY_WHITE: 'sturdy-white' },
  StyledButtonWidth: { FULL: 'full' },
  StyledLoadingSpinner: () => <div data-testid="spinner" />,
}));

// utils transitively imports @dfx.swiss/react (ESM); stub the helpers the screen uses
jest.mock('../util/utils', () => ({
  blankedAddress: (address: string) => address,
  formatChf: (value: number) => value.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
}));

import RealunitScreen from '../screens/realunit.screen';

describe('RealunitScreen - Key Figures section', () => {
  it('should render the Key Figures heading and the funnel chart', () => {
    render(<RealunitScreen />);

    expect(screen.getByText('Key Figures')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-funnel-chart')).toBeInTheDocument();
  });

  it('should render the summary card labels', () => {
    render(<RealunitScreen />);

    expect(screen.getByText('Completed registrations')).toBeInTheDocument();
    expect(screen.getByText('KYC conversion')).toBeInTheDocument();
  });

  it('should compute the KYC conversion rate (completed Ident / reached ContactData)', () => {
    render(<RealunitScreen />);

    // fixture: Ident completed.total = 500, ContactData reached.total = 1000 -> 50.0%
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('should show new accounts (30d) value from the fixture', () => {
    render(<RealunitScreen />);

    // fixture: growth.accounts.last30Days = 150
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should show a loading spinner while stats are undefined', () => {
    const original = mockContext.stats;
    mockContext.stats = undefined;
    try {
      render(<RealunitScreen />);
      expect(mockContext.fetchStats).toHaveBeenCalled();
      expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
    } finally {
      mockContext.stats = original;
    }
  });
});
